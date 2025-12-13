import { promises as fs } from "fs";
import http from "http";
import path from "path";
import crypto from "crypto";
import chokidar, { FSWatcher } from "chokidar";
import {
  DriftDetector,
  DriftSnapshot,
  PrioritizedDriftResult,
  UsageMetadata,
} from "./drift-detector.js";
import { UsageMetadataCollector } from "./usage-metadata.js";

export type ChangeTrigger =
  | "filesystem"
  | "post-commit"
  | "pull_request"
  | "branch_merge"
  | "manual";

export interface ChangeWatcherConfig {
  watchPaths?: string[];
  excludePatterns?: string[];
  debounceMs?: number;
  triggerOnCommit?: boolean;
  triggerOnPR?: boolean;
  webhookEndpoint?: string;
}

export interface ChangeWatcherOptions extends ChangeWatcherConfig {
  projectPath: string;
  docsPath: string;
  snapshotDir?: string;
  port?: number;
  webhookSecret?: string;
}

export interface ChangeEvent {
  type: ChangeTrigger;
  files?: string[];
  metadata?: Record<string, unknown>;
  source?: "fs" | "git" | "webhook" | "manual";
}

export interface ChangeWatcherResult {
  snapshotId?: string;
  driftResults: PrioritizedDriftResult[];
  changedSymbols: Array<{
    name: string;
    category: string;
    impact: string;
    filePath: string;
  }>;
  affectedDocs: string[];
  events: ChangeEvent[];
}

interface DriftDetectorLike {
  initialize(): Promise<void>;
  createSnapshot(projectPath: string, docsPath: string): Promise<DriftSnapshot>;
  loadLatestSnapshot(): Promise<DriftSnapshot | null>;
  getPrioritizedDriftResults(
    oldSnapshot: DriftSnapshot,
    newSnapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): Promise<PrioritizedDriftResult[]>;
}

interface ChangeWatcherDeps {
  createDetector?: (
    projectPath: string,
    snapshotDir?: string,
  ) => DriftDetectorLike;
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string) => void;
  };
}

/**
 * ChangeWatcher monitors code changes and triggers drift detection with debouncing.
 */
type NormalizedChangeWatcherOptions = ChangeWatcherOptions & {
  watchPaths: string[];
  excludePatterns: string[];
  debounceMs: number;
  triggerOnCommit: boolean;
  triggerOnPR: boolean;
};

export class ChangeWatcher {
  private watcher: FSWatcher | null = null;
  private server: http.Server | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly queuedEvents: ChangeEvent[] = [];
  private readonly options: NormalizedChangeWatcherOptions;
  private readonly deps: ChangeWatcherDeps;
  private detector: DriftDetectorLike | null = null;
  private usageCollector: UsageMetadataCollector;
  private latestSnapshot: DriftSnapshot | null = null;
  private isRunningDetection = false;
  private stopped = false;

  constructor(options: ChangeWatcherOptions, deps: ChangeWatcherDeps = {}) {
    const triggerOnCommit = options.triggerOnCommit ?? true;
    const triggerOnPR = options.triggerOnPR ?? true;
    const normalized: NormalizedChangeWatcherOptions = {
      ...options,
      triggerOnCommit,
      triggerOnPR,
      debounceMs: Math.max(50, options.debounceMs ?? 500),
      excludePatterns: options.excludePatterns ?? [
        "**/node_modules/**",
        "**/.git/**",
        "**/.documcp/**",
      ],
      watchPaths:
        options.watchPaths && options.watchPaths.length > 0
          ? options.watchPaths
          : [path.join(options.projectPath, "src")],
    };
    this.options = normalized;
    this.deps = deps;
    this.usageCollector = new UsageMetadataCollector();
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.ensureDetector();
    await this.ensureBaseline();
    this.startFsWatcher();
    await this.startWebhookServer();
    this.logInfo(
      `Change watcher started (debounce ${
        this.options.debounceMs
      }ms, paths: ${this.options.watchPaths.join(", ")})`,
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  getStatus(): {
    running: boolean;
    webhook?: { port: number; endpoint: string };
    watchPaths: string[];
    debounceMs: number;
    pendingEvents: number;
  } {
    return {
      running: !this.stopped,
      webhook: this.options.webhookEndpoint
        ? {
            port: this.options.port ?? 8787,
            endpoint: this.options.webhookEndpoint,
          }
        : undefined,
      watchPaths: this.options.watchPaths,
      debounceMs: this.options.debounceMs,
      pendingEvents: this.queuedEvents.length,
    };
  }

  async installGitHook(hook: "post-commit" = "post-commit"): Promise<string> {
    const gitDir = path.join(this.options.projectPath, ".git");
    const hookPath = path.join(gitDir, "hooks", hook);
    const endpoint =
      this.options.webhookEndpoint || "/hooks/documcp/change-watcher";
    const port = this.options.port ?? 8787;
    const script = `#!/bin/sh
# Auto-generated by documcp change watcher
if command -v curl >/dev/null 2>&1; then
  curl -s -X POST http://localhost:${port}${endpoint} \\
    -H "X-DocuMCP-Event=${hook}" \\
    -H "Content-Type: application/json" \\
    -d '{"event":"${hook}"}' >/dev/null 2>&1 || true
fi
`;
    await fs.mkdir(path.dirname(hookPath), { recursive: true });
    await fs.writeFile(hookPath, script, { mode: 0o755 });
    return hookPath;
  }

  async enqueueChange(event: ChangeEvent): Promise<void> {
    if (
      event.type === "post-commit" &&
      this.options.triggerOnCommit === false
    ) {
      return;
    }

    if (
      (event.type === "pull_request" || event.type === "branch_merge") &&
      this.options.triggerOnPR === false
    ) {
      return;
    }

    this.queuedEvents.push(event);
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      void this.runDetection();
    }, this.options.debounceMs);
  }

  async triggerManual(
    reason = "manual",
    files?: string[],
  ): Promise<ChangeWatcherResult> {
    await this.enqueueChange({
      type: "manual",
      files,
      metadata: { reason },
      source: "manual",
    });
    const result = await this.runDetection();
    if (result) {
      return result;
    }
    return this.buildResult([]);
  }

  private async ensureDetector(): Promise<void> {
    if (!this.detector) {
      const factory =
        this.deps.createDetector ??
        ((projectPath: string, snapshotDir?: string) =>
          new DriftDetector(projectPath, snapshotDir));
      this.detector = factory(
        this.options.projectPath,
        this.options.snapshotDir,
      );
      await this.detector.initialize();
    }
  }

  private async ensureBaseline(): Promise<void> {
    if (!this.detector) return;
    const latest = await this.detector.loadLatestSnapshot();
    if (latest) {
      this.latestSnapshot = latest;
      return;
    }
    this.latestSnapshot = await this.detector.createSnapshot(
      this.options.projectPath,
      this.options.docsPath,
    );
  }

  private startFsWatcher(): void {
    if (this.options.watchPaths.length === 0) return;
    const normalizedWatchPaths = this.options.watchPaths.map((p) =>
      path.isAbsolute(p) ? p : path.join(this.options.projectPath, p),
    );
    this.watcher = chokidar.watch(normalizedWatchPaths, {
      ignored: this.options.excludePatterns,
      persistent: true,
      ignoreInitial: true,
    });

    const onFsEvent = (filePath: string) => {
      void this.enqueueChange({
        type: "filesystem",
        files: [filePath],
        source: "fs",
      });
    };

    this.watcher.on("add", onFsEvent);
    this.watcher.on("change", onFsEvent);
    this.watcher.on("unlink", onFsEvent);
  }

  private async startWebhookServer(): Promise<void> {
    if (!this.options.webhookEndpoint) return;
    const endpoint = this.options.webhookEndpoint;
    const port = this.options.port ?? 8787;

    this.server = http.createServer(async (req, res) => {
      if (req.method !== "POST" || req.url !== endpoint) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const body = await this.readRequestBody(req);

      if (!this.verifySignature(req, body)) {
        res.statusCode = 401;
        res.end("Invalid signature");
        return;
      }

      const eventHeader =
        (req.headers["x-github-event"] as string) ||
        (req.headers["x-gitlab-event"] as string) ||
        (req.headers["x-documcp-event"] as string) ||
        "webhook";

      const parsedBody = this.safeParseJson(body);
      const changeEvent = this.mapWebhookToChangeEvent(eventHeader, parsedBody);
      await this.enqueueChange(changeEvent);

      res.statusCode = 200;
      res.end("OK");
    });

    await new Promise<void>((resolve) => this.server?.listen(port, resolve));
    this.logInfo(`Webhook server listening on port ${port}${endpoint}`);
  }

  private verifySignature(req: http.IncomingMessage, body: string): boolean {
    if (!this.options.webhookSecret) return true;
    const githubSig = req.headers["x-hub-signature-256"] as string | undefined;
    if (githubSig) {
      const expected = `sha256=${crypto
        .createHmac("sha256", this.options.webhookSecret)
        .update(body)
        .digest("hex")}`;
      const expectedBuf = Buffer.from(expected);
      const receivedBuf = Buffer.from(githubSig);
      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    }

    const gitlabToken = req.headers["x-gitlab-token"] as string | undefined;
    if (gitlabToken) {
      return gitlabToken === this.options.webhookSecret;
    }

    return false;
  }

  private mapWebhookToChangeEvent(
    event: string,
    payload: Record<string, unknown>,
  ): ChangeEvent {
    if (event === "push" || event === "post-commit") {
      return {
        type: "post-commit",
        files: this.extractFilesFromPayload(payload),
        metadata: { event },
        source: "git",
      };
    }

    if (event === "pull_request") {
      return {
        type: "pull_request",
        files: this.extractFilesFromPayload(payload),
        metadata: { event },
        source: "git",
      };
    }

    if (event === "merge_request" || event === "merge") {
      return {
        type: "branch_merge",
        files: this.extractFilesFromPayload(payload),
        metadata: { event },
        source: "git",
      };
    }

    return {
      type: "manual",
      metadata: { event },
      source: "webhook",
    };
  }

  private extractFilesFromPayload(payload: Record<string, unknown>): string[] {
    const files: string[] = [];
    const commits = (payload?.commits as any[]) || [];
    for (const commit of commits) {
      files.push(
        ...(commit.added ?? []),
        ...(commit.modified ?? []),
        ...(commit.removed ?? []),
      );
    }
    return Array.from(new Set(files));
  }

  private async runDetection(): Promise<ChangeWatcherResult | null> {
    if (this.isRunningDetection || !this.detector) return null;
    if (this.queuedEvents.length === 0) return null;

    this.isRunningDetection = true;
    const events = [...this.queuedEvents];
    this.queuedEvents.length = 0;

    try {
      if (!this.latestSnapshot) {
        await this.ensureBaseline();
      }
      if (!this.latestSnapshot) {
        this.logWarn("No baseline snapshot available for drift detection.");
        return null;
      }

      const currentSnapshot = await this.detector.createSnapshot(
        this.options.projectPath,
        this.options.docsPath,
      );
      // Use async collection with call graph analysis when available
      // Falls back to sync collection if analyzer not initialized
      const usageMetadata = await this.usageCollector
        .collect(currentSnapshot)
        .catch(() => this.usageCollector.collectSync(currentSnapshot));
      const driftResults = await this.detector.getPrioritizedDriftResults(
        this.latestSnapshot,
        currentSnapshot,
        usageMetadata,
      );
      this.latestSnapshot = currentSnapshot;

      const result = this.buildResultFromDrift(
        driftResults,
        events,
        currentSnapshot,
      );
      this.logInfo(
        `Drift detection completed: ${result.changedSymbols.length} symbols changed, ${result.affectedDocs.length} doc(s) affected.`,
      );
      return result;
    } catch (error: any) {
      this.logError(`Change watcher detection failed: ${error.message}`);
    } finally {
      this.isRunningDetection = false;
    }

    return null;
  }

  private buildResultFromDrift(
    driftResults: PrioritizedDriftResult[],
    events: ChangeEvent[],
    snapshot: DriftSnapshot,
  ): ChangeWatcherResult {
    const changedSymbols: ChangeWatcherResult["changedSymbols"] = [];
    const affectedDocs = new Set<string>();

    for (const result of driftResults) {
      for (const drift of result.drifts) {
        for (const diff of drift.codeChanges) {
          changedSymbols.push({
            name: diff.name,
            category: diff.category,
            impact: drift.severity,
            filePath: result.filePath,
          });
        }
        drift.affectedDocs.forEach((doc) => affectedDocs.add(doc));
      }
      result.impactAnalysis.affectedDocFiles.forEach((doc) =>
        affectedDocs.add(doc),
      );
    }

    return {
      snapshotId: snapshot.timestamp,
      driftResults,
      changedSymbols,
      affectedDocs: Array.from(affectedDocs),
      events,
    };
  }

  private async buildResult(
    events: ChangeEvent[],
  ): Promise<ChangeWatcherResult> {
    if (!this.latestSnapshot) {
      throw new Error("No snapshot available");
    }
    return this.buildResultFromDrift([], events, this.latestSnapshot);
  }

  private async readRequestBody(req: http.IncomingMessage): Promise<string> {
    return await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
    });
  }

  private safeParseJson(body: string): Record<string, unknown> {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  private logInfo(message: string): void {
    this.deps.logger?.info?.(message);
  }

  private logWarn(message: string): void {
    this.deps.logger?.warn?.(message);
  }

  private logError(message: string): void {
    this.deps.logger?.error?.(message);
  }
}

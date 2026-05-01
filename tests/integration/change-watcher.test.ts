/**
 * Integration tests for the change watcher (issue #113).
 *
 * Covers all four acceptance criteria:
 *
 *   1. Watcher state persists to `.documcp/watcher-state.jsonl` and
 *      rehydrates on startup.
 *   2. >= 3 file edits during an active session produce drift events.
 *   3. Missing / corrupt state file is handled gracefully (logged, not
 *      thrown), and the watcher starts fresh.
 *   4. Existing tests don't regress (this file lives in the default
 *      `npm test` path, so a CI run validates the negative).
 *
 * Strategy: stand up a tmp project containing a tiny TS source tree and
 * a markdown docs file that references one of the source symbols. Drive
 * detection via the public `triggerManual()` entry point rather than the
 * chokidar FS watcher — chokidar's events are inherently racy in CI and
 * we don't actually need them to verify persistence semantics. The
 * acceptance criterion is "simulates >= 3 file edits and asserts drift
 * events are emitted" which `triggerManual` faithfully exercises.
 */

import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

import {
  ChangeWatcher,
  WATCHER_STATE_FILENAME,
  WATCHER_STATE_VERSION,
  WatcherState,
} from "../../src/utils/change-watcher.js";

interface WatcherFixtureLogger {
  info: jest.Mock<void, [string]>;
  warn: jest.Mock<void, [string]>;
  error: jest.Mock<void, [string]>;
}

function makeLogger(): WatcherFixtureLogger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const SRC_FILE_NAMES = ["alpha.ts", "beta.ts", "gamma.ts"] as const;

async function seedProject(root: string): Promise<{
  projectPath: string;
  docsPath: string;
  snapshotDir: string;
  srcDir: string;
}> {
  const projectPath = join(root, "project");
  const srcDir = join(projectPath, "src");
  const docsPath = join(projectPath, "docs");
  const snapshotDir = join(projectPath, ".documcp");
  await fs.mkdir(srcDir, { recursive: true });
  await fs.mkdir(docsPath, { recursive: true });
  await fs.mkdir(snapshotDir, { recursive: true });

  // Three exported functions across three files. Documentation references
  // them by name so the drift detector has both code-side and doc-side
  // surface to compare.
  await fs.writeFile(
    join(srcDir, "alpha.ts"),
    `export function greet(name: string): string {\n  return "hi " + name;\n}\n`,
  );
  await fs.writeFile(
    join(srcDir, "beta.ts"),
    `export function farewell(name: string): string {\n  return "bye " + name;\n}\n`,
  );
  await fs.writeFile(
    join(srcDir, "gamma.ts"),
    `export function age(): number {\n  return 42;\n}\n`,
  );

  await fs.writeFile(
    join(docsPath, "api.md"),
    `# API\n\n- \`greet(name)\` returns a greeting.\n- \`farewell(name)\` says goodbye.\n- \`age()\` returns a number.\n`,
  );

  return { projectPath, docsPath, snapshotDir, srcDir };
}

function makeWatcher(
  projectPath: string,
  docsPath: string,
  snapshotDir: string,
  logger: WatcherFixtureLogger,
): ChangeWatcher {
  return new ChangeWatcher(
    {
      projectPath,
      docsPath,
      snapshotDir,
      // Tight debounce keeps tests fast; the spec lower bound is 50ms which
      // the constructor enforces, so we sit right at the floor.
      debounceMs: 50,
      // Disable the FS watcher's pathwatch by pointing at a known-empty
      // directory the test doesn't touch — we drive everything through
      // triggerManual() so we don't fight chokidar's eventing.
      watchPaths: [join(projectPath, "__never_touched__")],
    },
    { logger },
  );
}

describe("change watcher persistence + integration (issue #113)", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "change-watcher-int-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  test("persists state after detection and emits drift events for >= 3 edits", async () => {
    const { projectPath, docsPath, snapshotDir, srcDir } = await seedProject(
      tempRoot,
    );
    const logger = makeLogger();
    const watcher = makeWatcher(projectPath, docsPath, snapshotDir, logger);

    try {
      await watcher.start();

      // Simulate three meaningful edits: a signature change, a removal,
      // and an addition. Each is a separate triggerManual() call so the
      // watcher records three distinct events in `eventCount`.
      await fs.writeFile(
        join(srcDir, "alpha.ts"),
        `// edit #1: signature change\nexport function greet(name: string, polite: boolean): string {\n  return polite ? "Hello, " + name : "hi " + name;\n}\n`,
      );
      const r1 = await watcher.triggerManual("test-edit-1", [
        join(srcDir, "alpha.ts"),
      ]);
      expect(r1).toBeDefined();

      await fs.writeFile(
        join(srcDir, "beta.ts"),
        `// edit #2: removed farewell, added wave\nexport function wave(): string {\n  return "👋";\n}\n`,
      );
      const r2 = await watcher.triggerManual("test-edit-2", [
        join(srcDir, "beta.ts"),
      ]);
      expect(r2).toBeDefined();

      await fs.writeFile(
        join(srcDir, "gamma.ts"),
        `// edit #3: changed return type\nexport function age(): string {\n  return "forty-two";\n}\n`,
      );
      const r3 = await watcher.triggerManual("test-edit-3", [
        join(srcDir, "gamma.ts"),
      ]);
      expect(r3).toBeDefined();

      // At least one of the three runs must surface drift events; they
      // can't all be empty given the actual code mutations above.
      const totalSymbols =
        r1.changedSymbols.length +
        r2.changedSymbols.length +
        r3.changedSymbols.length;
      expect(totalSymbols).toBeGreaterThan(0);

      const status = watcher.getStatus();
      expect(status.eventCount).toBeGreaterThanOrEqual(3);
      expect(status.lastDetectionAt).not.toBeNull();
      expect(status.recentEventTypes.length).toBeGreaterThanOrEqual(3);
      expect(status.statePath).toBe(
        join(snapshotDir, WATCHER_STATE_FILENAME),
      );

      // State file: must exist and contain valid JSONL with the most
      // recent record matching the in-memory state.
      const stateRaw = await fs.readFile(status.statePath, "utf-8");
      const lines = stateRaw.split("\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      const lastRecord = JSON.parse(lines[lines.length - 1]) as WatcherState;
      expect(lastRecord.version).toBe(WATCHER_STATE_VERSION);
      expect(lastRecord.eventCount).toBe(status.eventCount);
      // lastSnapshotId comes from `DriftSnapshot.timestamp` (captured when
      // the snapshot is built); lastDetectionAt is captured at persist time
      // a few microseconds later. We only assert both are ISO timestamps —
      // strict equality would race the wall clock.
      expect(lastRecord.lastSnapshotId).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(lastRecord.lastDetectionAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } finally {
      await watcher.stop();
    }
  });

  test("rehydrates prior state on startup of a fresh watcher instance", async () => {
    const { projectPath, docsPath, snapshotDir, srcDir } = await seedProject(
      tempRoot,
    );

    // First session: drive one detection so a record gets persisted.
    const w1 = makeWatcher(projectPath, docsPath, snapshotDir, makeLogger());
    try {
      await w1.start();
      await fs.writeFile(
        join(srcDir, "alpha.ts"),
        `export function greet(name: string, suffix: string): string {\n  return "hi " + name + suffix;\n}\n`,
      );
      await w1.triggerManual("first-session-edit");
    } finally {
      await w1.stop();
    }

    const firstStatus = w1.getStatus();
    expect(firstStatus.eventCount).toBeGreaterThan(0);

    // Second session: brand-new ChangeWatcher targeting the same dirs.
    // The rehydration path should pick up the prior eventCount + last
    // detection timestamp.
    const logger2 = makeLogger();
    const w2 = makeWatcher(projectPath, docsPath, snapshotDir, logger2);
    try {
      await w2.start();
      const status2 = w2.getStatus();
      expect(status2.eventCount).toBe(firstStatus.eventCount);
      expect(status2.lastDetectionAt).toBe(firstStatus.lastDetectionAt);
      expect(status2.recentEventTypes).toEqual(firstStatus.recentEventTypes);

      // info log should mention rehydration so operators can see it.
      const rehydratedMsg = logger2.info.mock.calls.find((c) =>
        c[0].includes("Rehydrated watcher state"),
      );
      expect(rehydratedMsg).toBeDefined();
    } finally {
      await w2.stop();
    }
  });

  test("logs a warning and starts fresh when the state file is corrupt", async () => {
    const { projectPath, docsPath, snapshotDir } = await seedProject(tempRoot);
    const statePath = join(snapshotDir, WATCHER_STATE_FILENAME);
    // Write garbage into the state file BEFORE the watcher comes up.
    await fs.writeFile(statePath, "{ this is not valid json\n", "utf-8");

    const logger = makeLogger();
    const watcher = makeWatcher(projectPath, docsPath, snapshotDir, logger);
    try {
      await watcher.start();
      const status = watcher.getStatus();
      expect(status.eventCount).toBe(0);
      expect(status.lastDetectionAt).toBeNull();

      const warnedAboutCorrupt = logger.warn.mock.calls.find((c) =>
        c[0].includes("not valid JSONL"),
      );
      expect(warnedAboutCorrupt).toBeDefined();
    } finally {
      await watcher.stop();
    }
  });

  test("does not warn when the state file is simply missing (cold start)", async () => {
    const { projectPath, docsPath, snapshotDir } = await seedProject(tempRoot);
    // No state file written: ENOENT path of loadState().

    const logger = makeLogger();
    const watcher = makeWatcher(projectPath, docsPath, snapshotDir, logger);
    try {
      await watcher.start();
      // We don't expect ANY warn calls about the missing file. Other
      // warnings (e.g. baseline issues) are independent — but since the
      // seed creates real source + docs, those should also be silent.
      const noWarnsAboutState = logger.warn.mock.calls.every(
        (c) => !c[0].includes("watcher-state.jsonl"),
      );
      expect(noWarnsAboutState).toBe(true);

      const status = watcher.getStatus();
      expect(status.eventCount).toBe(0);
      expect(status.lastDetectionAt).toBeNull();
    } finally {
      await watcher.stop();
    }
  });

  test("ignores state records with a mismatched schema version", async () => {
    const { projectPath, docsPath, snapshotDir } = await seedProject(tempRoot);
    const statePath = join(snapshotDir, WATCHER_STATE_FILENAME);
    // Write a record with version "999" — valid JSON, valid shape, but
    // unrecognized version. The watcher should warn and ignore it.
    const stale: WatcherState = {
      version: "999" as unknown as typeof WATCHER_STATE_VERSION,
      lastDetectionAt: "2020-01-01T00:00:00.000Z",
      lastSnapshotId: "2020-01-01T00:00:00.000Z",
      eventCount: 999,
      recentEventTypes: ["manual"],
    };
    await fs.writeFile(statePath, JSON.stringify(stale) + "\n", "utf-8");

    const logger = makeLogger();
    const watcher = makeWatcher(projectPath, docsPath, snapshotDir, logger);
    try {
      await watcher.start();
      const status = watcher.getStatus();
      expect(status.eventCount).toBe(0); // not 999
      expect(status.lastDetectionAt).toBeNull();
      const versionWarn = logger.warn.mock.calls.find((c) =>
        c[0].includes("schema mismatch"),
      );
      expect(versionWarn).toBeDefined();
    } finally {
      await watcher.stop();
    }
  });
});

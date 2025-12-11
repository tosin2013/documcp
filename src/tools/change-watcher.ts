import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ChangeWatcher } from "../utils/change-watcher.js";
import { formatMCPResponse, MCPContentWrapper } from "../types/api.js";

export const changeWatcherSchema = z.object({
  action: z
    .enum(["start", "status", "stop", "trigger", "install_hook"])
    .default("status")
    .describe("Action to perform"),
  projectPath: z.string().describe("Project root path"),
  docsPath: z.string().describe("Documentation path"),
  watchPaths: z
    .array(z.string())
    .optional()
    .describe("Paths to watch (defaults to src/)"),
  excludePatterns: z
    .array(z.string())
    .optional()
    .describe("Glob patterns to exclude"),
  debounceMs: z
    .number()
    .min(50)
    .max(600000)
    .default(500)
    .describe("Debounce window for drift detection"),
  triggerOnCommit: z
    .boolean()
    .default(true)
    .describe("Respond to git commit events"),
  triggerOnPR: z.boolean().default(true).describe("Respond to PR/merge events"),
  webhookEndpoint: z
    .string()
    .optional()
    .describe("Webhook endpoint path (e.g., /hooks/documcp/change-watcher)"),
  webhookSecret: z
    .string()
    .optional()
    .describe("Shared secret for webhook signature validation"),
  port: z
    .number()
    .min(1)
    .max(65535)
    .optional()
    .describe("Port for webhook server (default 8787)"),
  snapshotDir: z.string().optional().describe("Snapshot directory override"),
  reason: z.string().optional().describe("Reason for manual trigger"),
  files: z
    .array(z.string())
    .optional()
    .describe("Changed files (for manual trigger)"),
});

type ChangeWatcherArgs = z.infer<typeof changeWatcherSchema>;

let watcher: ChangeWatcher | null = null;

// Exported for tests
export function __resetChangeWatcher(): void {
  watcher = null;
}

function makeResponse<T>(data: T): ReturnType<typeof formatMCPResponse<T>> {
  return formatMCPResponse(
    {
      success: true,
      data,
      metadata: {
        toolVersion: "0.0.0",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    },
    { fullResponse: true },
  );
}

export async function handleChangeWatcher(
  args: unknown,
  context?: any,
): Promise<MCPContentWrapper> {
  const parsed = changeWatcherSchema.parse(args);

  switch (parsed.action) {
    case "start":
      return await startWatcher(parsed, context);
    case "status":
      return makeResponse(watcher ? watcher.getStatus() : { running: false });
    case "stop":
      if (watcher) {
        await watcher.stop();
        watcher = null;
      }
      return makeResponse({ running: false });
    case "trigger":
      if (!watcher) {
        await startWatcher(parsed, context);
      }
      if (!watcher) {
        throw new Error("Change watcher not available");
      }
      return makeResponse(
        await watcher.triggerManual(parsed.reason, parsed.files),
      );
    case "install_hook":
      if (!watcher) {
        await startWatcher(parsed, context);
      }
      if (!watcher) {
        throw new Error("Change watcher not available");
      }
      return makeResponse({
        hook: await watcher.installGitHook("post-commit"),
      });
  }
}

async function startWatcher(
  options: ChangeWatcherArgs,
  context?: any,
): Promise<MCPContentWrapper> {
  if (!watcher) {
    watcher = new ChangeWatcher(
      {
        projectPath: options.projectPath,
        docsPath: options.docsPath,
        watchPaths: options.watchPaths,
        excludePatterns: options.excludePatterns,
        debounceMs: options.debounceMs,
        triggerOnCommit: options.triggerOnCommit,
        triggerOnPR: options.triggerOnPR,
        webhookEndpoint: options.webhookEndpoint,
        webhookSecret: options.webhookSecret,
        port: options.port,
        snapshotDir: options.snapshotDir,
      },
      {
        logger: {
          info: context?.info,
          warn: context?.warn,
          error: context?.error,
        },
      },
    );
    await watcher.start();
  }

  return makeResponse(watcher.getStatus());
}

export const changeWatcherTool: Tool = {
  name: "change_watcher",
  description:
    "Watch code changes and trigger documentation drift detection in near real-time.",
  inputSchema: zodToJsonSchema(changeWatcherSchema) as any,
};

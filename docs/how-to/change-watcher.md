---
title: Real-time change watcher
description: Monitor code changes and trigger documentation drift detection automatically.
---

The `change_watcher` MCP tool keeps documentation drift checks up to date by reacting to file changes, git hooks, or webhooks.

## Quick start

1. Start watching:
   - Tool: `change_watcher`
   - Input:
     - `action`: `"start"`
     - `projectPath`: absolute path to your repo
     - `docsPath`: absolute path to your docs
     - Optional: `watchPaths` (defaults to `src`), `debounceMs` (default `500`), `excludePatterns`.
2. Manual trigger:
   - `action`: `"trigger"`
   - Optional: `reason`, `files` (array of changed files).
3. Status/stop:
   - `action`: `"status"` or `"stop"`.

## Git hook integration

For local workflows:

- Call `change_watcher` with `action: "install_hook"` to drop a `post-commit` hook that pings the watcher on commit.

## Webhook integration

For CI/CD events:

- Start the watcher with `webhookEndpoint` (e.g., `/hooks/documcp/change-watcher`), optional `port` (default `8787`), and optional `webhookSecret`.
- Send POST payloads with GitHub/GitLab events; supported triggers: push/post-commit, pull_request, merge/merge_request, manual.

## Configuration reference

```json
{
  "watchPaths": ["src"],
  "excludePatterns": ["**/node_modules/**", "**/.git/**", "**/.documcp/**"],
  "debounceMs": 500,
  "triggerOnCommit": true,
  "triggerOnPR": true,
  "webhookEndpoint": "/hooks/documcp/change-watcher",
  "webhookSecret": "optional-shared-secret"
}
```

## Outputs

Each detection run reports:

- `snapshotId`: latest snapshot timestamp
- `driftResults`: prioritized drift results from the detector
- `changedSymbols`: symbol/category/impact summary
- `affectedDocs`: list of impacted documentation files
- `events`: the triggers that fired this run

---
id: adding-deploy-targets
title: Adding a New Deployment Target
sidebar_label: Adding Deploy Targets
sidebar_position: 1
---

# Adding a New Deployment Target

This guide explains how to add a new deployment platform (e.g. Netlify, Cloudflare Pages, Fly.io, Render) to DocuMCP without needing to read the rest of the codebase first.

## Overview

DocuMCP uses a `DeployTargetAdapter` pattern (see [ADR-018](../adrs/adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md)) to support multiple deployment platforms through a single interface. Each adapter is a self-contained TypeScript class that:

1. Generates deployment configuration files (never writes them to disk directly)
2. Optionally returns a CLI command the user can run
3. Performs a lightweight liveness check on the deployed URL

**One target per project run.** Users choose a single deployment target when calling `deploy_site`. If they switch targets later, DocuMCP warns them to remove the old workflow file. Your adapter gets the same treatment automatically once it is registered.

---

## Interface contract

Your adapter must implement `DeployTargetAdapter` from [`src/deploy-targets/types.ts`](../../src/deploy-targets/types.ts):

```typescript
export interface DeployTargetAdapter {
  metadata: TargetMetadata;

  /**
   * Returns one or more files to be written to the repository.
   * DO NOT perform file I/O here — return GeneratedFile[] only.
   * The deploy_site tool writes the files.
   */
  generateDeploymentArtifact(ssg: string, opts: DeployOptions): GeneratedFile[];

  /**
   * Returns a CLI command the user can run to deploy manually,
   * or null if not applicable.
   */
  optionalCliCommand(opts: DeployOptions): string | null;

  /**
   * Performs a lightweight liveness check against the deployed URL.
   */
  verify(deployedUrl: string): Promise<VerificationResult>;
}
```

Full type definitions: [`src/deploy-targets/types.ts`](../../src/deploy-targets/types.ts).

---

## Step-by-step implementation

### Step 1 — Create the adapter file

```
src/deploy-targets/<slug>/index.ts
```

Use [`src/deploy-targets/vercel/index.ts`](../../src/deploy-targets/vercel/index.ts) as the reference implementation — it is complete and tested.

The `slug` is the machine-readable identifier users pass to `deploy_site` as `target=<slug>`. Use lowercase with hyphens: `netlify`, `cloudflare-pages`, `fly-io`, `render`.

### Step 2 — Generate these three files from `generateDeploymentArtifact()`

| File                    | Convention                                        |
| ----------------------- | ------------------------------------------------- |
| Platform config         | `netlify.toml`, `wrangler.toml`, `fly.toml`, etc. |
| GitHub Actions workflow | `.github/workflows/deploy-<slug>.yml`             |
| Setup checklist         | `<SLUG>_SETUP.md` (e.g. `NETLIFY_SETUP.md`)       |

**Always use `deploy-<slug>.yml`** for the workflow filename. Never reuse a generic name like `deploy-docs.yml` — it will conflict with other adapters.

The setup checklist (`<SLUG>_SETUP.md`) should include:

1. How to install the platform's CLI
2. How to link/initialize the project
3. Which GitHub Actions secrets are required and where to get them
4. Which files to commit
5. How to verify the deployment
6. A link to the corresponding how-to doc in `docs/how-to/`

### Step 3 — Register the adapter

In [`src/deploy-targets/index.ts`](../../src/deploy-targets/index.ts):

```typescript
import { MyPlatformAdapter } from "./my-platform/index.js";

const registry = new Map<string, DeployTargetAdapter>([
  ["github-pages", new GitHubPagesAdapter()],
  ["vercel", new VercelAdapter()],
  ["my-platform", new MyPlatformAdapter()], // add this line
]);
```

### Step 4 — Add the slug to the conflict check map

In [`src/tools/deploy-pages.ts`](../../src/tools/deploy-pages.ts), find `TARGET_WORKFLOWS` and add your entry:

```typescript
const TARGET_WORKFLOWS: Record<string, string> = {
  "github-pages": ".github/workflows/deploy-github-pages.yml",
  vercel: ".github/workflows/deploy-vercel.yml",
  "my-platform": ".github/workflows/deploy-my-platform.yml", // add this
};
```

This lets DocuMCP warn users when they switch from one target to another.

### Step 5 — Write tests

Create `tests/deploy-targets/<slug>.test.ts`. Use [`tests/deploy-targets/vercel.test.ts`](../../tests/deploy-targets/vercel.test.ts) as the template.

Minimum test coverage:

- `metadata.slug` is correct
- `generateDeploymentArtifact()` returns all three expected files
- Platform config content is correct for each supported SSG
- Workflow file references the required secrets
- `<SLUG>_SETUP.md` contains `vercel link`-equivalent instructions and all secret names
- `optionalCliCommand()` returns `null` when not requested, and the correct command when requested

### Step 6 — Add a how-to doc

Create `docs/how-to/deploy-to-<slug>.md`. Use [`docs/how-to/deploy-to-vercel.md`](../how-to/deploy-to-vercel.md) as the template.

Add it to `docs/sidebars.js` under the **How-To Guides** category.

### Step 7 — Open a PR

Open a pull request against `main` and link it to the relevant GitHub issue.

---

## Required secrets reference

Known platforms and their secrets:

| Platform         | Secret names                                    |
| ---------------- | ----------------------------------------------- |
| Netlify          | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`         |
| Cloudflare Pages | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Fly.io           | `FLY_API_TOKEN`                                 |
| Render           | `RENDER_API_KEY`, `RENDER_SERVICE_ID`           |
| Railway          | `RAILWAY_TOKEN`                                 |

For an unlisted platform: document which secrets are needed in `<SLUG>_SETUP.md` with links to where users can obtain each value.

---

## Platforms we would welcome

The following are open community issues. Pick one and follow the steps above:

| Platform         | Issue                                                   |
| ---------------- | ------------------------------------------------------- |
| Netlify          | [#128](https://github.com/tosin2013/documcp/issues/128) |
| Cloudflare Pages | [#129](https://github.com/tosin2013/documcp/issues/129) |

Platforms not yet tracked — open a new issue first, then implement:

- Fly.io
- Render
- Railway

---

## Reference implementation

[`src/deploy-targets/vercel/index.ts`](../../src/deploy-targets/vercel/index.ts) — complete, merged, all tests passing. Start here.

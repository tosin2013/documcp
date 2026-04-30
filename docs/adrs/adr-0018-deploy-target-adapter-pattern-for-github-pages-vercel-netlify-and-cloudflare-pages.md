---
id: adr-18-deploy-target-adapter-pattern
title: "ADR-018: Deploy Target Adapter Pattern for GitHub Pages, Vercel, Netlify, and Cloudflare Pages"
sidebar_label: "ADR-018: Deploy Target Adapter"
sidebar_position: 18
documcp:
  last_updated: "2026-04-30T00:00:00.000Z"
  last_validated: "2026-04-30T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: TBD
status: accepted
date: "2026-04-30"
---

# ADR-018: Deploy Target Adapter Pattern for GitHub Pages, Vercel, Netlify, and Cloudflare Pages

## Status

Accepted (proposed 2026-04-30; revisits the rejected "Third-Party Deployment Services" alternative in [ADR-005](./adr-0005-github-pages-deployment-automation.md))

## Date

2026-04-30

## Context

[ADR-005](./adr-0005-github-pages-deployment-automation.md) (2025-01-14) explicitly rejected Netlify, Vercel, and other third-party deployment services as deployment targets when DocuMCP was scoped to GitHub Pages only. The current `deploy_pages` tool, the workflow generators, and the verification logic are all hard-coded to that single target.

Two things have changed since:

1. [ADR-016](./adr-0016-ssg-adapter-plugin-pattern-for-recommendation-configuration-and-deployment.md) introduces the SSG Adapter Plugin Pattern, which makes pluggable adapters a first-class architectural primitive.
2. `src/tools/populate-content.ts` line 1498 already documents Vercel and Netlify CLIs in its end-user-facing generated documentation, an implicit signal that users expect documcp to support those platforms.

The combination makes this the right moment to symmetrize: just as SSGs become pluggable, deploy targets should too. User feedback also flagged Vercel as a frequently-requested target.

## Decision

Define a `DeployTargetAdapter` interface in `src/deploy-targets/types.ts` mirroring the `SSGAdapter` shape from ADR-016:

```ts
export interface DeployTargetAdapter {
  metadata: TargetMetadata;
  generateDeploymentArtifact(ssg: string, opts: DeployOptions): GeneratedFile[];
  optionalCliCommand(opts: DeployOptions): string | null;
  verify(deployedUrl: string): Promise<VerificationResult>;
}
```

1. **`metadata: TargetMetadata`** — human-readable name, slug, supported SSGs, and capability flags.
2. **`generateDeploymentArtifact(ssg, opts) -> GeneratedFile[]`** — emits one or more files appropriate to the target (e.g., `vercel.json`, `netlify.toml`, `wrangler.toml`, `.github/workflows/deploy.yml`).
3. **`optionalCliCommand(opts) -> string | null`** — returns a platform CLI command (e.g., `vercel deploy --prod`, `netlify deploy --prod`) the user can opt into running.
4. **`verify(deployedUrl) -> VerificationResult`** — reuses the existing URL+200 check from `deploy_pages`.

Concrete adapters live in `src/deploy-targets/<target>/` (`github-pages`, `vercel`, `netlify`, `cloudflare-pages`).

**Adopt MEDIUM DEPTH**: documcp generates the config and can optionally invoke the platform CLI when the user opts in via a tool param, but does **NOT** call platform REST APIs. No API tokens, no new env-var burden in the same release that just removed `DOCUMCP_LLM_*` env vars per [ADR-014](./adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md).

**Rollout sequence**:

- **Vercel** ships as the first non-GitHub-Pages adapter (issue D1, `priority/high`).
- **Netlify** (D2) and **Cloudflare Pages** (D3) are filed as `help wanted` for the community.
- The `deploy_pages` tool is renamed to `deploy_site` with a `target` parameter; a back-compat shim keeps `deploy_pages` working through one minor version (issue D4, `breaking-change`).

## Alternatives Considered

### Keep `deploy_pages` GitHub Pages-only; reject the symmetry argument

- **Pros**: No additional surface to maintain.
- **Cons**: User demand for Vercel is concrete; ADR-005's rejection was scope-driven, not technical; ADR-016's adapter pattern makes the symmetric extension trivial.
- **Decision**: Rejected.

### Implement deep-depth adapters that call platform REST APIs directly

- **Pros**: Fully unattended deploys; richer verification.
- **Cons**: Re-introduces the env-var/API-token burden that ADR-014 just removed; pushes documcp into a "deploy orchestrator" role beyond its current scope.
- **Decision**: Rejected for v0.6.0 / v1.0.0; reconsider if the medium-depth UX proves insufficient.

### Implement shallow-depth adapters that only emit config files; never invoke any CLI

- **Pros**: Minimum scope; zero runtime dependencies.
- **Cons**: Leaves the user farther from a successful deployment than the existing `deploy_pages` experience, which already runs a workflow.
- **Decision**: Rejected.

### Use a single `GenericPlatformAdapter` that takes platform-specific config blobs

- **Pros**: One implementation file.
- **Cons**: Pushes complexity to the user; forfeits the contributor-friendly extension benefit (which is half the point of ADR-016 / ADR-018).
- **Decision**: Rejected.

## Consequences

### Positive

- Deploy targets become a contributor-friendly extension point symmetric with ADR-016.
- Users can choose Vercel, Netlify, or Cloudflare Pages without leaving documcp.
- Revisits ADR-005's scope-driven rejection honestly rather than pretending it never happened.
- The medium-depth approach avoids re-introducing the env-var sprawl that ADR-014 just cleaned up.
- Reuses the existing verification infrastructure with no extra cost.

### Negative

- `deploy_pages` tool name change is a breaking change in the public MCP surface (mitigated by D4's back-compat shim).
- CLI invocation paths must be tested per platform but can be skipped when the platform CLI is not installed.
- Medium depth means documcp cannot do fully unattended deploys to Vercel/Netlify/Cloudflare Pages — the user must run the CLI command, which is intentional.

### Risks and Mitigations

- **Risk**: The `deploy_pages -> deploy_site` rename breaks hosts that hard-coded the tool name.
  **Mitigation**: Back-compat shim keeps `deploy_pages` working for one minor version with a deprecation log on first use.
- **Risk**: Platform CLIs may not be installed on the user's machine.
  **Mitigation**: Clear error messages and a "config-only" mode that emits files without invoking any CLI.
- **Risk**: Medium depth disappoints users who want one-click deploys.
  **Mitigation**: Document the rationale (no new env-var/API-token surface); leave the door open to a deeper integration in a later ADR if demand justifies it.

## Implementation Tracking

The following GitHub issues will be filed alongside this ADR (all in milestone `v1.0.0 — Ecosystem`):

- **D1** Define `DeployTargetAdapter` interface and ship Vercel as the first adapter (`priority/high`, `help wanted`).
- **D2** Netlify deploy target adapter (`community`, `help wanted`).
- **D3** Cloudflare Pages deploy target adapter (`community`, `help wanted`).
- **D4** Rename `deploy_pages` to `deploy_site` with a back-compat shim (`refactor`, `breaking-change`).

## Evidence

- [ADR-005](./adr-0005-github-pages-deployment-automation.md), Alternatives Considered: _"Third-Party Deployment Services (Netlify, Vercel) — Decision: Rejected"_. The rejection cited scope, not technical inadequacy.
- `src/tools/populate-content.ts` line 1498: documcp already documents `vercel --prod` and `netlify deploy --prod` as deployment options for end-users.
- [ADR-014](./adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md): removed `DOCUMCP_LLM_*` env vars; the medium-depth choice in this ADR honors that direction by deliberately not re-introducing API-token env vars.
- [ADR-016](./adr-0016-ssg-adapter-plugin-pattern-for-recommendation-configuration-and-deployment.md): SSG Adapter Plugin Pattern — establishes the structural and design pattern that this ADR mirrors for deploy targets.
- [Vercel CLI documentation](https://vercel.com/docs/cli/deploy), [Netlify CLI](https://docs.netlify.com/cli/get-started/), [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/): all three follow the same "install CLI, run deploy" pattern that the medium-depth approach assumes.

## Related Decisions

- [ADR-005: GitHub Pages Deployment Automation](./adr-0005-github-pages-deployment-automation.md) (alternatives revisited)
- [ADR-014: Removal of Server-Side LLM Dependency](./adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md)
- [ADR-016: SSG Adapter Plugin Pattern](./adr-0016-ssg-adapter-plugin-pattern-for-recommendation-configuration-and-deployment.md) (sibling pattern)

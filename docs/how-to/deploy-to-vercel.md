---
id: deploy-to-vercel
title: Deploy Documentation to Vercel
sidebar_label: Deploy to Vercel
sidebar_position: 10
documcp:
  last_updated: "2026-05-06T00:00:00.000Z"
  last_validated: "2026-05-06T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
---

# Deploy Documentation to Vercel

This guide walks you through deploying your documentation site to [Vercel](https://vercel.com) using DocuMCP's `deploy_site` tool.

## When to use this guide

Use this guide when you want to:

- Deploy a Docusaurus, Hugo, Jekyll, MkDocs, or Eleventy site to Vercel
- Get preview deployments on every pull request
- Take advantage of Vercel's global edge network

If you need GitHub Pages deployment instead, see the standard `deploy_site` usage with `target=github-pages`.

## Prerequisites

- A GitHub repository containing your documentation
- A [Vercel account](https://vercel.com/signup) (free tier works)
- Vercel CLI installed locally: `npm install -g vercel`

## Step 1: Link your repository to a Vercel project

Run the following in the root of your repository (or the docs subdirectory if your site lives there):

```bash
vercel link
```

Follow the prompts to create a new project or link to an existing one. This creates a `.vercel/project.json` file that stores your project ID and org ID.

## Step 2: Get your Vercel credentials

You need three values from Vercel to configure GitHub Actions:

| Secret              | Where to find it                                                              |
| ------------------- | ----------------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID`     | `.vercel/project.json` → `orgId` field                                        |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId` field                                    |

Add all three as [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) in your repository settings under **Settings → Secrets and variables → Actions**.

## Step 3: Generate the Vercel deployment configuration

Use the DocuMCP `deploy_site` tool with `target=vercel`:

```json
{
  "tool": "deploy_site",
  "arguments": {
    "repository": "/path/to/your/project",
    "ssg": "docusaurus",
    "target": "vercel"
  }
}
```

This generates three files:

- **`vercel.json`** — build configuration for Vercel
- **`.github/workflows/deploy-vercel.yml`** — GitHub Actions workflow using `vercel deploy`
- **`VERCEL_SETUP.md`** — inline setup checklist committed to your repository

### Generated `vercel.json` example (Docusaurus)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "installCommand": "npm install",
  "framework": "docusaurus2"
}
```

### Supported SSGs and their output directories

| SSG        | Output directory |
| ---------- | ---------------- |
| Docusaurus | `build`          |
| Hugo       | `public`         |
| Jekyll     | `_site`          |
| MkDocs     | `site`           |
| Eleventy   | `_site`          |

## Step 4: Configure a custom domain (optional)

Pass `customDomain` to the tool to include it in `vercel.json`:

```json
{
  "tool": "deploy_site",
  "arguments": {
    "repository": "/path/to/your/project",
    "ssg": "docusaurus",
    "target": "vercel",
    "customDomain": "docs.yourproject.com"
  }
}
```

Then add the domain in your Vercel project's **Settings → Domains** and configure a CNAME record pointing to `cname.vercel-dns.com` in your DNS provider.

## Step 5: Commit and push

```bash
git add vercel.json .github/workflows/deploy-vercel.yml VERCEL_SETUP.md .vercel/project.json
git commit -m "chore: add Vercel deployment configuration"
git push
```

The GitHub Actions workflow triggers on every push to `main` and every pull request:

- **Pull requests** → preview deployment URL (posted automatically by Vercel)
- **Push to main** → production deployment at your Vercel domain

## Step 6: Verify the deployment

Use DocuMCP's `verify_deployment` tool with the Vercel URL:

```json
{
  "tool": "verify_deployment",
  "arguments": {
    "deployedUrl": "https://your-project.vercel.app"
  }
}
```

## Troubleshooting

### Build fails with "command not found: vercel"

The workflow installs Vercel CLI globally in the first step. If you see this error, check that the `Install Vercel CLI` step ran before the deploy step.

### `VERCEL_TOKEN` secret not found

Ensure the secret is added at the repository level (not just the environment level) in **Settings → Secrets and variables → Actions → Repository secrets**.

### Site builds locally but fails on Vercel

Vercel sets `NODE_ENV=production` during build. If your site has production-only dependencies that aren't in `devDependencies`, they may be skipped. Move them to `dependencies` in `package.json`.

### `vercel pull` fails with "project not linked"

The workflow runs `vercel pull` to fetch environment variables. If you skipped Step 1 (`vercel link`), the `.vercel/project.json` file won't exist. Either run `vercel link` locally and commit the `.vercel/project.json`, or remove the `vercel pull` step from the workflow if you have no Vercel environment variables.

## Related

- [ADR-018: Deploy Target Adapter Pattern](../adrs/adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md)
- [Vercel CLI documentation](https://vercel.com/docs/cli)
- [GitHub Actions secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [deploy_site tool reference](../reference/api-overview.md)

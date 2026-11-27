# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x (latest: 1.0.0 on npm) | ✅ security fixes |
| < 1.0 | ❌ |

v2.0 is in development on `main`; when it is released, 1.x gets fixes for high and critical
issues for three months.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through GitHub:
[Report a vulnerability](https://github.com/tosin2013/documcp/security/advisories/new)
(the repository's Security tab → Advisories → *Report a vulnerability*).

Include what you found, how to reproduce it (a repository layout or a tool call with its
arguments is ideal), which version you ran, and what an attacker gains.

This is a project maintained by one person. You can expect an acknowledgement within a week and
an assessment within two; a fix for a confirmed issue is released as soon as it is ready, and you
are credited in the advisory unless you ask not to be.

## What DocuMCP can touch

DocuMCP is an MCP server that runs locally, over stdio, with the permissions of the user who
starts it. It has no network listener and no authentication of its own: whoever can send it MCP
requests (your MCP client, and the model driving it) can use every tool. Knowing what the tools
do helps you judge a report, or your own setup:

- **Files.** Tools read the repository paths they are given, and some write documentation,
  configuration and workflow files into them. DocuMCP keeps its own state in
  `.documcp/memory/` in the working directory (or `DOCUMCP_STORAGE_DIR`).
- **Commands.** `test_local_deployment` runs the chosen static site generator's build and serve
  commands (for example `npm run build`, `hugo server`) in the repository, so it runs that
  repository's scripts. Only point it at repositories you trust.
- **Network.** Off by default. Link checking contacts external URLs only when asked
  (`followExternalLinks`), and the GitHub issues integration calls the GitHub API only when
  configured with a token.
- **Credentials.** DocuMCP stores none. Generated deployment workflows refer to secrets (for
  example `VERCEL_TOKEN`) by name, for you to add to your CI; review a generated workflow before
  you commit it.

In scope: a tool that reads or writes outside the paths it was given, runs commands it
shouldn't, leaks file contents or tokens, or generates an unsafe workflow; and vulnerabilities in
DocuMCP's dependencies that affect it. Out of scope: what a model does with tools you allowed it
to use, and issues that need an attacker who can already run commands as you.

## How dependencies are kept safe

- CI's **Security Audit** job runs `npm audit --production` and fails on any high or critical
  finding; it is not loosened to get a release out.
- Dependabot opens update pull requests; CodeQL and dependency review run on pull requests.
- Dependency changes go through a reviewed planning pull request (constitution VI).

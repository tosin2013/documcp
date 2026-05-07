import type {
  DeployTargetAdapter,
  DeployOptions,
  GeneratedFile,
  TargetMetadata,
  VerificationResult,
} from "../types.js";

/** Output directory per SSG — used in both vercel.json and the GH Actions workflow */
const SSG_OUTPUT_DIRS: Record<string, string> = {
  docusaurus: "build",
  hugo: "public",
  jekyll: "_site",
  mkdocs: "site",
  eleventy: "_site",
  astro: "dist",
  vitepress: ".vitepress/dist",
};

/** Build commands per SSG */
const SSG_BUILD_CMDS: Record<string, string> = {
  docusaurus: "npm run build",
  hugo: "hugo --minify",
  jekyll: "bundle exec jekyll build",
  mkdocs: "mkdocs build",
  eleventy: "npm run build",
  astro: "npm run build",
  vitepress: "npm run build",
};

export class VercelAdapter implements DeployTargetAdapter {
  metadata: TargetMetadata = {
    name: "Vercel",
    slug: "vercel",
    supportedSSGs: [
      "docusaurus",
      "hugo",
      "jekyll",
      "mkdocs",
      "eleventy",
      "astro",
      "vitepress",
    ],
    description:
      "Generates vercel.json and an optional GitHub Actions workflow for Vercel deployments. Medium-depth: no API tokens required; uses Vercel CLI.",
  };

  generateDeploymentArtifact(
    ssg: string,
    opts: DeployOptions,
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({
      path: "vercel.json",
      content: this.generateVercelConfig(ssg, opts),
    });

    files.push({
      path: ".github/workflows/deploy-docs.yml",
      content: this.generateWorkflow(ssg, opts),
    });

    return files;
  }

  optionalCliCommand(opts: DeployOptions): string | null {
    if (!opts.invokeCliCommand) return null;
    return opts.customDomain
      ? `vercel deploy --prod --domains ${opts.customDomain}`
      : "vercel deploy --prod";
  }

  async verify(deployedUrl: string): Promise<VerificationResult> {
    try {
      const response = await fetch(deployedUrl, { method: "HEAD" });
      return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok
          ? `Site is live at ${deployedUrl}`
          : `Site returned HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Could not reach ${deployedUrl}: ${error}`,
      };
    }
  }

  private generateVercelConfig(ssg: string, opts: DeployOptions): string {
    const outputDir = SSG_OUTPUT_DIRS[ssg] ?? "build";
    const buildCmd =
      opts.buildConfig.buildCommand || SSG_BUILD_CMDS[ssg] || "npm run build";
    const installCmd = (() => {
      const pm = opts.buildConfig.packageManager ?? "npm";
      if (pm === "yarn") return "yarn install --frozen-lockfile";
      if (pm === "pnpm") return "pnpm install --frozen-lockfile";
      return "npm install";
    })();

    const rootDirectory = opts.buildConfig.workingDirectory ?? undefined;

    const config: Record<string, unknown> = {
      buildCommand: buildCmd,
      outputDirectory: outputDir,
      installCommand: installCmd,
      framework: ssg === "docusaurus" ? "docusaurus2" : null,
    };

    if (rootDirectory) {
      config.rootDirectory = rootDirectory;
    }

    if (opts.customDomain) {
      config.alias = [opts.customDomain];
    }

    // Remove null framework for non-docusaurus SSGs
    if (config.framework === null) {
      delete config.framework;
    }

    return JSON.stringify(config, null, 2) + "\n";
  }

  private generateWorkflow(ssg: string, opts: DeployOptions): string {
    const { buildConfig } = opts;
    const nodeVersion = buildConfig.nodeVersion || "20";
    const packageManager = buildConfig.packageManager || "npm";
    const workingDir = buildConfig.workingDirectory;
    const wdLine = workingDir
      ? `\n        working-directory: ${workingDir}`
      : "";
    const cacheDep = workingDir
      ? `\n          cache-dependency-path: ${workingDir}/package-lock.json`
      : "";

    const isNodeBased = [
      "docusaurus",
      "eleventy",
      "astro",
      "vitepress",
    ].includes(ssg);
    const isPythonBased = ssg === "mkdocs";
    const isRubyBased = ssg === "jekyll";
    const isGoBased = ssg === "hugo";

    let setupStep = "";
    if (isNodeBased) {
      setupStep = `
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${packageManager}'${cacheDep}

      - name: Install dependencies${wdLine}
        run: ${
          packageManager === "yarn"
            ? "yarn install --frozen-lockfile"
            : packageManager === "pnpm"
              ? "pnpm install --frozen-lockfile"
              : "npm ci"
        }
`;
    } else if (isPythonBased) {
      setupStep = `
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.x'

      - name: Install dependencies${wdLine}
        run: pip install -r requirements.txt
`;
    } else if (isRubyBased) {
      setupStep = `
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true${
            workingDir ? `\n          working-directory: ${workingDir}` : ""
          }
`;
    } else if (isGoBased) {
      setupStep = `
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
`;
    }

    const buildCmd =
      buildConfig.buildCommand || SSG_BUILD_CMDS[ssg] || "npm run build";

    return `name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
${setupStep}
      - name: Build${wdLine}
        run: ${buildCmd}

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel environment${wdLine}
        run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel${wdLine}
        run: |
          if [ "\${{ github.event_name }}" = "pull_request" ]; then
            vercel deploy --prebuilt --token=\${{ secrets.VERCEL_TOKEN }}
          else
            vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}
          fi
`;
  }
}

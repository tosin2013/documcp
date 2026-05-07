import type {
  DeployTargetAdapter,
  DeployOptions,
  GeneratedFile,
  TargetMetadata,
  VerificationResult,
} from "../types.js";

export class GitHubPagesAdapter implements DeployTargetAdapter {
  metadata: TargetMetadata = {
    name: "GitHub Pages",
    slug: "github-pages",
    supportedSSGs: ["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"],
    description:
      "Generates a GitHub Actions workflow that builds and deploys to GitHub Pages",
  };

  generateDeploymentArtifact(
    ssg: string,
    opts: DeployOptions,
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const workflow = this.generateWorkflow(ssg, opts);
    files.push({
      path: ".github/workflows/deploy-github-pages.yml",
      content: workflow,
    });

    if (opts.customDomain) {
      files.push({ path: "CNAME", content: opts.customDomain });
    }

    return files;
  }

  optionalCliCommand(_opts: DeployOptions): string | null {
    return null;
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

  private generateWorkflow(ssg: string, opts: DeployOptions): string {
    const { branch, buildConfig } = opts;
    const workingDirPrefix = buildConfig.workingDirectory
      ? `      working-directory: ${buildConfig.workingDirectory}\n`
      : "";
    const nodeVersion = buildConfig.nodeVersion || "20";
    const packageManager = buildConfig.packageManager || "npm";

    const getInstallCmd = () => {
      if (packageManager === "yarn") return "yarn install --frozen-lockfile";
      if (packageManager === "pnpm") return "pnpm install --frozen-lockfile";
      return "npm ci";
    };

    const workflows: Record<string, string> = {
      docusaurus: `name: Deploy Docusaurus to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${packageManager}'${
            buildConfig.workingDirectory
              ? `\n          cache-dependency-path: ${buildConfig.workingDirectory}/package-lock.json`
              : ""
          }

      - name: Install dependencies
${workingDirPrefix}        run: ${getInstallCmd()}

      - name: Build website
${workingDirPrefix}        run: ${buildConfig.buildCommand}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ${
            buildConfig.workingDirectory
              ? `${buildConfig.workingDirectory}/${buildConfig.outputPath}`
              : buildConfig.outputPath
          }

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,

      mkdocs: `name: Deploy MkDocs to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest${
      buildConfig.workingDirectory
        ? `\n    defaults:\n      run:\n        working-directory: ${buildConfig.workingDirectory}`
        : ""
    }
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Build and Deploy
        run: mkdocs gh-deploy --force --branch ${branch}`,

      hugo: `name: Deploy Hugo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest${
      buildConfig.workingDirectory
        ? `\n    defaults:\n      run:\n        working-directory: ${buildConfig.workingDirectory}`
        : ""
    }
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true

      - name: Build
        run: ${buildConfig.buildCommand}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ${
            buildConfig.workingDirectory
              ? `${buildConfig.workingDirectory}/${buildConfig.outputPath}`
              : buildConfig.outputPath
          }

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,

      jekyll: `name: Deploy Jekyll to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest${
      buildConfig.workingDirectory
        ? `\n    defaults:\n      run:\n        working-directory: ${buildConfig.workingDirectory}`
        : ""
    }
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true${
            buildConfig.workingDirectory
              ? `\n          working-directory: ${buildConfig.workingDirectory}`
              : ""
          }

      - name: Build with Jekyll
        run: ${buildConfig.buildCommand}
        env:
          JEKYLL_ENV: production

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2${
          buildConfig.workingDirectory
            ? `\n        with:\n          path: ${buildConfig.workingDirectory}/${buildConfig.outputPath}`
            : ""
        }

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,

      eleventy: `name: Deploy Eleventy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${packageManager}'${
            buildConfig.workingDirectory
              ? `\n          cache-dependency-path: ${buildConfig.workingDirectory}/package-lock.json`
              : ""
          }

      - name: Install dependencies
${workingDirPrefix}        run: ${getInstallCmd()}

      - name: Build site
${workingDirPrefix}        run: ${buildConfig.buildCommand}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ${
            buildConfig.workingDirectory
              ? `${buildConfig.workingDirectory}/${buildConfig.outputPath}`
              : buildConfig.outputPath
          }

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,
    };

    return workflows[ssg] ?? workflows.jekyll;
  }
}

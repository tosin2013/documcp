/**
 * Deploy Target Adapter Pattern — ADR-018
 *
 * Defines the pluggable interface for deployment targets so that
 * GitHub Pages, Vercel, Netlify, and Cloudflare Pages all conform to
 * the same contract consumed by the deploy_site tool.
 */

export interface BuildConfig {
  workingDirectory: string | null;
  buildCommand: string;
  outputPath: string;
  nodeVersion?: string;
  packageManager?: "npm" | "yarn" | "pnpm";
}

export interface TargetMetadata {
  /** Human-readable name shown in tool output */
  name: string;
  /** Machine-readable slug used as the `target` parameter value */
  slug: string;
  /** SSGs this adapter can produce configuration for */
  supportedSSGs: string[];
  /** Short description of what the adapter generates */
  description: string;
}

export interface DeployOptions {
  ssg: string;
  branch: string;
  customDomain?: string;
  buildConfig: BuildConfig;
  /** When true the adapter's optionalCliCommand should be executed */
  invokeCliCommand?: boolean;
}

export interface GeneratedFile {
  /** Relative path from the repository root where the file should be written */
  path: string;
  content: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  statusCode?: number;
}

export interface DeployTargetAdapter {
  metadata: TargetMetadata;
  /**
   * Returns one or more files to be written to the repository.
   * Adapter must not perform any file I/O; the caller writes the files.
   */
  generateDeploymentArtifact(ssg: string, opts: DeployOptions): GeneratedFile[];
  /**
   * Returns the optional CLI command string (e.g. "vercel deploy --prod")
   * that the user can run to complete the deployment, or null when not
   * applicable for this target.
   */
  optionalCliCommand(opts: DeployOptions): string | null;
  /**
   * Performs a lightweight liveness check against the deployed URL.
   */
  verify(deployedUrl: string): Promise<VerificationResult>;
}

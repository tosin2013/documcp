import { GitHubPagesAdapter } from "./github-pages/index.js";
import { VercelAdapter } from "./vercel/index.js";
import type { DeployTargetAdapter } from "./types.js";

export type { DeployTargetAdapter };
export type {
  BuildConfig,
  DeployOptions,
  GeneratedFile,
  TargetMetadata,
  VerificationResult,
} from "./types.js";
export { GitHubPagesAdapter } from "./github-pages/index.js";
export { VercelAdapter } from "./vercel/index.js";

const registry = new Map<string, DeployTargetAdapter>([
  ["github-pages", new GitHubPagesAdapter()],
  ["vercel", new VercelAdapter()],
]);

/**
 * Returns the adapter for the given target slug, or undefined if the slug
 * is not registered. Callers should validate the slug against the Zod schema
 * before calling this function.
 */
export function getAdapter(slug: string): DeployTargetAdapter | undefined {
  return registry.get(slug);
}

/** Returns all registered adapter slugs. Useful for generating error messages. */
export function listAdapterSlugs(): string[] {
  return Array.from(registry.keys());
}

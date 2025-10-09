import path from "path";

/**
 * Check if a requested path is within allowed roots
 *
 * @param requestedPath - The path to check
 * @param allowedRoots - Array of allowed root directories
 * @returns true if path is allowed, false otherwise
 *
 * @example
 * ```typescript
 * const allowed = isPathAllowed("/home/user/project/file.txt", ["/home/user/project"]);
 * // returns true
 *
 * const denied = isPathAllowed("/etc/passwd", ["/home/user/project"]);
 * // returns false
 * ```
 */
export function isPathAllowed(
  requestedPath: string,
  allowedRoots: string[],
): boolean {
  // Resolve the requested path to absolute
  const resolvedPath = path.resolve(requestedPath);

  // Check if the path starts with any of the allowed roots
  return allowedRoots.some((root) => {
    const resolvedRoot = path.resolve(root);
    // Use path.relative to check if path is within root
    // If relative path doesn't start with "..", it's within the root
    const relativePath = path.relative(resolvedRoot, resolvedPath);
    return !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  });
}

/**
 * Get a user-friendly error message when path access is denied
 *
 * @param requestedPath - The path that was denied
 * @param allowedRoots - Array of allowed root directories
 * @returns Error message string
 */
export function getPermissionDeniedMessage(
  requestedPath: string,
  allowedRoots: string[],
): string {
  return `Access denied: Path "${requestedPath}" is outside allowed roots. Allowed roots: ${allowedRoots.join(
    ", ",
  )}`;
}

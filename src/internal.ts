import { toPath } from "jsr:@molt/lib/path";

/**
 * Check if a path is under a base path.
 */
export function isUnder(
  path: string | URL,
  base: string | URL,
): boolean {
  return toPath(path).startsWith(toPath(base));
}

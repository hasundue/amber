import { toPath } from "@molt/lib/path";
import * as std from "@std/path";

/**
 * Check if a path is under a base path.
 */
export function isUnder(
  path: string | URL,
  base: string | URL,
): boolean {
  return toPath(path).startsWith(toPath(base));
}

export function relative(
  from: string | URL,
  to: string | URL,
): string {
  return std.relative(toPath(from), toPath(to));
}

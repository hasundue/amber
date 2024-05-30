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

/**
 * Return the relative path from the first path to the second path.
 */
export function relative(
  from: string | URL,
  to: string | URL,
): string {
  return std.relative(toPath(from), toPath(to));
}

/**
 * Try to execute a function and return the result or handle the error if the
 * function is synchronous, or return a promise that resolves to the result or
 * caches the error with the handler if the function is asynchronous.
 */
export function tryCatchFinally<T>(
  fn: () => T,
  handle?: (error: Error) => T,
  cleanup?: () => void,
): T {
  let ret: T;
  try {
    ret = fn();
  } catch (error) {
    if (handle) {
      ret = handle(error);
    } else {
      throw error;
    }
  }
  if (ret instanceof Promise) {
    return ret.catch(handle).finally(cleanup) as T;
  }
  if (cleanup) cleanup();
  return ret;
}

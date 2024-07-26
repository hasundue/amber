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

/**
 * A syntax sugar for `tryCatchFinally(fn, handle, undefined)`.
 */
export function tryCatch<T>(
  fn: () => T,
  handle: (error: Error) => T,
): T {
  return tryCatchFinally(fn, handle);
}

/**
 * A syntax sugar for `tryCatchFinally(fn, undefined, cleanup)`.
 */
export function tryFinally<T>(
  fn: () => T,
  cleanup: () => void,
): T {
  return tryCatchFinally(fn, undefined, cleanup);
}

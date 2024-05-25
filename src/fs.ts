/**
 * Mock Deno's file system APIs.
 *
 * @module
 */

import type { Spy } from "@std/testing/mock";
import { pick } from "@std/collections";

const FsOps = [
  "chmod",
  "chown",
  "create",
  "fdatasync",
  "lstat",
  "mkdir",
  "open",
  "readDir",
  "readFile",
  "readLink",
  "readTextFile",
  "realPath",
  "remove",
  "stat",
  "truncate",
  "utime",
  "writeFile",
  "writeTextFile",
] as const;

type FsOp = typeof FsOps[number];
type FsSyncOp = `${FsOp}Sync`;

const FsSyncOps = FsOps
  .map((name) => name + "Sync") as [FsSyncOp];

const FsMaps = [
  "copyFile",
  "link",
  "rename",
  "symlink",
] as const;

type FsMap = typeof FsMaps[number];
type FsSyncMap = `${FsMap}Sync`;

const FsSyncMaps = FsMaps
  .map((name) => name + "Sync") as [FsSyncMap];

const FsFns = [
  ...FsOps,
  ...FsSyncOps,
  ...FsMaps,
  ...FsSyncMaps,
] as const;

type FsFn = typeof FsFns[number];

/**
 * A subset of the `Deno` namespace that are related to file system operations.
 */
type DenoFs = Pick<typeof Deno, FsFn>;
const DenoFs: DenoFs = pick(Deno, FsFns);

const spies = new Map<string | URL, unknown>();

interface FileSystemSpy<P extends string | URL> extends Disposable, Spy<FsFn> {
}

export interface FileSystemStub<P extends string | URL>
  extends FileSystemSpy<P> {
  fake: typeof DenoFs;
}

export function stub(
  path: string | URL,
) {
  const proxy = new Proxy(DenoFs, {
    get(target, name) {
      const spy = spies.get(path.toString());
      if (spy) {
        return spy;
      } else {
        return Reflect.get(target, name);
      }
    },
  });
}

export function mock(): Disposable {
  return {
    [Symbol.dispose]() {
      restore();
    },
  };
}

export function use<T>(fn: () => T) {
  using stack = new DisposableStack();
  stack.use(mock());
  return fn();
}

function useUniPathFn<T extends FsFn>(
  name: T,
) {
  Deno[name] = new Proxy(Deno[name], {
    apply(target, thisArg, args) {
      const path = args[0] as string | URL;
      const spy = spies.get(path);
      if (spy) {
        return spy;
      } else {
        return Reflect.apply(target, thisArg, args);
      }
    },
  });
}

const PathFnsOrg = Object.fromEntries(
  FsFns.map((name) => [name, Deno[name]]),
) as {
  [F in FsFn]: typeof Deno[F];
};

export function restore() {
  Object.entries(PathFnsOrg).forEach(([name, fn]) => {
    _restore(name as FsFn, fn);
  });
}

function _restore<T extends FsFn>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

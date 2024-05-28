/**
 * Mocking of Deno's file system APIs.
 *
 * @module
 */

import { pick } from "@std/collections";
import { join } from "@std/path";
import type { Spy } from "@std/testing/mock";
import * as std from "@std/testing/mock";
import { isUnder, relative } from "./internal.ts";

/**
 * The base names of Deno's APIs related to file system operations that takes
 * a path as the first argument.
 */
const FsOpNames = [
  "chmod",
  "chown",
  "create",
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

type FsOpName = typeof FsOpNames[number];
type FsOpSyncName = `${FsOpName}Sync`;

/**
 * The synchronous versions of the file system operations that takes a path as
 * the first argument.
 */
const FsOpSyncNames = FsOpNames
  .map((name) => name + "Sync") as [FsOpSyncName];

/**
 * The base names of Deno's APIs related to file system operations that takes
 * two paths as the first and second arguments.
 */
const FsMapNames = [
  "copyFile",
  "link",
  "rename",
  "symlink",
] as const;

type FsMapName = typeof FsMapNames[number];
type FsMapSyncName = `${FsMapName}Sync`;

/**
 * The synchronous versions of the file system operations that takes two paths
 * as the first and second arguments.
 */
const FsMapSyncNames = FsMapNames
  .map((name) => name + "Sync") as [FsMapSyncName];

const isFsMapName = (name: string): name is FsMapName =>
  FsMapNames.includes(name as FsMapName) ||
  FsMapSyncNames.includes(name as FsMapSyncName);

/**
 * The base names of Deno APIs related to file system operations that does not
 * take a path as an argument.
 */
const FsSysNames = [
  // "flock",
  // "funlock",
  "fstat",
  "fdatasync",
  "ftruncate",
  "futime",
  "makeTempDir",
  // "umask",
] as const;

type FsSysName = typeof FsSysNames[number];
type FsSysSyncName = `${FsSysName}Sync`;

const FsSysSyncNames = FsSysNames
  .map((name) => name + "Sync") as [FsSysSyncName];

const isFsSysName = (name: string): name is FsSysName =>
  FsSysNames.includes(name as FsSysName) ||
  FsSysSyncNames.includes(name as FsSysSyncName);

/**
 * The names of Deno's APIs related to file system operations.
 */
const FsFnNames = [
  ...FsOpNames,
  ...FsOpSyncNames,
  ...FsMapNames,
  ...FsMapSyncNames,
  ...FsSysNames,
  ...FsSysSyncNames,
] as const;

type FsFnName = typeof FsFnNames[number];

/**
 * A subset of the `Deno` namespace that are related to file system operations.
 */
const DenoFs: {
  [K in FsFnName]: typeof Deno[K];
} = pick(Deno, FsFnNames);

/**
 * A record of spies for the file system operations.
 */
type DenoFsSpy = {
  [K in FsFnName]: Spy<typeof Deno[K]>;
};

/**
 * A record of spies for Deno APIs related to file system operations.
 */
export interface FileSystemSpy extends Disposable, DenoFsSpy {
}

/**
 * A record of stubs for Deno APIs related to file system operations.
 */
export interface FileSystemStub extends FileSystemSpy {
}

/**
 * Dummy implementations of Deno's file system APIs that redirect the operations
 * to a temporary directory.
 */
const DenoFsDummy = (base: string | URL, temp: string): typeof DenoFs => {
  const redirect = (path: string | URL) => join(temp, relative(base, path));
  const dummy = {};
  for (const name of FsFnNames) {
    Object.defineProperty(dummy, name, {
      configurable: true,
      enumerable: true,
      value(...args: Parameters<typeof DenoFs[FsFnName]>) {
        try {
          DenoFs[name](
            isFsSysName(name) ? args[0] : redirect(args[0] as string | URL),
            isFsMapName(name) ? redirect(args[1] as string | URL) : args[1],
            // @ts-ignore 2556 allow passing a spread argument
            ...args.slice(2),
          );
        } catch (err) {
          if (err instanceof Deno.errors.NotFound) {
            // @ts-ignore 2556 allow passing a spread argument
            DenoFs[name](...args);
          }
          throw err;
        }
      },
    });
  }
  return dummy as typeof DenoFs;
};

/**
 * A map from paths to spies for the file system operations, whose `get` method
 * is patched to return the spy for the path that is under the given path.
 */
const spies = new class extends Map<string | URL, FileSystemSpy> {
  /** Returns the spy for the path that is under the given path. */
  override get(key: string | URL) {
    for (const [path, spy] of this) {
      if (isUnder(key, path)) {
        return spy;
      }
    }
  }
}();

export function stub(
  path: string | URL,
  fake: Partial<typeof DenoFs> = {},
): FileSystemStub {
  const temp = DenoFs.makeTempDirSync();
  const dummy = DenoFsDummy(path, temp);

  const stub = {} as FileSystemStub;

  for (const name of FsFnNames) {
    Object.defineProperty(stub, name, {
      configurable: true,
      enumerable: true,
      value: fake[name] ? std.stub(fake, name) : std.stub(dummy, name),
    });
  }

  Object.defineProperty(stub, Symbol.dispose, {
    value() {
      Object.values(stub).forEach((it) => it.restore());
      spies.delete(path);
      Deno.removeSync(temp, { recursive: true });
    },
  });

  spies.set(path, stub);
  return stub;
}

export function spy(
  path: string | URL,
): FileSystemSpy {
  return stub(path, DenoFs);
}

export function mock(): Disposable {
  FsOpNames.forEach(mockFsOp);
  return {
    [Symbol.dispose]() {
      restore();
    },
  };
}

function mockFsOp<T extends FsOpName | FsOpSyncName>(
  name: T,
) {
  Object.defineProperty(Deno, name, {
    value(...args: Parameters<typeof DenoFs[T]>) {
      const spy = spies.get(args[0]);
      if (spy) {
        return spy[name].bind(spy[name])(...args);
      }
      // @ts-ignore 2556 allow passing a spread argument
      return DenoFs[name](...args);
    },
  });
}

export function use<T>(fn: () => T): T {
  mock();
  try {
    return fn();
  } finally {
    restore();
  }
}

export function restore() {
  Object.entries(DenoFs).forEach(([name, fn]) => {
    restoreFsFn(name as FsFnName, fn);
  });
}

function restoreFsFn<T extends FsFnName>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

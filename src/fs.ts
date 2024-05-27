/**
 * Mock Deno's file system APIs.
 *
 * @module
 */

import { mapEntries, pick } from "@std/collections";
import type { Spy } from "@std/testing/mock";
import * as std from "@std/testing/mock";
import { isUnder } from "./internal.ts";

/**
 * The base names of Deno's APIs related to file system operations that takes
 * a path as the first argument.
 */
const FsOpNames = [
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

type FsOpName = typeof FsOpNames[number];
type FsOpSyncName = `${FsOpName}Sync`;

/**
 * The synchronous versions of the file system operations that takes a path as
 * the first argument.
 */
const FsOpSyncNames = FsOpNames
  .map((name) => name + "Sync") as [FsOpSyncName];

/**
 * A subset of the `Deno` namespace that are related to file system operations
 * that takes a path as the first argument.
 */
const DenoFsOp: {
  [K in FsOpName]: typeof Deno[K];
} = pick(Deno, FsOpNames);

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

/**
 * A subset of the `Deno` namespace that are related to file system operations
 * that takes two paths as the first and second arguments.
 */
const DenoFsMap: {
  [K in FsMapName]: typeof Deno[K];
} = pick(Deno, FsMapNames);

/**
 * The base names of Deno APIs related to file system operations that does not
 * take a path as an argument.
 */
const FsSysNames = [
  "flock",
  "funlock",
  "fstat",
  "ftruncate",
  "futime",
  "makeTempDir",
] as const;

type FsSysName = typeof FsSysNames[number];
type FsSysSyncName = `${FsSysName}Sync`;

const FsSysSyncNames = FsSysNames
  .map((name) => name + "Sync") as [FsSysSyncName];

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
  /** The path that the spy is for. */
  path: string | URL;
}

/**
 * A record of stubs for Deno APIs related to file system operations.
 */
export interface FileSystemStub extends FileSystemSpy {
  /** The fake implementation of Deno's file system APIs. */
  fake: typeof DenoFs;

  /** The temporary directory that the stub is created in. */
  temp: string;
}

/**
 * Dummy implementations of Deno's file system APIs that redirect the operations
 * to a temporary directory.
 */
const DenoFsDummy = (base: string | URL, temp: string): typeof DenoFs => {
  const FsOpDummy = mapEntries(DenoFsOp, ([name, fn]) => {
    return [
      name,
      new Proxy(fn, {
        apply(target, thisArg, args) {
          console.log(args);
          return Reflect.apply(target, thisArg, [
            new URL(args[0] as string | URL, temp),
            ...args.slice(1),
          ]);
        },
      }),
    ];
  }) as typeof DenoFsOp;
  const FsMapDummy = mapEntries(DenoFsMap, ([name, fn]) => {
    return [
      name,
      new Proxy(fn, {
        apply(target, thisArg, args) {
          return Reflect.apply(target, thisArg, [
            new URL(args[0] as string | URL, temp),
            new URL(args[1] as string | URL, temp),
            ...args.slice(2),
          ]);
        },
      }),
    ];
  }) as typeof DenoFsMap;
  return {
    ...FsOpDummy,
    ...FsMapDummy,
  };
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

  // TODO: Replace DenoFsOp with DenoFs
  const spy = mapEntries(DenoFsOp, ([key]) => {
    const name = key as FsFnName;
    return [
      key,
      fake[name] ? std.spy(fake, name) : std.spy(dummy, name),
    ];
  }) as unknown as DenoFsSpy;

  spies.set(path, spy);

  return {
    ...spy,
    fake: { ...dummy, ...fake },
    path,
    temp,
    [Symbol.dispose]() {
      spies.delete(path);
    },
  };
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
  Deno[name] = new Proxy(Deno[name], {
    apply(target, thisArg, args) {
      const path = args[0] as string | URL;
      const spy = spies.get(path);
      return Reflect.apply(spy?.[name] ?? target, thisArg, args);
    },
  });
}

export function use<T>(fn: () => T) {
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

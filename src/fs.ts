/**
 * Mock Deno's file system APIs.
 *
 * @module
 */

import { mapEntries } from "@std/collections";
import type { Spy } from "@std/testing/mock";
import * as std from "@std/testing/mock";
import { pick } from "@std/collections";

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
 * The names of Deno's APIs related to file system operations.
 */
const FsFnNames = [
  ...FsOpNames,
  ...FsOpSyncNames,
  ...FsMapNames,
  ...FsMapSyncNames,
] as const;

type FsFnName = typeof FsFnNames[number];

/**
 * A subset of the `Deno` namespace that are related to file system operations.
 */
const DenoFs: {
  [K in FsFnName]: typeof Deno[K];
} = pick(Deno, FsFnNames);

export interface FileSystemSpy
  extends Disposable, Spy<typeof Deno[FsFnName]> {
}

export interface FileSystemStub
  extends FileSystemSpy {
  fake: typeof DenoFs;
}

const spies = new Map<string | URL, FileSystemSpy>();

export function stub(
  path: string | URL,
  fake: typeof DenoFs,
): FileSystemStub {
  const spies = mapEntries(fake, ([name]) => [
    name,
    std.spy(fake, name as FsFnName),
  ]);
}

export function spy(
  path: string | URL,
): FileSystemSpy {
  return stub(path, DenoFs);
}

export function mock(): Disposable {
  return {
    [Symbol.dispose]() {
      restore();
    },
  };
}

export function use<T>(fn: () => T) {
  mock();
  try {
    return fn();
  } finally {
    restore();
  }
}

function mockFsOp<T extends FsOpName | FsOpSyncName>(
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

const FsFnOriginal = Object.fromEntries(
  FsFnNames.map((name) => [name, Deno[name]]),
) as {
  [Name in FsFnName]: typeof Deno[Name];
};

export function restore() {
  Object.entries(FsFnOriginal).forEach(([name, fn]) => {
    restoreFsFn(name as FsFnName, fn);
  });
}

function restoreFsFn<T extends FsFnName>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

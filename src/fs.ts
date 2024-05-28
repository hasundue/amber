/**
 * Mocking of Deno's file system APIs.
 *
 * @module
 */

import { pick } from "@std/collections";
import { join } from "@std/path";
import type { Spy } from "@std/testing/mock";
import * as std from "@std/testing/mock";
import { isUnder, relative, tryOr } from "./internal.ts";

/**
 * The base names of Deno's APIs related to file system operations that takes
 * a path as the first argument.
 */
const FsOpBaseNames = [
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

type FsOpBaseName = typeof FsOpBaseNames[number];
type FsOpSyncName = `${FsOpBaseName}Sync`;

/**
 * The synchronous versions of the file system operations that takes a path as
 * the first argument.
 */
const FsOpSyncNames = FsOpBaseNames
  .map((name) => name + "Sync") as [FsOpSyncName];

type FsOpName = FsOpBaseName | FsOpSyncName;

const FsOpNames = [
  ...FsOpBaseNames,
  ...FsOpSyncNames,
] as const;

/**
 * The base names of Deno's APIs related to file system operations that takes
 * two paths as the first and second arguments.
 */
const FsMapBaseNames = [
  "copyFile",
  "link",
  "rename",
  "symlink",
] as const;

type FsMapBaseName = typeof FsMapBaseNames[number];
type FsMapSyncName = `${FsMapBaseName}Sync`;

/**
 * The synchronous versions of the file system operations that takes two paths
 * as the first and second arguments.
 */
const FsMapSyncNames = FsMapBaseNames
  .map((name) => name + "Sync") as [FsMapSyncName];

type FsMapName = FsMapBaseName | FsMapSyncName;

const FsMapNames = [
  ...FsMapBaseNames,
  ...FsMapSyncNames,
] as const;

/**
 * The base names of Deno APIs related to file system operations that does not
 * take a path as an argument.
 */
const FsSysBaseNames = [
  // "flock",
  // "funlock",
  "fstat",
  "fdatasync",
  "ftruncate",
  "futime",
  "makeTempDir",
  // "umask",
] as const;

type FsSysBaseName = typeof FsSysBaseNames[number];
type FsSysSyncName = `${FsSysBaseName}Sync`;

const FsSysSyncNames = FsSysBaseNames
  .map((name) => name + "Sync") as [FsSysSyncName];

type FsSysName = FsSysBaseName | FsSysSyncName;

const FsSysNames = [
  ...FsSysBaseNames,
  ...FsSysSyncNames,
] as const;

/** The names of Deno's APIs related to file system operations. */
const FsFnNames = [
  ...FsOpNames,
  ...FsMapNames,
  ...FsSysNames,
] as const;

type FsFnName = typeof FsFnNames[number];

const isFsMap = (name: FsFnName): name is FsMapName =>
  FsMapNames.includes(name as FsMapName);

const isFsSys = (name: FsFnName): name is FsSysName =>
  FsSysNames.includes(name as FsSysName);

/** A subset of the `Deno` namespace that are related to file system operations. */
type DenoFs = {
  [K in FsFnName]: typeof Deno[K];
};

/** Get a subset of the `Deno` namespace that are related to file system operations. */
const DenoFs = (): DenoFs => pick(Deno, FsFnNames);

/** The original implementations of Deno's file system APIs. */
const DenoFsOriginal = DenoFs();

/** A record of spies for the file system operations. */
type DenoFsSpy = {
  [K in FsFnName]: Spy<typeof Deno[K]>;
};

/** A record of spies for Deno APIs related to file system operations. */
export interface FileSystemSpy extends Disposable, DenoFsSpy {
}

/** A record of stubs for Deno APIs related to file system operations. */
export interface FileSystemStub extends FileSystemSpy {
}

/**
 * Dummy implementations of Deno's file system APIs that redirect the operations
 * to a temporary directory.
 */
const DenoFsDummy = (
  base: string | URL,
  temp: string,
  readThrough: boolean,
): DenoFs => {
  const redirect = (path: string | URL) => join(temp, relative(base, path));
  const dummy = {};
  for (const name of FsFnNames) {
    Object.defineProperty(dummy, name, {
      configurable: true,
      enumerable: true,
      value: (...args: Parameters<typeof Deno[FsFnName]>) =>
        tryOr(() =>
          DenoFsOriginal[name](
            isFsSys(name) ? args[0] : redirect(args[0] as string | URL),
            isFsMap(name) ? redirect(args[1] as string | URL) : args[1],
            // @ts-ignore 2556 allow passing a spread argument
            ...args.slice(2),
          ), (err) => {
          if (readThrough && err instanceof Deno.errors.NotFound) {
            // @ts-ignore 2556 allow passing a spread argument
            return DenoFsOriginal[name](...args);
          }
          throw err;
        }),
    });
  }
  return dummy as DenoFs;
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

export interface StubOptions {
  readThrough?: boolean;
}

export function stub(
  path: string | URL,
  options?: StubOptions,
): FileSystemStub;

export function stub(
  path: string | URL,
  fake: Partial<DenoFs>,
  options?: StubOptions,
): FileSystemStub;

export function stub(
  path: string | URL,
  fakeOrOptions: Partial<DenoFs> | StubOptions = {},
  maybeOptions?: StubOptions,
): FileSystemStub {
  const fake = "readThrough" in fakeOrOptions
    ? {}
    : fakeOrOptions as Partial<DenoFs>;

  const options = "readThrough" in fakeOrOptions
    ? fakeOrOptions as StubOptions
    : maybeOptions || {};

  const temp = DenoFsOriginal.makeTempDirSync();
  const dummy = DenoFsDummy(path, temp, options.readThrough ?? true);

  const stub = {} as FileSystemStub;

  for (const name of FsFnNames) {
    Object.defineProperty(stub, name, {
      configurable: true,
      enumerable: true,
      value: fake[name] ? std.spy(fake, name) : std.spy(dummy, name),
    });
  }

  Object.defineProperty(stub, Symbol.dispose, {
    value() {
      spies.delete(path);
      DenoFsOriginal.removeSync(temp, { recursive: true });
    },
  });

  spies.set(path, stub);
  return stub;
}

export function spy(
  path: string | URL,
): FileSystemSpy {
  return stub(path, DenoFs());
}

export function mock(): Disposable {
  FsOpNames.forEach(mockFsOp);
  FsMapNames.forEach(mockFsMap);
  FsSysNames.forEach(mockFsSys);
  return {
    [Symbol.dispose]() {
      restore();
    },
  };
}

function mockFsOp<T extends FsOpName>(
  name: T,
) {
  Object.defineProperty(Deno, name, {
    value(...args: Parameters<DenoFs[T]>) {
      const spy = spies.get(args[0]);
      if (spy) {
        return spy[name].bind(spy[name])(...args);
      }
      // @ts-ignore 2556 allow passing a spread argument
      return DenoFsOriginal[name](...args);
    },
  });
}

function mockFsMap<T extends FsMapName>(
  name: T,
) {
  Object.defineProperty(Deno, name, {
    value() {
      throw new Deno.errors.NotSupported(
        "Mocking functions that take two paths as arguments is not supported yet.",
      );
    },
  });
}

function mockFsSys<T extends FsSysName>(
  name: T,
) {
  Object.defineProperty(Deno, name, {
    value() {
      throw new Deno.errors.NotSupported(
        "Mocking functions that do not take a path as an argument is not supported yet.",
      );
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
  for (const name of FsFnNames) {
    restoreFsFn(name, DenoFsOriginal[name]);
  }
}

function restoreFsFn<T extends FsFnName>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

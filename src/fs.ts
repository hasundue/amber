/**
 * Mocking of Deno's file system APIs.
 *
 * @module
 */

import { mapValues, pick } from "@std/collections";
import {
  dirname,
  extname,
  fromFileUrl,
  join,
  relative,
  resolve,
} from "@std/path";
import type { Spy } from "@std/testing/mock";
import * as std from "@std/testing/mock";
import { tryCatch, tryFinally } from "./internal.ts";

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

/** The names of Deno's APIs related to file system operations. */
const FsFnNames = [
  ...FsOpNames,
  ...FsMapNames,
] as const;

type FsFnName = typeof FsFnNames[number];

const isFsMap = (name: FsFnName): name is FsMapName =>
  FsMapNames.includes(name as FsMapName);

/** A subset of the `Deno` namespace that are related to file system operations. */
type Fs = {
  [K in FsFnName]: typeof Deno[K];
};

/** Get a subset of the `Deno` namespace that are related to file system operations. */
const createFs = (): Fs => pick(Deno, FsFnNames);

/** The original implementations of Deno's file system APIs. */
const fs = createFs();

/** A record of spies for the file system operations. */
type FsSpy = {
  [K in FsFnName]: Spy<typeof Deno[K]>;
};

/** A record of spies for Deno APIs related to file system operations. */
export interface FileSystemSpy extends FsSpy {
}

/** A record of stubs for Deno APIs related to file system operations. */
export interface FileSystemStub extends FileSystemSpy {
}

/**
 * Dummy implementations of Deno's file system APIs that redirect the operations
 * to a temporary directory.
 */
function createFsFake(
  base: string,
  temp: string,
  readThrough: boolean,
): Fs {
  const redirect = (path: string | URL) =>
    join(temp, relative(base, normalize(path)));
  return mapValues(
    fs,
    (fn, name) =>
      new Proxy(fn, {
        apply(target, thisArg, args) {
          return tryCatch(
            () =>
              Reflect.apply(target, thisArg, [
                redirect(args[0]),
                isFsMap(name) ? redirect(args[1]) : args[1],
                ...args.slice(2),
              ]),
            (err) => {
              if (readThrough && err instanceof Deno.errors.NotFound) {
                return Reflect.apply(target, thisArg, [
                  args[0],
                  isFsMap(name) ? redirect(args[1]) : args[1],
                  ...args.slice(2),
                ]);
              }
              throw err;
            },
          );
        },
      }),
  ) as Fs;
}

/**
 * A map from paths to spies for the file system operations, whose `get` method
 * is patched to return the spy for the path that is under the given path.
 */
const spies = new class extends Map<string | URL, FileSystemSpy> {
  /** Returns the spy for the path that is under the given path. */
  override get(path: string): FileSystemSpy | undefined {
    const spy = super.get(path);
    if (spy) {
      return spy;
    }
    if (path === "." || path === ".." || path === "/") {
      return;
    }
    return this.get(dirname(path));
  }
}();

export interface StubOptions {
  readThrough?: boolean;
}

function isStubOptions(
  options: unknown,
): options is StubOptions {
  return options === undefined ||
    typeof options === "object" && !!options && "readThrough" in options;
}

export function stub(
  path: string | URL,
  options?: StubOptions,
): FileSystemStub;

export function stub(
  path: string | URL,
  fake: Partial<Fs>,
): FileSystemStub;

/**
 * Create a stub for the file system operations under the given path.
 */
export function stub(
  path: string | URL,
  fakeOrOptions?: Partial<Fs> | StubOptions,
): FileSystemStub {
  path = normalize(path);
  const base = extname(path) ? dirname(path) : path;
  const temp = Deno.makeTempDirSync();

  const fake = isStubOptions(fakeOrOptions)
    ? createFsFake(base, temp, fakeOrOptions?.readThrough ?? true)
    : fakeOrOptions ?? {};

  const stub = {
    ...mapValues(
      fs,
      (fn, name) => fake[name] ? std.spy(fake, name) : fn,
    ),
  } as FileSystemStub;

  spies.set(path, stub);
  return stub;
}

export function spy(
  path: string | URL,
): FileSystemSpy {
  return stub(path, createFs());
}

export function mock() {
  if (spies.size === 0) {
    stub(Deno.cwd());
  }
  FsFnNames.forEach((name) => mockFsFn(name));
}

function mockFsFn<T extends FsFnName>(name: T) {
  Deno[name] = new Proxy(Deno[name], {
    apply(target, thisArg, args) {
      const path = normalize(args[0]);
      const spy = spies.get(path)?.[name];
      if (spy) {
        return Reflect.apply(spy, thisArg, args);
      }
      return Reflect.apply(target, thisArg, args);
    },
  });
}

export function use<T>(fn: () => T): T {
  mock();
  return tryFinally(fn, restore);
}

export function restore() {
  FsFnNames.forEach((name) => restoreFsFn(name, fs[name]));
}

export function dispose() {
  restore();
  spies.clear();
}

function restoreFsFn<T extends FsFnName>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

/** Normalize a path or file URL to an absolute path */
function normalize(path: string | URL): string {
  if (path instanceof URL) {
    path = path.protocol === "file:" ? fromFileUrl(path) : path.href;
  } else {
    path = resolve(path);
  }
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

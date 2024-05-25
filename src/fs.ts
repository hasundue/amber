import { assertFalse } from "jsr:@std/assert@^0.225.3/assert-false";

export function stub(
  path: string | URL,
) {
  return;
}

const NoPathAsyncFns = [
  "flock",
  "funlock",
  "fstat",
  "ftruncate",
  "futime",
  "makeTempDir",
] as const;

type NoPathFn = typeof NoPathAsyncFns[number];
type NoPathSyncFn = `${NoPathFn}Sync`;

const NoPathSyncFns = NoPathAsyncFns
  .map((name) => name + "Sync") as [NoPathSyncFn];

const UniPathFns = [
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
  "utime",
  "writeFile",
  "writeTextFile",
] as const;

type UniPathFn = typeof UniPathFns[number];
type UniPathSyncFn = `${UniPathFn}Sync`;

const UniPathSyncFns = UniPathFns
  .map((name) => name + "Sync") as [UniPathSyncFn];

const BiPathFns = [
  "copyFile",
  "link",
  "rename",
  "symlink",
  "truncate",
] as const;

type BiPathFn = typeof BiPathFns[number];
type BiPathSyncFn = `${BiPathFn}Sync`;

const BiSyncFns = BiPathFns
  .map((name) => name + "Sync") as [BiPathSyncFn];

const FsFns = [
  ...NoPathAsyncFns,
  ...NoPathSyncFns,
  ...UniPathFns,
  ...UniPathSyncFns,
  ...BiPathFns,
  ...BiSyncFns,
  "umask",
] as const;

type FsFn = typeof FsFns[number];

export function use(): void;
export function use<T>(fn: () => T): T;

export function use<T>(fn?: () => T) {
  for (const name of FsFns) {
    Deno[name] = () => {
      throw new Error();
    };
  }
  if (!fn) return;
  try {
    return fn();
  } finally {
    restore();
  }
}

const FsFnOrg = Object.fromEntries(
  FsFns.map((name) => [name, Deno[name]]),
) as {
  [F in FsFn]: typeof Deno[F];
};

export function restore() {
  Object.entries(FsFnOrg).forEach(([name, fn]) => {
    _restore(name as FsFn, fn);
  });
}

function _restore<T extends FsFn>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

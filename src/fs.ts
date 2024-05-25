export function stub(
  path: string | URL,
) {
  return;
}

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

const BiPathSyncFns = BiPathFns
  .map((name) => name + "Sync") as [BiPathSyncFn];

const PathFns = [
  ...UniPathFns,
  ...UniPathSyncFns,
  ...BiPathFns,
  ...BiPathSyncFns,
] as const;

type PathFn = typeof PathFns[number];

export function use(): void;
export function use<T>(fn: () => T): T;

export function use<T>(fn?: () => T) {
  for (const name of PathFns) {
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

const PathFnsOrg = Object.fromEntries(
  PathFns.map((name) => [name, Deno[name]]),
) as {
  [F in PathFn]: typeof Deno[F];
};

export function restore() {
  Object.entries(PathFnsOrg).forEach(([name, fn]) => {
    _restore(name as PathFn, fn);
  });
}

function _restore<T extends PathFn>(
  name: T,
  fn: typeof Deno[T],
) {
  Deno[name] = fn;
}

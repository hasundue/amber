# amber

A library for mocking [Deno APIs](https://deno.land/api) with ease.

> [!WARNING]\
> Alpha version. Not tested extensively or documented well yet.

## Features

- Built upon and compatible with [@std/testing](https://jsr.io/@std/testing)
- Consistent interfaces across submodules

## Usage

### Command

```typescript
import * as cmd from "jsr:@chiezo/amber/cmd";
```

#### `mock`

Replace Deno.Command:

```typescript
cmd.mock();
assert(Deno.Command !== Original);
```

Return a disposable:

```typescript
assert(Symbol.dispose in cmd.mock());
```

#### `use`

Replace Deno.Command inside the callback:

```typescript
using echo = cmd.spy("echo");

cmd.use(() => {
  new Deno.Command("echo");
});
assertSpyCalls(echo, 1);
```

#### `restore`

Restore Deno.Command:

```typescript
cmd.mock();
cmd.restore();
assert(Deno.Command === Original);
```

#### `spy`

Create a spy for a command:

```typescript
using echo = cmd.spy("echo");

cmd.use(() => new Deno.Command("echo"));
assertSpyCalls(echo, 1);
```

Create multiple spies for different commands separately:

```typescript
using echo = cmd.spy("echo");

using ls = cmd.spy("ls");

cmd.use(() => {
  new Deno.Command("echo");
  assertSpyCalls(echo, 1);
  assertSpyCalls(ls, 0);
  new Deno.Command("ls");
  assertSpyCalls(echo, 1);
  assertSpyCalls(ls, 1);
});
```

#### `stub`

Create a stub for a command with a dummy by default:

```typescript
using echo = cmd.stub("echo");

cmd.mock();
await new Deno.Command("echo").output();
assertEquals(
  Deno.permissions.querySync({ name: "run", command: "echo" }).state,
  "prompt",
);
assertSpyCalls(echo, 1);
```

Create a stub for a command with a fake:

```typescript
cmd.stub(
  "echo",
  class extends Deno.Command {
    constructor(command: string | URL) {
      super(command);
      throw new Error();
    }
  },
);
cmd.mock();
assertThrows(() => new Deno.Command("echo"));
```

### File System

```typescript
import * as fs from "jsr:@chiezo/amber/fs";
```

#### `mock`

Return a disposable:

```typescript
assert(Symbol.dispose in fs.mock());
```

Replace file system functions as side effects:

```typescript
fs.mock();
assert(Deno.readTextFile !== original.readTextFile);
assert(Deno.readTextFileSync !== original.readTextFileSync);
```

#### `use`

Replace file system functions within the callback:

```typescript
fs.use(() => {
  assert(Deno.readTextFile !== original.readTextFile);
  assert(Deno.readTextFileSync !== original.readTextFileSync);
});
```

#### `restore`

Restore file system functions:

```typescript
fs.mock();
fs.restore();
assert(Deno.readTextFile === original.readTextFile);
assert(Deno.readTextFileSync === original.readTextFileSync);
```

#### `spy`

Spy file system functions:

```typescript
using spy = fs.spy("../");

await fs.use(() => Deno.readTextFile("../README.md"));
assertSpyCalls(spy.readTextFile, 1);
```

Spy multiple paths separately:

```typescript
using cwd = fs.spy(".");

using root = fs.spy("../");

await fs.use(() => Deno.readTextFile("../README.md"));
assertSpyCalls(cwd.readTextFile, 0);
assertSpyCalls(root.readTextFile, 1);
```

#### `stub`

Won't write to the original path:

```typescript
using stub = fs.stub("../");

await fs.use(() => Deno.writeTextFile("../test.txt", "amber"));
assertEquals(
  (await Deno.permissions.query({ name: "write", path: "../test.txt" }))
    .state,
  "prompt",
);
assertSpyCalls(stub.writeTextFile, 1);
```

Make the original file readable initially (readThrough):

```typescript
using stub = fs.stub("../");

await fs.use(() => Deno.readTextFile("../README.md"));
assertSpyCalls(stub.readTextFile, 1);
```

Make the updated content readable after being written:

```typescript
using _ = fs.stub("../");

await fs.use(async () => {
  await Deno.writeTextFile("../README.md", "amber");
  assertEquals(
    await Deno.readTextFile("../README.md"),
    "amber",
  );
});
```

Throw on a file that has not been written if readThrough is disabled:

```typescript
using _ = fs.stub(new URL("../", import.meta.url), { readThrough: false });

fs.use(() => assertThrows(() => Deno.readTextFileSync("../README.md")));
```

Stub multiple paths separately:

```typescript
using cwd = fs.stub(".");

using root = fs.stub("../");

await fs.use(() => Deno.readTextFile("../README.md"));
assertSpyCalls(cwd.readTextFile, 0);
assertSpyCalls(root.readTextFile, 1);
```

### Utilities

```typescript
import { all } from "jsr:@chiezo/amber/util";
```

#### `all`

Mock multiple modules at the same time:

```typescript
using echo = cmd.stub("echo");

using root = fs.stub("../");

all(cmd, fs).mock();
new Deno.Command("echo");
assertSpyCalls(echo, 1);
await Deno.readTextFile("../README.md");
assertSpyCalls(root.readTextFile, 1);
```

Use multiple modules at the same time:

```typescript
using echo = cmd.stub("echo");

using root = fs.stub("../");

await all(cmd, fs).use(async () => {
  new Deno.Command("echo");
  assertSpyCalls(echo, 1);

  await Deno.writeTextFile("../test.txt", "amber");
  assertSpyCalls(root.writeTextFile, 1);

  assertEquals(
    await Deno.readTextFile("../test.txt"),
    "amber",
  );
  assertSpyCalls(root.readTextFile, 1);
});
```

Restore multiple modules at the same time:

```typescript
all(cmd, fs).mock();
all(cmd, fs).restore();
assert(Deno.Command === original.Command);
assert(Deno.readTextFile === original.readTextFile);
```

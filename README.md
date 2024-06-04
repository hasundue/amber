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

Replace Deno.Command as a side effect:

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
const echo = cmd.spy("echo");
cmd.use(() => new Deno.Command("echo"));
assertSpyCalls(echo, 1);
```

#### `spy`

Create a spy for a command:

```typescript
const echo = cmd.spy("echo");
cmd.use(() => new Deno.Command("echo"));
assertSpyCalls(echo, 1);
```

Create multiple spies for different commands separately:

```typescript
const echo = cmd.spy("echo");
const ls = cmd.spy("ls");
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

Stub a command with the default dummy:

```typescript
const echo = cmd.stub("echo");
await cmd.use(() => new Deno.Command("echo").output());
assertEquals(
  Deno.permissions.querySync({ name: "run", command: "echo" }).state,
  "prompt",
);
assertSpyCalls(echo, 1);
```

Stub a command with a given fake:

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
cmd.use(() => assertThrows(() => new Deno.Command("echo")));
```

#### `restore`

Restore Deno.Command:

```typescript
cmd.mock();
cmd.restore();
assert(Deno.Command === Original);
```

Won't dispose spies created:

```typescript
const echo = cmd.spy("echo");
cmd.restore();
cmd.use(() => new Deno.Command("echo"));
assertSpyCalls(echo, 1);
```

#### `dispose`

Restore Deno.Command:

```typescript
cmd.mock();
cmd.dispose();
assert(Deno.Command === Original);
```

Dispose spies created:

```typescript
const echo = cmd.spy("echo");
cmd.dispose();
cmd.use(() => new Deno.Command("echo"));
assertSpyCalls(echo, 0);
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

#### `spy`

Spy file system functions:

```typescript
const spy = fs.spy(".");
await fs.use(() => Deno.readTextFile("./README.md"));
assertSpyCalls(spy.readTextFile, 1);
```

Spy multiple paths separately:

```typescript
const cwd = fs.spy(".");
const src = fs.spy("./src");
await fs.use(() => Deno.readTextFile("./README.md"));
assertSpyCalls(cwd.readTextFile, 1);
assertSpyCalls(src.readTextFile, 0);
```

#### `stub`

Won't write to the original path:

```typescript
const stub = fs.stub(".");
await fs.use(() => Deno.writeTextFile("./test.txt", "amber"));
assertEquals(
  (await Deno.permissions.query({ name: "write", path: "./test.txt" }))
    .state,
  "prompt",
);
assertSpyCalls(stub.writeTextFile, 1);
```

Make the original file readable initially (readThrough):

```typescript
const stub = fs.stub(".");
await fs.use(() => Deno.readTextFile("./README.md"));
assertSpyCalls(stub.readTextFile, 1);
```

Make the updated content readable after being written:

```typescript
fs.stub(".");
await fs.use(async () => {
  await Deno.writeTextFile("./README.md", "amber");
  assertEquals(
    await Deno.readTextFile("./README.md"),
    "amber",
  );
});
```

Throw on a file that has not been written if readThrough is disabled:

```typescript
fs.stub(".", { readThrough: false });
fs.use(() => assertThrows(() => Deno.readTextFileSync("./README.md")));
```

Stub multiple paths separately:

```typescript
const cwd = fs.stub(".");
const src = fs.stub("./src");
await fs.use(() => Deno.readTextFile("./README.md"));
assertSpyCalls(cwd.readTextFile, 1);
assertSpyCalls(src.readTextFile, 0);
```

#### `restore`

Restore file system functions:

```typescript
fs.mock();
fs.restore();
assert(Deno.readTextFile === original.readTextFile);
assert(Deno.readTextFileSync === original.readTextFileSync);
```

Won't dispose spies created:

```typescript
const spy = fs.spy(".");
fs.restore();
await fs.use(() => Deno.readTextFile("./README.md"));
assertSpyCalls(spy.readTextFile, 1);
```

#### `dispose`

Restore file system functions:

```typescript
fs.mock();
fs.dispose();
assert(Deno.readTextFile === original.readTextFile);
assert(Deno.readTextFileSync === original.readTextFileSync);
```

Dispose spies created:

```typescript
const spy = fs.spy(".");
fs.dispose();
await fs.use(() => Deno.readTextFile("./README.md"));
assertSpyCalls(spy.readTextFile, 0);
```

### Utilities

```typescript
import { all } from "jsr:@chiezo/amber/util";
```

#### `all`

Mock multiple modules simultaneously:

```typescript
const echo = cmd.stub("echo");
const root = fs.stub("../");
all(cmd, fs).mock();
new Deno.Command("echo");
assertSpyCalls(echo, 1);
await Deno.readTextFile("../README.md");
assertSpyCalls(root.readTextFile, 1);
```

Use multiple modules simultaneously:

```typescript
const echo = cmd.stub("echo");
const root = fs.stub("../");
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

Restore multiple modules simultaneously:

```typescript
all(cmd, fs).mock();
all(cmd, fs).restore();
assert(Deno.Command === original.Command);
assert(Deno.readTextFile === original.readTextFile);
```

Dispose multiple modules simultaneously:

```typescript
const echo = cmd.spy("echo");
const root = fs.spy("../");
all(cmd, fs).mock();
all(cmd, fs).dispose();
new Deno.Command("echo");
assertSpyCalls(echo, 0);
await Deno.readTextFile("../README.md");
assertSpyCalls(root.readTextFile, 0);
```

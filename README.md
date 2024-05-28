# :sauropod: amber

A library for mocking [Deno APIs](https://deno.land/api) with ease.

> [!WARNING]\
> Alpha version. Not tested extensively or documented well yet.

## Features

- Compatible with [@std/testing](https://jsr.io/@std/testing)
- Consistent interfaces across submodules

## Usage

### Command

```typescript
import * as cmd from "jsr:@chiezo/amber/cmd";
```

#### `mock`

```typescript
const Original = Deno.Command;

it("should return a disposable", () => {
  assert(Symbol.dispose in cmd.mock());
});

it("should replace Deno.Command", () => {
  cmd.mock();
  assert(Deno.Command !== Original);
});
```

#### `use`

```typescript
it("should replace Deno.Command within the callback", () => {
  using echo = cmd.spy("echo");
  cmd.use(() => {
    new Deno.Command("echo");
  });
  assertSpyCalls(echo, 1);
});
```

#### `spy`

```typescript
it("should create a spy for a command", () => {
  using echo = cmd.spy("echo");
  cmd.use(() => new Deno.Command("echo"));
  assertSpyCalls(echo, 1);
});
```

#### `stub`

```typescript
it("should create a stub for a command with a default dummy", async () => {
  using echo = cmd.stub("echo");
  cmd.mock();
  await new Deno.Command("echo").output();
  assertEquals(
    Deno.permissions.querySync({ name: "run", command: "echo" }).state,
    "prompt",
  );
  assertSpyCalls(echo, 1);
});

it("should create a stub for a command with a given fake", () => {
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
});
```

#### `restore`

```typescript
const Original = Deno.Command;

it("should restore Deno.Command", () => {
  cmd.mock();
  cmd.restore();
  assert(Deno.Command === Original);
});
```

### File System

```typescript
import * as fs from "jsr:@chiezo/amber/fs";
```

#### `mock`

```typescript
const Original = { ...Deno };

it("should return a disposable", () => {
  assert(Symbol.dispose in fs.mock());
});

it("should replace file system functions", () => {
  fs.mock();
  assert(Deno.readTextFile !== original.readTextFile);
  assert(Deno.readTextFileSync !== original.readTextFileSync);
  // ...and others
});
```

#### `use`

```typescript
const original = { ...Deno };

it("should replace file system functions within the callback", () => {
  fs.use(() => {
    assert(Deno.readTextFile !== original.readTextFile);
    assert(Deno.readTextFileSync !== original.readTextFileSync);
    // ...and others
  });
});
```

#### `spy`

```typescript
it("should spy file system functions", async () => {
  using spy = fs.spy(new URL("../", import.meta.url));
  fs.mock();
  await Deno.readTextFile(new URL("../README.md", import.meta.url));
  assertSpyCalls(spy.readTextFile, 1);
});

it("should be able to spy multiple paths separately", async () => {
  using cwd = fs.spy(new URL(".", import.meta.url));
  using root = fs.spy(new URL("../", import.meta.url));
  fs.mock();
  await Deno.readTextFile(new URL("../README.md", import.meta.url));
  assertSpyCalls(cwd.readTextFile, 0);
  assertSpyCalls(root.readTextFile, 1);
});
```

#### `stub`

```typescript
it("should not write to the original path", async () => {
  using stub = fs.stub(new URL("../", import.meta.url));
  fs.mock();
  await Deno.writeTextFile(
    new URL("../test.txt", import.meta.url),
    "amber",
  );
  assertEquals(
    Deno.permissions.querySync({
      name: "write",
      path: new URL("../test.txt", import.meta.url),
    }).state,
    "prompt",
  );
  assertSpyCalls(stub.writeTextFile, 1);
});

it("should allow original files to be read initially (readThrough)", async () => {
  using stub = fs.stub(new URL("../", import.meta.url));
  fs.mock();
  await Deno.readTextFile(new URL("../README.md", import.meta.url));
  assertSpyCalls(stub.readTextFile, 1);
});

it("should let the updated file be read after being written", async () => {
  using _ = fs.stub(new URL("../", import.meta.url));
  fs.mock();
  await Deno.writeTextFile(
    new URL("../README.md", import.meta.url),
    "amber",
  );
  assertEquals(
    await Deno.readTextFile(new URL("../README.md", import.meta.url)),
    "amber",
  );
});

it("should throw on a file that has not been written if readThrough is disabled", () => {
  using _ = fs.stub(new URL("../", import.meta.url), { readThrough: false });
  fs.mock();
  assertThrows(() =>
    Deno.readTextFileSync(new URL("../README.md", import.meta.url))
  );
});

it("should be able to stub multiple paths separately", async () => {
  using cwd = fs.stub(new URL(".", import.meta.url));
  using root = fs.stub(new URL("../", import.meta.url));
  fs.mock();
  await Deno.readTextFile(new URL("../README.md", import.meta.url));
  assertSpyCalls(cwd.readTextFile, 0);
  assertSpyCalls(root.readTextFile, 1);
});
```

#### `restore`

```typescript
const original = { ...Deno };

it("should restore the Deno namespace", () => {
  fs.mock();
  fs.restore();
  assert(Deno.readTextFile === original.readTextFile);
  assert(Deno.readTextFileSync === original.readTextFileSync);
  // ...and others
});
```

### Utilities

```typescript
import { all } from "jsr:@chiezo/amber";
```

#### `all`

```typescript
const original = { ...Deno };

describe("mock", () => {
  it("should mock multiple modules at the same time", () => {
    all(cmd, fs).mock();
    assert(Deno.Command !== original.Command);
    assert(Deno.readTextFile !== original.readTextFile);
  });
});

describe("use", () => {
  it("should use multiple modules at the same time", () => {
    all(cmd, fs).use(() => {
      assert(Deno.Command !== original.Command);
      assert(Deno.readTextFile !== original.readTextFile);
    });
  });
});

describe("restore", () => {
  it("should restore multiple modules at the same time", () => {
    all(cmd, fs).mock();
    all(cmd, fs).restore();
    assert(Deno.Command === original.Command);
    assert(Deno.readTextFile === original.readTextFile);
  });
});
```

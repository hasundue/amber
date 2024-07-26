import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { afterAll, afterEach, beforeAll, describe, it } from "@std/testing/bdd";
import { assertSpyCalls } from "@std/testing/mock";
import * as fs from "./fs.ts";

describe("mock", () => {
  const original = { ...Deno };

  afterEach(() => fs.dispose());

  it("should replace file system functions as side effects", () => {
    fs.mock();
    assert(Deno.readTextFile !== original.readTextFile);
    assert(Deno.readTextFileSync !== original.readTextFileSync);
  });

  it("should stub the current working directory by default", async () => {
    fs.mock();
    await fs.use(() => Deno.writeTextFile("./test.txt", "amber"));
    assertRejects(() => Deno.readTextFile("./test.txt"));
  });
});

describe("use", () => {
  const original = { ...Deno };

  afterEach(() => fs.dispose());

  it("should replace file system functions within the callback", () => {
    fs.use(() => {
      assert(Deno.readTextFile !== original.readTextFile);
      assert(Deno.readTextFileSync !== original.readTextFileSync);
    });
  });
});

describe("spy", () => {
  beforeAll(() => {
    Deno.chdir(new URL("../", import.meta.url));
  });
  afterEach(() => fs.dispose());

  it("should spy file system functions", async () => {
    const spy = fs.spy(".");
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(spy.readTextFile, 1);
  });

  it("should spy multiple paths separately", async () => {
    const cwd = fs.spy(".");
    const src = fs.spy("./src");
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(cwd.readTextFile, 1);
    assertSpyCalls(src.readTextFile, 0);
  });

  it("should accept a URL", async () => {
    const spy = fs.spy(new URL("..", import.meta.url));
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(spy.readTextFile, 1);
  });
});

describe("stub", () => {
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL("../", import.meta.url));
  });
  afterEach(() => fs.dispose());
  afterAll(() => Deno.chdir(cwd));

  it("should not write to the original path", async () => {
    const stub = fs.stub("./test.txt");
    await fs.use(() => Deno.writeTextFile("./test.txt", "amber"));
    assertEquals(
      (await Deno.permissions.query({ name: "write", path: "./test.txt" }))
        .state,
      "prompt",
    );
    assertSpyCalls(stub.writeTextFile, 1);
  });

  it("should make the original file readable initially (readThrough)", async () => {
    const stub = fs.stub(".");
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(stub.readTextFile, 1);
  });

  it("should make the updated content readable after being written", async () => {
    fs.stub(".");
    await fs.use(async () => {
      await Deno.writeTextFile("./README.md", "amber");
      assertEquals(
        await Deno.readTextFile("./README.md"),
        "amber",
      );
    });
  });

  it("should throw on a file that has not been written if readThrough is disabled", () => {
    fs.stub(".", { readThrough: false });
    fs.use(() => assertThrows(() => Deno.readTextFileSync("./README.md")));
  });

  it("should stub multiple paths separately", async () => {
    const cwd = fs.stub(".");
    const src = fs.stub("./src");
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(cwd.readTextFile, 1);
    assertSpyCalls(src.readTextFile, 0);
  });
});

describe("restore", () => {
  const original = { ...Deno };
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL("../", import.meta.url));
  });
  afterEach(() => fs.dispose());
  afterAll(() => Deno.chdir(cwd));

  it("should restore file system functions", () => {
    fs.mock();
    fs.restore();
    assert(Deno.readTextFile === original.readTextFile);
    assert(Deno.readTextFileSync === original.readTextFileSync);
  });

  it("should not dispose spies created", async () => {
    const spy = fs.spy(".");
    fs.restore();
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(spy.readTextFile, 1);
  });
});

describe("dispose", () => {
  const original = { ...Deno };
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL("../", import.meta.url));
  });
  afterAll(() => Deno.chdir(cwd));

  it("should restore file system functions", () => {
    fs.mock();
    fs.dispose();
    assert(Deno.readTextFile === original.readTextFile);
    assert(Deno.readTextFileSync === original.readTextFileSync);
  });

  it("should dispose spies created", async () => {
    const spy = fs.spy(".");
    fs.dispose();
    await fs.use(() => Deno.readTextFile("./README.md"));
    assertSpyCalls(spy.readTextFile, 0);
  });
});

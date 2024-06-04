import { assert, assertEquals, assertThrows } from "@std/assert";
import { afterAll, afterEach, beforeAll, describe, it } from "@std/testing/bdd";
import { assertSpyCalls } from "@std/testing/mock";
import * as fs from "./fs.ts";

describe("mock", () => {
  const original = { ...Deno };

  afterEach(() => {
    fs.restore();
  });

  it("should return a disposable", () => {
    assert(Symbol.dispose in fs.mock());
  });

  it("should replace file system functions as side effects", () => {
    fs.mock();
    assert(Deno.readTextFile !== original.readTextFile);
    assert(Deno.readTextFileSync !== original.readTextFileSync);
  });
});

describe("use", () => {
  const original = { ...Deno };

  it("should replace file system functions within the callback", () => {
    fs.use(() => {
      assert(Deno.readTextFile !== original.readTextFile);
      assert(Deno.readTextFileSync !== original.readTextFileSync);
    });
  });
});

describe("restore", () => {
  const original = { ...Deno };

  it("should restore file system functions", () => {
    fs.mock();
    fs.restore();
    assert(Deno.readTextFile === original.readTextFile);
    assert(Deno.readTextFileSync === original.readTextFileSync);
  });
});

describe("spy", () => {
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL(".", import.meta.url));
  });

  afterAll(() => {
    Deno.chdir(cwd);
  });

  it("should spy file system functions", async () => {
    using spy = fs.spy("../");
    await fs.use(() => Deno.readTextFile("../README.md"));
    assertSpyCalls(spy.readTextFile, 1);
  });

  it("should spy multiple paths separately", async () => {
    using cwd = fs.spy(".");
    using root = fs.spy("../");
    await fs.use(() => Deno.readTextFile("../README.md"));
    assertSpyCalls(cwd.readTextFile, 0);
    assertSpyCalls(root.readTextFile, 1);
  });
});

describe("stub", () => {
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL(".", import.meta.url));
  });

  afterAll(() => {
    Deno.chdir(cwd);
  });

  it("should not write to the original path", async () => {
    using stub = fs.stub("../");
    await fs.use(() => Deno.writeTextFile("../test.txt", "amber"));
    assertEquals(
      (await Deno.permissions.query({ name: "write", path: "../test.txt" }))
        .state,
      "prompt",
    );
    assertSpyCalls(stub.writeTextFile, 1);
  });

  it("should make the original file readable initially (readThrough)", async () => {
    using stub = fs.stub("../");
    await fs.use(() => Deno.readTextFile("../README.md"));
    assertSpyCalls(stub.readTextFile, 1);
  });

  it("should make the updated content readable after being written", async () => {
    using _ = fs.stub("../");
    await fs.use(async () => {
      await Deno.writeTextFile("../README.md", "amber");
      assertEquals(
        await Deno.readTextFile("../README.md"),
        "amber",
      );
    });
  });

  it("should throw on a file that has not been written if readThrough is disabled", () => {
    using _ = fs.stub(new URL("../", import.meta.url), { readThrough: false });
    fs.use(() => assertThrows(() => Deno.readTextFileSync("../README.md")));
  });

  it("should stub multiple paths separately", async () => {
    using cwd = fs.stub(".");
    using root = fs.stub("../");
    await fs.use(() => Deno.readTextFile("../README.md"));
    assertSpyCalls(cwd.readTextFile, 0);
    assertSpyCalls(root.readTextFile, 1);
  });
});

import { assert, assertThrows } from "@std/assert";
import { afterAll, afterEach, beforeAll, describe, it } from "@std/testing/bdd";
import { assertSpyCall, assertSpyCalls } from "@std/testing/mock";
import type { FileSystemSpy } from "./fs.ts";
import * as fs from "./fs.ts";

describe("mock", () => {
  const original = { ...Deno };

  afterEach(() => {
    fs.restore();
  });

  it("should return a disposable", () => {
    assert(Symbol.dispose in fs.mock());
  });

  it("should replace file system functions", () => {
    fs.mock();
    assert(Deno.readTextFile !== original.readTextFile);
    assert(Deno.readTextFileSync !== original.readTextFileSync);
  });
});

describe("use", () => {
  it("should be callable with a callback", () => {
    fs.use(() => {});
  });
});

describe("restore", () => {
  const Original = Deno.readTextFile;
  it("should restore the Deno namespace", () => {
    fs.mock();
    fs.restore();
    assert(Deno.readTextFile === Original);
  });
});

describe("spy", () => {
  afterEach(() => {
    fs.restore();
  });

  it("should spy file system functions", async () => {
    using spy = fs.spy(new URL("../", import.meta.url));
    fs.mock();
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(spy.readTextFile, 1);
  });

  it("should be able to spy multiple paths", async () => {
    using cwd = fs.spy(new URL(".", import.meta.url));
    using root = fs.spy(new URL("../", import.meta.url));
    fs.mock();
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(cwd.readTextFile, 0);
    assertSpyCalls(root.readTextFile, 1);
  });
});

describe("stub", () => {
  afterEach(() => {
    fs.restore();
  });

  it("should stub file system functions with readThrough by default", async () => {
    using stub = fs.stub(new URL("../", import.meta.url));
    fs.mock();
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(stub.readTextFile, 1);
  });

  it("should throws for a non-existent path if readThrough is disabled", () => {
    using _ = fs.stub(new URL("../", import.meta.url), { readThrough: false });
    fs.mock();
    assertThrows(() =>
      Deno.readTextFileSync(new URL("../README.md", import.meta.url))
    );
  });

  it("should be able to stub multiple paths", async () => {
    using cwd = fs.stub(new URL(".", import.meta.url));
    using root = fs.stub(new URL("../", import.meta.url));
    fs.mock();
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(cwd.readTextFile, 0);
    assertSpyCalls(root.readTextFile, 1);
  });
});

describe("FileSystemSpy", () => {
  let spy: FileSystemSpy;

  beforeAll(() => {
    spy = fs.spy(new URL("../", import.meta.url));
    fs.mock();
  });

  afterAll(() => {
    spy[Symbol.dispose]();
    fs.restore();
  });

  it("should be testable with assertSpyCalls", async () => {
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(spy.readTextFile, 1);
  });

  it("should be testable with assertSpyCall", async () => {
    const url = new URL("../README.md", import.meta.url);
    await Deno.readTextFile(url);
    assertSpyCall(spy.readTextFile, 0, { args: [url] });
  });
});

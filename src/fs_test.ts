import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCall, assertSpyCalls } from "@std/testing/mock";
import type { FileSystemSpy } from "./fs.ts";
import * as fs from "./fs.ts";

describe("restore", () => {
  it("should be callable", () => {
    fs.restore();
  });
});

describe("stub", () => {
  it("should be callable with an URL", () => {
    fs.stub(new URL("file:///"));
  });
});

describe("mock", () => {
  it("should return a disposable", () => {
    using stack = new DisposableStack();
    stack.use(fs.mock());
  });
});

describe("use", () => {
  it("should be callable with a callback", () => {
    fs.use(() => {});
  });
});

describe("FileSystemSpy", () => {
  let root: FileSystemSpy;

  beforeEach(() => {
    root = fs.spy(new URL("../", import.meta.url));
    fs.mock();
  });

  afterEach(() => {
    fs.restore();
  });

  it("should be testable with assertSpyCalls", async () => {
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(root, 1);
  });

  it("should be testable with assertSpyCall", async () => {
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCall(root, 0, { self: Deno.readTextFile, args: ["../README.md"] });
  });
});

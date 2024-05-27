import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCall, assertSpyCalls } from "@std/testing/mock";
import type { FileSystemSpy } from "./fs.ts";
import * as fs from "./fs.ts";
import { assert } from "@std/assert";

describe("restore", () => {
  it("should be callable", () => {
    fs.restore();
  });
});

describe("mock", () => {
  afterEach(() => {
    fs.restore();
  });

  it("should return a disposable", () => {
    assert(Symbol.dispose in fs.mock());
  });
});

describe("use", () => {
  it("should be callable with a callback", () => {
    fs.use(() => {});
  });
});

describe.only("stub", () => {
  it("should create a FileSystemStub", async () => {
    const stub = fs.stub(new URL("../", import.meta.url));
    fs.mock();
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(stub.readTextFile, 1);
  });
});

describe("FileSystemSpy", () => {
  let spy: FileSystemSpy;

  beforeEach(() => {
    spy = fs.spy(new URL("../", import.meta.url));
    fs.mock();
  });

  afterEach(() => {
    fs.restore();
  });

  it("should be testable with assertSpyCalls", async () => {
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCalls(spy.readTextFile, 1);
  });

  it("should be testable with assertSpyCall", async () => {
    await Deno.readTextFile(new URL("../README.md", import.meta.url));
    assertSpyCall(spy.readTextFile, 0, { args: ["../README.md"] });
  });
});

import { assert } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { all, cmd, fs } from "./mod.ts";

describe("all", () => {
  it("should be a function", () => {
    assert(typeof all === "function");
  });
});

describe("cmd", () => {
  it("should be an object", () => {
    assert(typeof cmd === "object");
  });
});

describe("fs", () => {
  it("should be an object", () => {
    assert(typeof fs === "object");
  });
});

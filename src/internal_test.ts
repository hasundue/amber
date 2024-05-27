import { assert, assertFalse } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { isUnder } from "./internal.ts";

describe("URLs", () => {
  it("should return true if the first path is under the second path", () =>
    assert(
      isUnder(
        new URL("../README.md", import.meta.url),
        new URL("..", import.meta.url),
      ),
    ));

  it("should return false if the first path is not under the second path", () =>
    assertFalse(
      isUnder(
        new URL("../README.md", import.meta.url),
        new URL(".", import.meta.url),
      ),
    ));
});

describe("isUnder - string", () => {
  it("should return true if the first path is under the second path", () =>
    assert(
      isUnder(
        "../README.md",
        "..",
      ),
    ));

  it("should return false if the first path is not under the second path", () =>
    assertFalse(
      isUnder(
        "../README.md",
        ".",
      ),
    ));
});

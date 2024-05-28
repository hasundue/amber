import { assert, assertEquals, assertFalse } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { isUnder, relative } from "./internal.ts";

describe("relative", () => {
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL(".", import.meta.url));
  });

  afterAll(() => {
    Deno.chdir(cwd);
  });

  it("should return the relative path from the first path to the second path", () => {
    assertEquals(
      relative(
        new URL("..", import.meta.url),
        new URL("../README.md", import.meta.url),
      ),
      "README.md",
    );
    assertEquals(
      relative(
        "..",
        "../README.md",
      ),
      "README.md",
    );
    assertEquals(
      relative(
        "..",
        new URL("../README.md", import.meta.url),
      ),
      "README.md",
    );
    assertEquals(
      relative(
        new URL("..", import.meta.url),
        "../README.md",
      ),
      "README.md",
    );
  });
});

describe("isUnder", () => {
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL(".", import.meta.url));
  });

  afterAll(() => {
    Deno.chdir(cwd);
  });

  it("should return true if the first path is under the second path", () => {
    assert(
      isUnder(
        new URL("../README.md", import.meta.url),
        new URL("..", import.meta.url),
      ),
    );
    assert(
      isUnder(
        "../README.md",
        "..",
      ),
    );
    assert(
      isUnder(
        "../README.md",
        new URL("..", import.meta.url),
      ),
    );
    assert(
      isUnder(
        new URL("../README.md", import.meta.url),
        "..",
      ),
    );
  });

  it("should return false if the first path is not under the second path", () => {
    assertFalse(
      isUnder(
        new URL("../README.md", import.meta.url),
        new URL(".", import.meta.url),
      ),
    );
    assertFalse(
      isUnder(
        "../README.md",
        ".",
      ),
    );
    assertFalse(
      isUnder(
        "../README.md",
        new URL(".", import.meta.url),
      ),
    );
    assert(
      isUnder(
        new URL("../README.md", import.meta.url),
        "..",
      ),
    );
  });
});

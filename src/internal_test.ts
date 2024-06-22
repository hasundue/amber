import { assert, assertEquals } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { relative, tryCatchFinally } from "./internal.ts";

describe("tryCatchFinally", () => {
  it("should execute the function and return the result", () => {
    assertEquals(
      tryCatchFinally(() => 1),
      1,
    );
  });

  it("should handle the error if the function is synchronous", () => {
    assertEquals(
      tryCatchFinally(
        () => {
          throw new Error("error");
        },
        (error) => error.message,
      ),
      "error",
    );
  });

  it("should handle the error if the function is asynchronous", async () => {
    assertEquals(
      await tryCatchFinally(
        () => {
          throw new Error("error");
          // deno-lint-ignore no-unreachable
          return Promise.resolve("OK");
        },
        (error) => Promise.resolve(error.message),
      ),
      "error",
    );
  });

  it("should execute the cleanup function", () => {
    let cleanup = false;
    tryCatchFinally(
      () => 1,
      undefined,
      () => {
        cleanup = true;
      },
    );
    assert(cleanup);
  });

  it("should handle the error if the function is synchronous and execute the cleanup function", () => {
    let cleanup = false;
    tryCatchFinally(
      () => {
        throw new Error("error");
      },
      (error) => error.message,
      () => {
        cleanup = true;
      },
    );
    assert(cleanup);
  });

  it("should handle the error if the function is asynchronous and execute the cleanup function", async () => {
    let cleanup = false;
    await tryCatchFinally(
      () => {
        throw new Error("error");
        // deno-lint-ignore no-unreachable
        return Promise.resolve("OK");
      },
      (error) => Promise.resolve(error.message),
      () => {
        cleanup = true;
      },
    );
    assert(cleanup);
  });
});

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

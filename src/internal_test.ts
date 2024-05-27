import { assert, assertFalse } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { isUnder } from "./internal.ts";

describe("isUnder", () => {
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

  describe("strings", () => {
    let cwd: string;

    beforeAll(() => {
      cwd = Deno.cwd();
      Deno.chdir(new URL(".", import.meta.url));
    });

    afterAll(() => {
      Deno.chdir(cwd);
    });

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

  describe("string - URL", () => {
    let cwd: string;

    beforeAll(() => {
      cwd = Deno.cwd();
      Deno.chdir(new URL(".", import.meta.url));
    });

    afterAll(() => {
      Deno.chdir(cwd);
    });

    it("should return true if the first path is under the second path", () =>
      assert(
        isUnder(
          "../README.md",
          new URL("..", import.meta.url),
        ),
      ));

    it("should return false if the first path is not under the second path", () =>
      assertFalse(
        isUnder(
          "../README.md",
          new URL(".", import.meta.url),
        ),
      ));
  });

  describe("URL - string", () => {
    let cwd: string;

    beforeAll(() => {
      cwd = Deno.cwd();
      Deno.chdir(new URL(".", import.meta.url));
    });

    afterAll(() => {
      Deno.chdir(cwd);
    });

    it("should return true if the first path is under the second path", () =>
      assert(
        isUnder(
          new URL("../README.md", import.meta.url),
          "..",
        ),
      ));

    it("should return false if the first path is not under the second path", () =>
      assertFalse(
        isUnder(
          new URL("../README.md", import.meta.url),
          ".",
        ),
      ));
  });
});

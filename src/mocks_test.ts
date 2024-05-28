import { assert } from "@std/assert";
import { afterEach, describe, it } from "@std/testing/bdd";
import * as cmd from "./cmd.ts";
import * as fs from "./fs.ts";
import { all } from "./mocks.ts";

describe("all", () => {
  const original = { ...Deno };

  afterEach(() => {
    all(cmd, fs).restore();
  });

  describe("mock", () => {
    it("should mock all modules", () => {
      all(cmd, fs).mock();
      assert(Deno.Command !== original.Command);
      assert(Deno.readTextFile !== original.readTextFile);
    });
  });

  describe("use", () => {
    it("should use all modules", () => {
      all(cmd, fs).use(() => {
        assert(Deno.Command !== original.Command);
        assert(Deno.readTextFile !== original.readTextFile);
      });
    });
  });

  describe("restore", () => {
    it("should restore all modules", () => {
      all(cmd, fs).mock();
      all(cmd, fs).restore();
      assert(Deno.Command === original.Command);
      assert(Deno.readTextFile === original.readTextFile);
    });
  });
});

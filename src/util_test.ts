import { assert } from "@std/assert";
import { afterEach, describe, it } from "@std/testing/bdd";
import * as cmd from "./cmd.ts";
import * as fs from "./fs.ts";
import { all } from "./util.ts";

describe("all", () => {
  const original = { ...Deno };

  afterEach(() => {
    all(cmd, fs).restore();
  });

  describe("mock", () => {
    it("should mock multiple modules at the same time", () => {
      all(cmd, fs).mock();
      assert(Deno.Command !== original.Command);
      assert(Deno.readTextFile !== original.readTextFile);
    });
  });

  describe("use", () => {
    it("should use multiple modules at the same time", () => {
      all(cmd, fs).use(() => {
        assert(Deno.Command !== original.Command);
        assert(Deno.readTextFile !== original.readTextFile);
      });
    });
  });

  describe("restore", () => {
    it("should restore multiple modules at the same time", () => {
      all(cmd, fs).mock();
      all(cmd, fs).restore();
      assert(Deno.Command === original.Command);
      assert(Deno.readTextFile === original.readTextFile);
    });
  });
});

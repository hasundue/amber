import { assert } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import * as cmd from "./cmd.ts";
import { all } from "./mocks.ts";

describe("all", () => {
  const CommandOriginal = Deno.Command;

  it("should mock all", () => {
    all(cmd).use();
    assert(Deno.Command !== CommandOriginal);
  });
});

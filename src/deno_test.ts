import { describe, it } from "@std/testing/bdd";
import * as deno from "./deno.ts";
import { assert } from "@std/assert";

describe("use", () => {
  const Original = Deno;

  it("should replace Deno", () => {
    deno.use();
    assert(Deno !== Original);
  });
});

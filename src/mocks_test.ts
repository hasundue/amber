import { describe, it } from "@std/testing/bdd";
import { CommandMock } from "./cmd.ts";
import { all } from "./mocks.ts";
import { assert } from "@std/assert";

describe("all", () => {
  it("should mock all", () => {
    all(CommandMock).use();
    assert("use" in Deno.Command);
  });
});

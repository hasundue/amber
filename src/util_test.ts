import { assert, assertEquals } from "@std/assert";
import { afterAll, afterEach, beforeAll, describe, it } from "@std/testing/bdd";
import { assertSpyCalls } from "@std/testing/mock";
import * as cmd from "./cmd.ts";
import * as fs from "./fs.ts";
import { all } from "./util.ts";

describe("all", () => {
  const original = { ...Deno };
  let cwd: string;

  beforeAll(() => {
    cwd = Deno.cwd();
    Deno.chdir(new URL(".", import.meta.url));
  });

  afterEach(() => {
    all(cmd, fs).restore();
  });

  afterAll(() => {
    Deno.chdir(cwd);
  });

  it("should mock multiple modules at the same time", async () => {
    using echo = cmd.stub("echo");
    using root = fs.stub("../");

    all(cmd, fs).mock();

    new Deno.Command("echo");
    assertSpyCalls(echo, 1);

    await Deno.readTextFile("../README.md");
    assertSpyCalls(root.readTextFile, 1);
  });

  it("should use multiple modules at the same time", async () => {
    using echo = cmd.stub("echo");
    using root = fs.stub("../");

    await all(cmd, fs).use(async () => {
      new Deno.Command("echo");
      assertSpyCalls(echo, 1);

      await Deno.writeTextFile("../test.txt", "amber");
      assertSpyCalls(root.writeTextFile, 1);

      assertEquals(
        await Deno.readTextFile("../test.txt"),
        "amber",
      );
      assertSpyCalls(root.readTextFile, 1);
    });
  });

  it("should restore multiple modules at the same time", () => {
    all(cmd, fs).mock();
    all(cmd, fs).restore();
    assert(Deno.Command === original.Command);
    assert(Deno.readTextFile === original.readTextFile);
  });
});

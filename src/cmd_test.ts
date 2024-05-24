import { assertExists, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { assertSpyCallArg, assertSpyCalls } from "@std/testing/mock";
import { spy, stub, use } from "./cmd.ts";

describe("use", () => {
  it("should be able to replace Deno.Command", () => {
    use(() => {
      const echo = new Deno.Command("echo");
      assertExists(echo);
    });
  });
})

describe("spy", () => {
  it("should create a spy for a command", () => {
    using cat = spy("cat");
    assertExists(cat);
  });
});

describe("CommandSpy", () => {
  it("should be examined with assertSpyCalls", () => {
    using cat = spy("cat");
    use(() => {
      assertSpyCalls(cat, 0);
      new Deno.Command("cat");
      assertSpyCalls(cat, 1);
      new Deno.Command("cat");
      assertSpyCalls(cat, 2);
    });
  });

  it("should distinguish between different commands", () => {
    using cat = spy("cat");
    using echo = spy("echo");
    use(() => {
      assertSpyCalls(cat, 0);
      assertSpyCalls(echo, 0);
      new Deno.Command("cat");
      assertSpyCalls(cat, 1);
      assertSpyCalls(echo, 0);
      new Deno.Command("echo");
      assertSpyCalls(cat, 1);
      assertSpyCalls(echo, 1);
    });
  });

  it("should be examined with assertSpyCallArg", () => {
    using echo = spy("echo");
    use(() => {
      new Deno.Command("echo");
      assertSpyCallArg(echo, 0, 1, undefined);
      new Deno.Command("echo", { cwd: "/tmp" });
      assertSpyCallArg(echo, 1, 1, { cwd: "/tmp" });
    });
  });
});

describe("stub", () => {
  it("should create a stub for a command with a dummy by default", async () => {
    using echo = stub("echo");
    await use(async () => {
      await new Deno.Command("echo").output();
      assertSpyCalls(echo, 1);
    });
  });

  it("should create a stub for a command with a fake", () => {
    using echo = stub(
      "echo",
      class extends Deno.Command {
        constructor(
          command: string | URL,
          options?: Deno.CommandOptions,
        ) {
          super(command, options);
          throw new Error();
        }
      },
    );
    assertExists(echo);
    assertThrows(() => use(() => new Deno.Command("echo")));
  });
});

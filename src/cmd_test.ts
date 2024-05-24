import { assertExists, assertThrows } from "@std/assert";
import { afterAll, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg, assertSpyCalls } from "@std/testing/mock";
import { MockCommand, spy, stub } from "./cmd.ts";

describe("MockCommand", () => {
  const original = Deno.Command;
  afterAll(() => {
    Deno.Command = original;
  });
  it("should be able to replace Deno.Command", () => {
    Deno.Command = MockCommand;
    const echo = new Deno.Command("echo");
    assertExists(echo);
  });
});

describe("spy", () => {
  it("should create a spy for a command", () => {
    using cat = spy("cat");
    assertExists(cat);
  });
});

describe("CommandSpy", () => {
  it("should be examined with assertSpyCalls", () => {
    using cat = spy("cat");
    assertSpyCalls(cat, 0);
    new MockCommand("cat");
    assertSpyCalls(cat, 1);
    new MockCommand("cat");
    assertSpyCalls(cat, 2);
  });

  it("should distinguish between different commands", () => {
    using cat = spy("cat");
    using echo = spy("echo");
    assertSpyCalls(cat, 0);
    assertSpyCalls(echo, 0);
    new MockCommand("cat");
    assertSpyCalls(cat, 1);
    assertSpyCalls(echo, 0);
    new MockCommand("echo");
    assertSpyCalls(cat, 1);
    assertSpyCalls(echo, 1);
  });

  it("should be examined with assertSpyCallArg", () => {
    using echo = spy("echo");
    new MockCommand("echo");
    assertSpyCallArg(echo, 0, 1, undefined);
    new MockCommand("echo", { cwd: "/tmp" });
    assertSpyCallArg(echo, 1, 1, { cwd: "/tmp" });
  });
});

describe("stub", () => {
  it("should create a stub for a command with a dummy by default", async () => {
    using echo = stub("echo");
    await new MockCommand("echo").output();
    assertSpyCalls(echo, 1);
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
    assertThrows(() => new MockCommand("echo"));
  });
});

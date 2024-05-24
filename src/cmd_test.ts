import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg, assertSpyCalls } from "@std/testing/mock";
import { type CommandSpy, type CommandStub, MockCommand } from "./cmd.ts";

describe("MockCommand", () => {
  const Original = Deno.Command;

  afterEach(() => {
    Deno.Command = Original;
  });

  it("should be a constructor of Deno.Command", () => {
    assertInstanceOf(new MockCommand("echo"), Deno.Command);
  });

  it("should be able to replace Deno.Command", () => {
    Deno.Command = MockCommand;
    assertInstanceOf(new Deno.Command("echo"), Original);
  });

  describe("spy", () => {
    it("should create a spy for a command", () => {
      using echo = MockCommand.spy("echo");
      new MockCommand("echo");
      assertSpyCalls(echo, 1);
    });
  });

  describe("stub", () => {
    it("should create a stub for a command with a dummy by default", async () => {
      using echo = MockCommand.stub("echo");
      await new MockCommand("echo").output();
      assertSpyCalls(echo, 1);
    });

    it("should create a stub for a command with a fake", () => {
      using echo = MockCommand.stub(
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

  describe("use", () => {
    it("should replace Deno.Command inside the callback", () => {
      using echo = MockCommand.spy("echo");
      MockCommand.use(() => {
        new Deno.Command("echo");
      });
      assertSpyCalls(echo, 1);
    });
  });
});

describe("CommandSpy", () => {
  let echo: CommandSpy<"echo">;

  beforeEach(() => {
    echo = MockCommand.spy("echo");
  });

  it("should be tested with assertSpyCalls", () => {
    assertSpyCalls(echo, 0);
    new MockCommand("echo");
    assertSpyCalls(echo, 1);
    new MockCommand("echo");
    assertSpyCalls(echo, 2);
  });

  it("should be tested with assertSpyCallArg", () => {
    new MockCommand("echo");
    assertSpyCallArg(echo, 0, 1, undefined);
    new MockCommand("echo", { cwd: "/tmp" });
    assertSpyCallArg(echo, 1, 1, { cwd: "/tmp" });
  });

  it("should distinguish between different commands", () => {
    const ls = MockCommand.spy("ls");
    new MockCommand("echo");
    assertSpyCalls(echo, 1);
    assertSpyCalls(ls, 0);
    new MockCommand("ls");
    assertSpyCalls(echo, 1);
    assertSpyCalls(ls, 1);
  });
});

describe("CommandStub", () => {
  let echo: CommandStub<"echo">;

  beforeEach(() => {
    echo = MockCommand.stub("echo");
  });

  it("should not try to execute the command", async () => {
    await new MockCommand("echo").output();
    const { state } = await Deno.permissions.query({
      name: "run",
      command: "echo",
    });
    assertEquals(state, "prompt");
    assertSpyCalls(echo, 1);
  });
});

import {
  assert,
  assertEquals,
  assertExists,
  assertFalse,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg, assertSpyCalls } from "@std/testing/mock";
import { type CommandSpy, type CommandStub, CommandMock } from "./cmd.ts";

describe("CommandMock", () => {
  const Original = Deno.Command;

  afterEach(() => {
    Deno.Command = Original;
  });

  it("should be a constructor of Deno.Command", () => {
    assertInstanceOf(new CommandMock("echo"), Deno.Command);
  });

  it("should be able to replace Deno.Command", () => {
    Deno.Command = CommandMock;
    assertInstanceOf(new Deno.Command("echo"), Original);
  });

  describe("spy", () => {
    it("should create a spy for a command", () => {
      using echo = CommandMock.spy("echo");
      new CommandMock("echo");
      assertSpyCalls(echo, 1);
    });
  });

  describe("stub", () => {
    it("should create a stub for a command with a dummy by default", async () => {
      using echo = CommandMock.stub("echo");
      await new CommandMock("echo").output();
      assertSpyCalls(echo, 1);
    });

    it("should create a stub for a command with a fake", () => {
      using echo = CommandMock.stub(
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
      assertThrows(() => new CommandMock("echo"));
    });
  });

  describe("use", () => {
    afterEach(() => {
      Deno.Command = Original;
    });

    it("should replace Deno.Command", () => {
      CommandMock.use();
      assert("use" in Deno.Command);
    });

    it("should replace Deno.Command inside the callback", () => {
      using echo = CommandMock.spy("echo");
      CommandMock.use(() => {
        new Deno.Command("echo");
      });
      assertSpyCalls(echo, 1);
    });
  });

  describe("restore", () => {
    beforeEach(() => {
      CommandMock.use();
    });

    it("should restore Deno.Command", () => {
      CommandMock.restore();
      assertFalse("use" in Deno.Command);
    });
  });
});

describe("CommandSpy", () => {
  let echo: CommandSpy<"echo">;

  beforeEach(() => {
    echo = CommandMock.spy("echo");
  });

  it("should be tested with assertSpyCalls", () => {
    assertSpyCalls(echo, 0);
    new CommandMock("echo");
    assertSpyCalls(echo, 1);
    new CommandMock("echo");
    assertSpyCalls(echo, 2);
  });

  it("should be tested with assertSpyCallArg", () => {
    new CommandMock("echo");
    assertSpyCallArg(echo, 0, 1, undefined);
    new CommandMock("echo", { cwd: "/tmp" });
    assertSpyCallArg(echo, 1, 1, { cwd: "/tmp" });
  });

  it("should distinguish between different commands", () => {
    const ls = CommandMock.spy("ls");
    new CommandMock("echo");
    assertSpyCalls(echo, 1);
    assertSpyCalls(ls, 0);
    new CommandMock("ls");
    assertSpyCalls(echo, 1);
    assertSpyCalls(ls, 1);
  });
});

describe("CommandStub", () => {
  let echo: CommandStub<"echo">;

  beforeEach(() => {
    echo = CommandMock.stub("echo");
  });

  it("should not try to execute the command", async () => {
    await new CommandMock("echo").output();
    const { state } = await Deno.permissions.query({
      name: "run",
      command: "echo",
    });
    assertEquals(state, "prompt");
    assertSpyCalls(echo, 1);
  });
});

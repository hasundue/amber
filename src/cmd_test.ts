import { assert, assertEquals, assertThrows } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg, assertSpyCalls } from "@std/testing/mock";
import type { CommandSpy, CommandStub } from "./cmd.ts";
import * as cmd from "./cmd.ts";

describe("mock", () => {
  const Original = Deno.Command;

  afterEach(() => {
    Deno.Command = Original;
  });

  it("should replace Deno.Command", () => {
    cmd.mock();
    assert(Deno.Command !== Original);
  });

  it("should return a disposable", () => {
    assert(Symbol.dispose in cmd.mock());
  });
});

describe("use", () => {
  it("should replace Deno.Command inside the callback", () => {
    using echo = cmd.spy("echo");
    cmd.use(() => {
      new Deno.Command("echo");
    });
    assertSpyCalls(echo, 1);
  });
});

describe("restore", () => {
  const Original = Deno.Command;

  it("should restore Deno.Command", () => {
    cmd.mock();
    cmd.restore();
    assert(Deno.Command === Original);
  });
});

describe("spy", () => {
  it("should create a spy for a command", () => {
    using echo = cmd.spy("echo");
    cmd.use(() => new Deno.Command("echo"));
    assertSpyCalls(echo, 1);
  });
});

describe("stub", () => {
  afterEach(() => {
    cmd.restore();
  });

  it("should create a stub for a command with a dummy by default", async () => {
    using echo = cmd.stub("echo");
    cmd.mock();
    await new Deno.Command("echo").output();
    assertSpyCalls(echo, 1);
  });

  it("should create a stub for a command with a fake", () => {
    cmd.stub(
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
    cmd.mock();
    assertThrows(() => new Deno.Command("echo"));
  });
});

describe("CommandSpy", () => {
  let echo: CommandSpy<"echo">;

  beforeEach(() => {
    echo = cmd.spy("echo");
  });

  afterEach(() => {
    cmd.restore();
  });

  it("should be tested with assertSpyCalls", () => {
    cmd.mock();
    assertSpyCalls(echo, 0);
    new Deno.Command("echo");
    assertSpyCalls(echo, 1);
    new Deno.Command("echo");
    assertSpyCalls(echo, 2);
  });

  it("should be tested with assertSpyCallArg", () => {
    cmd.mock();
    new Deno.Command("echo");
    assertSpyCallArg(echo, 0, 1, undefined);
    new Deno.Command("echo", { cwd: "/tmp" });
    assertSpyCallArg(echo, 1, 1, { cwd: "/tmp" });
  });

  it("should distinguish between different commands", () => {
    const ls = cmd.spy("ls");
    cmd.mock();
    new Deno.Command("echo");
    assertSpyCalls(echo, 1);
    assertSpyCalls(ls, 0);
    new Deno.Command("ls");
    assertSpyCalls(echo, 1);
    assertSpyCalls(ls, 1);
  });
});

describe("CommandStub", () => {
  let echo: CommandStub<"echo">;

  beforeEach(() => {
    echo = cmd.stub("echo");
    cmd.mock();
  });

  it("should not try to execute the command", async () => {
    await new Deno.Command("echo").output();
    const { state } = await Deno.permissions.query({
      name: "run",
      command: "echo",
    });
    assertEquals(state, "prompt");
    assertSpyCalls(echo, 1);
  });
});

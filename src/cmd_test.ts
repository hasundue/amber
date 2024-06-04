import { assert, assertEquals, assertThrows } from "@std/assert";
import { afterEach, describe, it } from "@std/testing/bdd";
import { assertSpyCalls } from "@std/testing/mock";
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

  it("should create multiple spies for different commands separately", () => {
    using echo = cmd.spy("echo");
    using ls = cmd.spy("ls");
    cmd.use(() => {
      new Deno.Command("echo");
      assertSpyCalls(echo, 1);
      assertSpyCalls(ls, 0);
      new Deno.Command("ls");
      assertSpyCalls(echo, 1);
      assertSpyCalls(ls, 1);
    });
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
    assertEquals(
      Deno.permissions.querySync({ name: "run", command: "echo" }).state,
      "prompt",
    );
    assertSpyCalls(echo, 1);
  });

  it("should create a stub for a command with a fake", () => {
    cmd.stub(
      "echo",
      class extends Deno.Command {
        constructor(command: string | URL) {
          super(command);
          throw new Error();
        }
      },
    );
    cmd.mock();
    assertThrows(() => new Deno.Command("echo"));
  });
});

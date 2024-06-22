import { assert, assertEquals, assertThrows } from "@std/assert";
import { afterAll, afterEach, describe, it } from "@std/testing/bdd";
import { assertSpyCalls } from "@std/testing/mock";
import * as cmd from "./cmd.ts";

describe("mock", () => {
  const Original = Deno.Command;

  afterEach(() => {
    Deno.Command = Original;
  });

  it("should replace Deno.Command as a side effect", () => {
    cmd.mock();
    assert(Deno.Command !== Original);
  });
});

describe("use", () => {
  afterAll(() => cmd.dispose());

  it("should replace Deno.Command inside the callback", () => {
    const echo = cmd.spy("echo");
    cmd.use(() => new Deno.Command("echo"));
    assertSpyCalls(echo, 1);
  });
});

describe("spy", () => {
  it("should create a spy for a command", () => {
    const echo = cmd.spy("echo");
    cmd.use(() => new Deno.Command("echo"));
    assertSpyCalls(echo, 1);
  });

  it("should create multiple spies for different commands separately", () => {
    const echo = cmd.spy("echo");
    const ls = cmd.spy("ls");
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
  afterEach(() => cmd.dispose());

  it("should stub a command with the default dummy", async () => {
    const echo = cmd.stub("echo");
    await cmd.use(() => new Deno.Command("echo").output());
    assertEquals(
      Deno.permissions.querySync({ name: "run", command: "echo" }).state,
      "prompt",
    );
    assertSpyCalls(echo, 1);
  });

  it("should stub a command with a given fake", () => {
    cmd.stub(
      "echo",
      class extends Deno.Command {
        constructor(command: string | URL) {
          super(command);
          throw new Error();
        }
      },
    );
    cmd.use(() => assertThrows(() => new Deno.Command("echo")));
  });
});

describe("restore", () => {
  const Original = Deno.Command;

  it("should restore Deno.Command", () => {
    cmd.mock();
    cmd.restore();
    assert(Deno.Command === Original);
  });

  it("should not dispose spies created", () => {
    const echo = cmd.spy("echo");
    cmd.restore();
    cmd.use(() => new Deno.Command("echo"));
    assertSpyCalls(echo, 1);
  });
});

describe("dispose", () => {
  const Original = Deno.Command;

  it("should restore Deno.Command", () => {
    cmd.mock();
    cmd.dispose();
    assert(Deno.Command === Original);
  });

  it("should dispose spies created", () => {
    const echo = cmd.spy("echo");
    cmd.dispose();
    cmd.use(() => new Deno.Command("echo"));
    assertSpyCalls(echo, 0);
  });
});

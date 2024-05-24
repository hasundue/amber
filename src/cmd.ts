import type { ConstructorSpy } from "@std/testing/mock";
import { spy } from "@std/testing/mock";

export interface CommandSpy<Command extends string | URL>
  extends
    Disposable,
    ConstructorSpy<
      Deno.Command,
      [command: Command, options?: Deno.CommandOptions]
    > {
}

export interface CommandStub<Command extends string | URL>
  extends CommandSpy<Command> {
  fake: typeof Deno.Command;
}

class CommandDummy extends Deno.Command {
  #output: Deno.CommandOutput = {
    code: 0,
    stdout: new Uint8Array(),
    stderr: new Uint8Array(),
    success: true,
    signal: null,
  };
  override output() {
    return Promise.resolve(this.#output);
  }
  override outputSync() {
    return this.#output;
  }
  override spawn() {
    return new Deno.ChildProcess();
  }
}

const spies = new Map<
  string,
  ConstructorSpy<
    Deno.Command,
    [command: string | URL, options?: Deno.CommandOptions]
  >
>();

const CommandProxy: typeof Deno.Command = new Proxy(Deno.Command, {
  construct(target, args) {
    const [command, options] = args as ConstructorParameters<
      typeof Deno.Command
    >;
    const spy = spies.get(command.toString());
    if (spy) {
      return new spy(command, options);
    } else {
      return new target(command, options);
    }
  },
});

export class MockCommand extends CommandProxy {
  static stub<Command extends string | URL>(
    command: Command,
    fake: typeof Deno.Command = CommandDummy,
  ): CommandStub<Command> {
    const Spy = spy(fake);
    spies.set(command.toString(), Spy);
    Object.defineProperties(Spy, {
      fake: {
        enumerable: true,
        value: fake,
      },
      name: {
        value: "Deno.Command",
      },
      [Symbol.dispose]: {
        value() {
          spies.delete(command.toString());
        },
      },
    });
    return Spy as unknown as CommandStub<Command>;
  }

  static spy<Command extends string | URL>(
    command: Command,
  ): CommandSpy<Command> {
    return this.stub(command, Deno.Command);
  }

  // deno-lint-ignore no-explicit-any
  static use<T extends any>(fn: () => T): T {
    const Orignal = Deno.Command;
    Deno.Command = MockCommand;
    try {
      return fn();
    } finally {
      Deno.Command = Orignal;
    }
  }
}

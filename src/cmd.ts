import type { ConstructorSpy } from "@std/testing/mock";
import * as std from "@std/testing/mock";
import { tryFinally } from "./internal.ts";

export interface Spy<Command extends string | URL> extends
  ConstructorSpy<
    Deno.Command,
    [command: Command, options?: Deno.CommandOptions]
  > {}

export interface Stub<Command extends string | URL> extends Spy<Command> {
  fake: typeof Deno.Command;
}

const CommandOriginal = Deno.Command;

class CommandDummy extends CommandOriginal {
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

export function stub<Command extends string | URL>(
  command: Command,
  fake: typeof Deno.Command = CommandDummy,
): Stub<Command> {
  const spy = std.spy(fake);
  spies.set(command.toString(), spy);
  Object.defineProperties(spy, {
    fake: {
      enumerable: true,
      value: fake,
    },
    name: {
      value: CommandOriginal.name,
    },
    [Symbol.dispose]: {
      value() {
        spies.delete(command.toString());
      },
    },
  });
  return spy as unknown as Stub<Command>;
}

export function spy<Command extends string | URL>(
  command: Command,
): Spy<Command> {
  return stub(command, CommandOriginal);
}

const CommandProxy: typeof Deno.Command = new Proxy(CommandOriginal, {
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

export function restore() {
  Deno.Command = CommandOriginal;
}

export function dispose() {
  restore();
  spies.clear();
}

export function mock() {
  Deno.Command = CommandProxy;
}

export function use<T>(fn: () => T): T {
  mock();
  return tryFinally(fn, restore);
}

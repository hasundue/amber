/**
 * Proxy for Deno namespace.
 * Intended to be used by other modules internally.
 *
 * @module
 */

import { MockError, type Spy } from "@std/testing/mock";

type DenoFn = keyof typeof Deno;

const spies = new Map<DenoFn, Spy>();

const DenoOriginal = Deno;

export function restore() {
  self.Deno = DenoOriginal;
}

const DenoProxy = new Proxy(Deno, {
  get(target, name: DenoFn) {
    const spy = spies.get(name);
    if (spy) return spy;
    else return Reflect.get(target, name);
  },
});

export function use(): Disposable;
export function use<T>(fn: () => T): T;

export function use<T>(fn?: () => T) {
  if (self.Deno !== DenoOriginal) {
    throw new MockError("Deno namespace is already proxied");
  }
  self.Deno = DenoProxy;
  if (!fn) {
    return {
      [Symbol.dispose]() {
        restore();
      },
    };
  }
  try {
    return fn();
  } finally {
    restore();
  }
}

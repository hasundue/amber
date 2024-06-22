import { tryFinally } from "./internal.ts";

export interface MockModule {
  dispose(): void;
  mock(): void;
  restore(): void;
  use<T>(fn: () => T): T;
}

export function all(...mods: MockModule[]): MockModule {
  return {
    dispose() {
      mods.forEach((m) => m.dispose());
    },
    mock() {
      mods.forEach((m) => m.mock());
      return {
        [Symbol.dispose]() {
          mods.forEach((m) => m.restore());
        },
      };
    },
    use<T>(fn: () => T): T {
      this.mock();
      return tryFinally(fn, this.restore);
    },
    restore() {
      mods.forEach((m) => m.restore());
    },
  };
}

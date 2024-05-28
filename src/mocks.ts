export interface MockModule {
  mock(): Disposable;
  restore(): void;
  use<T>(fn: () => T): T;
}

export function all(...mods: MockModule[]): MockModule {
  return {
    mock() {
      mods.forEach((m) => m.mock());
      return {
        [Symbol.dispose]() {
          mods.forEach((m) => m.restore());
        },
      };
    },
    use<T>(fn: () => T): T {
      using _ = this.mock();
      return fn();
    },
    restore() {
      mods.forEach((m) => m.restore());
    },
  };
}

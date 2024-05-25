export interface MockLike {
  use<T>(): void;
  use<T>(fn: () => T): T;
  restore(): void;
}

export function all(...mocks: MockLike[]): MockLike {
  return {
    use<T>(fn?: () => T) {
      mocks.forEach((mock) => mock.use());
      if (!fn) return;
      try {
        return fn();
      } finally {
        this.restore();
      }
    },
    restore() {
      mocks.forEach((mock) => mock.restore());
    },
  };
}

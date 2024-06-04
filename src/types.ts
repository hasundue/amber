export interface AbstractMock {
  dispose(): void;
  mock(): AbstractMock;
  restore(): void;
  use<T>(fn: () => T): T;
  [Symbol.dispose]: () => void;
}

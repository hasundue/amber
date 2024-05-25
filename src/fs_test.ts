import { describe, it } from "@std/testing/bdd";
import * as fs from "./fs.ts";

describe("restore", () => {
  it("should be callable", () => {
    fs.restore();
  });
});

describe("stub", () => {
  it("should be callable with an URL", () => {
    fs.stub(new URL("file:///"));
  });
});

describe("mock", () => {
  it("should return a disposable", () => {
    using stack = new DisposableStack();
    stack.use(fs.mock());
  });
});

describe("use", () => {
  it("should be callable with a callback", () => {
    fs.use(() => {});
  });
});

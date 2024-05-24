import { describe, it } from "@std/testing/bdd";
import { mock } from "./fs.ts";

describe("mock", () => {
  it("should be callable", () => {
    mock();
  });
});

import { describe, it } from "@std/testing/bdd";
import * as fs from "./fs.ts";

describe("restore", () => {
  it("should be callable", () => {
    fs.restore();
  });
});

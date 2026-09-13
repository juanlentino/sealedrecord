import { describe, it, expect } from "vitest";
import { buildPackage, packageText, PKG_FORMAT } from "../src/pkg.js";

const meta = { code: "0001", title: "t" };

describe("buildPackage note", () => {
  it("carries a neutral note by default", () => {
    const pkg = buildPackage([], [], meta, "14:00");
    expect(pkg.format).toBe(PKG_FORMAT);
    expect(pkg.note).toMatch(/^Sealed record:/);
  });

  it("lets the producer supply its own note", () => {
    const pkg = buildPackage([], [], meta, "14:00", null, null, "my note");
    expect(pkg.note).toBe("my note");
    expect(JSON.parse(packageText([], [], meta, "14:00", null, null, "my note")).note).toBe("my note");
  });
});

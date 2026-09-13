import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/release-notes.mjs", import.meta.url));
const notes = (v) => execFileSync("node", [SCRIPT, v], { encoding: "utf8" });

describe("release notes from the changelog", () => {
  it("prints exactly one version's section", () => {
    const out = notes("0.4.2");
    expect(out).toMatch(/COMPARISON\.md.*is actually in the tarball/);
    expect(out).not.toMatch(/## \[/);
    expect(out).not.toMatch(/static verifier on GitHub Pages/); /* that is 0.4.0's */
  });
  it("fails loudly for a version with no section", () => {
    expect(() => notes("9.9.9")).toThrow();
  });
});

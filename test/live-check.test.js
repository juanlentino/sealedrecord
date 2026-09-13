import { describe, it, expect } from "vitest";
import { mismatches } from "../scripts/live-check.mjs";

const expected = { library: "0.6.0", source: "a".repeat(40) };

describe("live-check compares the served stamp with what should be live", () => {
  it("nothing to report when both match", () => {
    expect(mismatches({ library: "0.6.0", source: "a".repeat(40) }, expected)).toEqual([]);
  });
  it("names a stale library and a stale source separately", () => {
    const m = mismatches({ library: "0.5.3", source: "b".repeat(40) }, expected);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatch(/library.*0\.5\.3.*0\.6\.0/);
    expect(m[1]).toMatch(/source.*bbbbbbb.*aaaaaaa/);
  });
  it("a missing or unreadable stamp is itself a mismatch", () => {
    expect(mismatches(null, expected)[0]).toMatch(/no build stamp/);
  });
});

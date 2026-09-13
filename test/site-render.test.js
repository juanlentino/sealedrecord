import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { verifyPackage, verifyReceipts } from "../index.js";
import { describeReading, describeReceipts } from "../site/render.js";

const pkg = JSON.parse(readFileSync(new URL("../vectors/record.json", import.meta.url), "utf8"));

describe("describeReading", () => {
  it("calls a holding record intact and says signatures were checked", async () => {
    const d = describeReading(await verifyPackage(pkg));
    expect(d.verdict).toBe("intact");
    expect(d.headline).toBe("The chain recomputes end to end and the record is sealed.");
    expect(d.lines.join(" ")).toMatch(/9 entries/);
    expect(d.lines.join(" ")).toMatch(/signatures verified/);
    expect(d.brk).toBeNull();
  });

  it("calls an altered record broken and names the entry and both digests", async () => {
    const t = structuredClone(pkg);
    t.entries[3].note += "!";
    const d = describeReading(await verifyPackage(t));
    expect(d.verdict).toBe("broken");
    expect(d.brk.seq).toBe(4);
    expect(d.brk.detail).toMatch(/recomputed [0-9a-f]{8}…, recorded [0-9a-f]{8}…/);
    expect(d.lines.join(" ")).toMatch(/3 of 9 entries/);
  });

  it("calls a non-record malformed with the reader's reason", async () => {
    const d = describeReading(await verifyPackage({ format: "x" }));
    expect(d.verdict).toBe("malformed");
    expect(d.brk.detail).toMatch(/unknown format/);
  });

  it("calls a chain without a seal unsealed, not intact", async () => {
    const t = structuredClone(pkg);
    t.entries.pop();
    expect(describeReading(await verifyPackage(t)).verdict).toBe("unsealed");
  });
});

describe("describeReceipts", () => {
  it("counts verified receipts and lists problems", async () => {
    const r = await verifyReceipts(pkg);
    expect(describeReceipts(r)).toMatch(/9 of 9/);
    expect(describeReceipts({ total: 2, receipted: 0, verified: 0, problems: [] })).toMatch(/no receipts/i);
  });
});

describe("track verdicts on the page", () => {
  it("lists each track with its verdict word; none when the record has no tracks", async () => {
    const d = describeReading(await verifyPackage(pkg));
    expect(d.tracks).toEqual([["Lead Vox", "intact"], ["Keys", "intact"], ["Kick", "intact"]]);
    const t = structuredClone(pkg); t.tracks = [];
    expect(describeReading(await verifyPackage(t)).tracks).toEqual([]);
  });
});

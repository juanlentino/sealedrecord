import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

/* A browser without Ed25519 in crypto.subtle. hasEd25519 is forced false,
   so verifyPackage checks the hash chain only and the page must say so
   inside the reading, for every kind. */
vi.mock("../src/crypto.js", async (orig) => ({ ...(await orig()), hasEd25519: async () => false }));

const { verifyPackage } = await import("../src/verify.js");
const { describeReading, describeReceipts } = await import("../site/render.js");
const pkg = JSON.parse(readFileSync(new URL("../vectors/record.json", import.meta.url), "utf8"));

describe("readings on a runtime without Ed25519", () => {
  it("holds becomes a visibly different verdict: intact but unsigned", async () => {
    const r = await verifyPackage(pkg);
    expect(r).toMatchObject({ kind: "holds", signed: false });
    const d = describeReading(r);
    expect(d.verdict).toBe("unsigned");
    expect(d.label).toMatch(/intact, unsigned/i);
    expect(d.caveat).toMatch(/no signature was checked/i);
    expect(d.caveat).toMatch(/who signed/i);
  });

  it("the tampered example still breaks at entry 4, and still carries the caveat", async () => {
    const t = structuredClone(pkg);
    t.entries[3].note += "!";
    const d = describeReading(await verifyPackage(t));
    expect(d.verdict).toBe("broken");
    expect(d.brk.seq).toBe(4);
    expect(d.caveat).toMatch(/no signature was checked/i);
  });

  it("a record with signers stripped reads unsigned even where Ed25519 exists", () => {
    const d = describeReading({ kind: "holds", signed: false, entries: pkg.entries, total: 9, session: pkg.session, sealedAt: "14:55", tracks: [], verdicts: [] });
    expect(d.verdict).toBe("unsigned");
  });
});

describe("receipts wording on the page", () => {
  it("states the basis and names unverified members", () => {
    const s = describeReceipts({ total: 9, receipted: 9, verified: 9, problems: [], unchecked: ["anchors"] });
    expect(s).toMatch(/attestation key the record carries/);
    expect(s).toMatch(/not a timestamp proof/);
    expect(s).toMatch(/anchors.*not verified by this reader/);
  });
});

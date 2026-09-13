import { describe, it, expect } from "vitest";
import { verifyReceipts, receiptCanonical } from "../src/attest.js";
import { generateSigningKey, exportJwk, signText } from "../src/crypto.js";

const entriesFixture = [
  { seq: 1, hash: "a".repeat(64) },
  { seq: 2, hash: "b".repeat(64) },
];

const packageWith = async (mutate = (r) => r) => {
  const pair = await generateSigningKey();
  const key = await exportJwk(pair.publicKey);
  const receipts = [];
  for (const e of entriesFixture) {
    const receivedAt = "2026-08-20 22:30:00";
    const sig = await signText(pair.privateKey, receiptCanonical({ sessionId: "ses_1", seq: e.seq, hash: e.hash, receivedAt }));
    receipts.push(mutate({ seq: e.seq, received_at: receivedAt, sig }));
  }
  return {
    session: { id: "ses_1", code: "0001", title: "t" },
    entries: entriesFixture,
    attestations: { key, receipts, anchors: [] },
  };
};

describe("verifyReceipts", () => {
  it("verifies genuine receipts against the attestation key and entry hashes", async () => {
    const r = await verifyReceipts(await packageWith());
    expect(r).toMatchObject({ total: 2, receipted: 2, verified: 2 });
    expect(r.problems).toEqual([]);
  });

  it("flags a receipt whose time was altered after signing", async () => {
    const pkg = await packageWith((rec) => (rec.seq === 2 ? { ...rec, received_at: "2027-01-01 00:00:00" } : rec));
    const r = await verifyReceipts(pkg);
    expect(r.verified).toBe(1);
    expect(r.problems[0]).toMatch(/entry 2/);
  });

  it("reports entries with no receipt without failing the rest", async () => {
    const pkg = await packageWith();
    pkg.attestations.receipts.pop();
    const r = await verifyReceipts(pkg);
    expect(r).toMatchObject({ total: 2, receipted: 1, verified: 1 });
  });

  it("handles packages with no attestations at all", async () => {
    const r = await verifyReceipts({ session: {}, entries: entriesFixture });
    expect(r).toMatchObject({ total: 2, receipted: 0, verified: 0 });
  });
});

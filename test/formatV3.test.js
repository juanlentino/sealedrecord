import { describe, it, expect } from "vitest";
import { buildEvents } from "../src/chain.js";
import { verifyPackage } from "../src/verify.js";
import { PKG_FORMAT } from "../src/pkg.js";
import { generateSigningKey, exportJwk } from "../src/crypto.js";

/* Format v3: the entry hash commits the PCM anchor, the derivation link,
   and the reserved signature-scheme field. Altering any of them after
   signing breaks the chain at exactly that entry. */

const signerSetup = async () => {
  const pair = await generateSigningKey();
  const publicJwk = await exportJwk(pair.publicKey);
  return {
    signerFor: () => pair.privateKey,
    signers: { "ctr:a1": publicJwk },
  };
};

const RAW = [
  { m: 0, action: "session opened", lane: null, room: "studio", actor: { id: "ctr:a1", name: "Ana" } },
  {
    m: 2, action: "bounced", lane: "mix", room: "studio",
    actor: { id: "ctr:a1", name: "Ana" },
    artifact: { name: "mix.wav", size: 4, sha256: "a".repeat(64), pcm_sha256: "b".repeat(64) },
  },
  {
    m: 5, action: "imported", lane: "mix", room: "studio",
    actor: { id: "ctr:a1", name: "Ana" }, derivedFrom: 2,
    artifact: { name: "mix.mp3", size: 2, sha256: "c".repeat(64) },
  },
  { m: 7, action: "package sealed", lane: null, room: "studio", actor: { id: "ctr:a1", name: "Ana" } },
];

const pkgOf = (entries, signers) => ({
  format: PKG_FORMAT, session: { id: "s", code: "0001", title: "t" },
  sealedAt: "14:07", tracks: [], signers, entries,
});

const build = async () => {
  const { signerFor, signers } = await signerSetup();
  const entries = await buildEvents(RAW, signerFor);
  return { entries, signers };
};

describe("format v3 commitments", () => {
  it("the format id is v3", () => {
    expect(PKG_FORMAT).toBe("selo/package.v3");
  });

  it("a chain carrying pcm anchors and derivation links verifies end to end", async () => {
    const { entries, signers } = await build();
    const r = await verifyPackage(pkgOf(entries, signers));
    expect(r.kind).toBe("holds");
    expect(r.entries[2].derivedFrom).toBe(2);
  });

  it("altering the pcm anchor after signing breaks at that entry", async () => {
    const { entries, signers } = await build();
    entries[1] = { ...entries[1], artifact: { ...entries[1].artifact, pcm_sha256: "f".repeat(64) } };
    const r = await verifyPackage(pkgOf(entries, signers));
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(2);
  });

  it("altering a derivation link after signing breaks at that entry", async () => {
    const { entries, signers } = await build();
    entries[2] = { ...entries[2], derivedFrom: 1 };
    const r = await verifyPackage(pkgOf(entries, signers));
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(3);
  });

  it("refuses a derivation link that points forward or at itself", async () => {
    const { signerFor, signers } = await signerSetup();
    const raw = [...RAW.slice(0, 2), { ...RAW[2], derivedFrom: 9 }, RAW[3]];
    const entries = await buildEvents(raw, signerFor);
    const r = await verifyPackage(pkgOf(entries, signers));
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(3);
    expect(r.detail).toMatch(/deriv/i);
  });

  it("names an unsupported signature scheme instead of failing mutely", async () => {
    const { signerFor, signers } = await signerSetup();
    const raw = [RAW[0], { ...RAW[1], alg: "ML-DSA-65" }, RAW[2], RAW[3]];
    const entries = await buildEvents(raw, signerFor);
    const r = await verifyPackage(pkgOf(entries, signers));
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(2);
    expect(r.detail).toMatch(/ML-DSA-65/);
  });
});

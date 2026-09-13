import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { verifyPackage, verifyReceipts, pcmHash, findAnchors, findPcmAnchors } from "../index.js";

/* The conformance vectors: a signed record that holds, the WAV one entry
   anchors, and a retagged copy of that WAV (same samples, extra metadata
   chunk) that matches by sample anchor only. Regenerate: npm run vectors. */
const V = new URL("../vectors/", import.meta.url);
const read = (name) => readFileSync(new URL(name, V));
const buf = (name) => { const b = read(name); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const HEX = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (b) => HEX(await crypto.subtle.digest("SHA-256", b));

const pkg = JSON.parse(read("record.json").toString("utf8"));

describe("conformance vectors", () => {
  it("the record holds, with every signature checked", async () => {
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("holds");
    expect(r.signed).toBe(true);
    expect(r.entries.length).toBe(pkg.entries.length);
  });

  it("every entry's receipt verifies", async () => {
    const r = await verifyReceipts(pkg);
    expect(r.verified).toBe(pkg.entries.length);
    expect(r.problems).toEqual([]);
  });

  it("the take matches its entry by file hash", async () => {
    const hits = findAnchors(await sha256(buf("take.wav")), pkg.entries);
    expect(hits.map((e) => e.seq)).toEqual([2]);
  });

  it("the retagged take matches by sample anchor only", async () => {
    const b = buf("take-retagged.wav");
    expect(findAnchors(await sha256(b), pkg.entries)).toEqual([]);
    expect(findPcmAnchors(await pcmHash(b), pkg.entries).map((e) => e.seq)).toEqual([2]);
  });

  it("one altered character breaks the chain at that entry", async () => {
    const tampered = structuredClone(pkg);
    tampered.entries[3].note = tampered.entries[3].note.replace("chorus", "verse");
    const r = await verifyPackage(tampered);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(4);
  });
});

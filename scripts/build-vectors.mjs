/* The conformance vectors: a complete, genuinely signed, sealed record with
   every format feature in it, built with the same producer that the tests
   exercise, then verified before it is allowed to exist. Fictional people,
   fresh keys each run, real signatures. Run: npm run vectors */

import { mkdirSync, writeFileSync } from "node:fs";
import {
  buildEvents, buildPackage, generateSigningKey, exportJwk, signText,
  pcmHash, verifyPackage, verifyReceipts, receiptCanonical,
} from "../index.js";

const OUT = new URL("../vectors/", import.meta.url);
const HEX = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (buf) => HEX(await crypto.subtle.digest("SHA-256", buf));

/* Tiny WAVs: real audio, really hashed. */
const SR = 8000;
const wav = (seconds, voices, extraChunk = false) => {
  const n = Math.floor(seconds * SR);
  const dataLen = n * 2;
  const extra = extraChunk ? 12 : 0;
  const buf = new ArrayBuffer(44 + dataLen + extra);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + dataLen + extra, true); w(8, "WAVE");
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  let off = 36;
  if (extraChunk) { w(off, "LIST"); v.setUint32(off + 4, 4, true); w(off + 8, "INFO"); off += 12; }
  w(off, "data"); v.setUint32(off + 4, dataLen, true);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const [freq, amp] of voices) s += Math.sin(2 * Math.PI * freq * i / SR) * amp;
    const env = Math.min(1, i / 400, (n - i) / 400);
    v.setInt16(off + 8 + i * 2, Math.max(-32767, Math.min(32767, Math.round(s * env * 12000))), true);
  }
  return buf;
};

const artifactFor = async (name, buf) => ({
  name, size: buf.byteLength, sha256: await sha256(buf), pcm_sha256: await pcmHash(buf),
});

const main = async () => {
  const personas = [
    { id: "ctr:vector00000000000000000000one", name: "One (example)" },
    { id: "ctr:vector00000000000000000000two", name: "Two (example)" },
    { id: "ctr:vector0000000000000000000three", name: "Three (example)" },
  ];
  const keys = new Map();
  const signers = {};
  for (const p of personas) {
    const pair = await generateSigningKey();
    keys.set(p.id, pair.privateKey);
    signers[p.id] = await exportJwk(pair.publicKey);
  }
  const [one, two, three] = personas;

  const chord = [[392, 0.5], [523.25, 0.35], [659.25, 0.2]];
  const takeBuf = wav(2.2, chord);
  const takeRetagBuf = wav(2.2, chord, true);
  const take = await artifactFor("take.wav", takeBuf);
  const keys1 = await artifactFor("keys_take1.wav", wav(2.0, [[261.63, 0.4], [329.63, 0.3]]));
  const kick = await artifactFor("01_Kick.wav", wav(1.2, [[60, 0.9]]));
  const comp = await artifactFor("take_comp.wav", wav(2.4, [[392, 0.55], [523.25, 0.3]]));
  const mix = await artifactFor("RoughMix.wav", wav(2.6, [[98, 0.3], [261.63, 0.25], [392, 0.3]]));

  const raw = [
    { m: 0, action: "session opened", lane: null, room: "studio", actor: one },
    { m: 4, action: "recorded", lane: "Lead Vox", room: "studio", actor: three, artifact: take },
    { m: 11, action: "take", lane: "Keys", room: "studio", actor: one, artifact: keys1 },
    { m: 16, action: "note", lane: "Lead Vox", room: "studio", actor: three, note: "chorus wants a double" },
    { m: 22, action: "imported", lane: "Kick", room: "studio", actor: two, artifact: kick },
    { m: 31, action: "comped", lane: "Lead Vox", room: "studio", actor: two, artifact: comp, derivedFrom: 2 },
    { m: 38, action: "processed", lane: "Lead Vox", room: "studio", actor: two, note: "de-essed", derivedFrom: 6 },
    { m: 47, action: "bounced", lane: null, room: "studio", actor: one, artifact: mix, derivedFrom: 6 },
    { m: 55, action: "package sealed", lane: null, room: "studio", actor: one },
  ];
  const entries = await buildEvents(raw, (id) => keys.get(id) ?? null);

  const attPair = await generateSigningKey();
  const meta = { id: "ses_vector", code: "0001", title: "Conformance vector" };
  const receipts = [];
  for (const e of entries) {
    const received_at = `2026-01-01T12:${String(e.seq).padStart(2, "0")}:00.000Z`;
    receipts.push({ seq: e.seq, received_at, sig: await signText(attPair.privateKey, receiptCanonical({
      sessionId: meta.id, seq: e.seq, hash: e.hash, receivedAt: received_at,
    })) });
  }
  const lanes = [...new Set(entries.map((e) => e.lane).filter(Boolean))].map((l) => ({ id: l, name: l, origin: "recorded" }));
  const pkg = buildPackage(lanes, entries, meta, entries.at(-1).t, signers, { key: await exportJwk(attPair.publicKey), receipts });

  const reading = await verifyPackage(pkg);
  if (reading.kind !== "holds" || !reading.signed) throw new Error(`vector does not verify: ${reading.kind} ${reading.detail ?? ""}`);
  const rec = await verifyReceipts(pkg);
  if (rec.verified !== entries.length || rec.problems.length) throw new Error(`receipts: ${rec.verified}/${entries.length}`);
  if (await pcmHash(takeRetagBuf) !== take.pcm_sha256) throw new Error("retagged take lost its sample anchor");

  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL("record.json", OUT), JSON.stringify(pkg, null, 2));
  writeFileSync(new URL("take.wav", OUT), Buffer.from(takeBuf));
  writeFileSync(new URL("take-retagged.wav", OUT), Buffer.from(takeRetagBuf));
  console.log(`vectors written: ${entries.length} entries, 3 signers, ${rec.verified} receipts, chain ${reading.kind}`);
};

await main();

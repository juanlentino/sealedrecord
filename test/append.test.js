import { describe, it, expect } from "vitest";
import { sealEntry } from "../src/append.js";
import { buildEvents, entryHash, GENESIS, hhmm } from "../src/chain.js";
import { generateSigningKey, exportJwk, verifyText, hasEd25519 } from "../src/crypto.js";
import { buildPackage } from "../src/pkg.js";
import { verifyPackage } from "../src/verify.js";

const ACTOR = { id: "ctr:4e1a31ee", name: "Juan Lentino" };
const RAW = { action: "take 1", lane: "Kick In", room: "studio", m: 7, actor: ACTOR };

describe("sealEntry", () => {
  it("produces an entry that recomputes under the reader's own hash function", async () => {
    const entry = await sealEntry({ prev: GENESIS, seq: 1, raw: RAW });
    expect(entry.prev).toBe(GENESIS);
    expect(entry.seq).toBe(1);
    expect(entry.t).toBe(hhmm(7));
    expect(entry.hash).toBe(await entryHash(GENESIS, 0, entry));
  });

  it("signs with the given key and the signature verifies", async () => {
    if (!(await hasEd25519())) return;
    const pair = await generateSigningKey();
    const entry = await sealEntry({ prev: GENESIS, seq: 1, raw: RAW, privateKey: pair.privateKey });
    expect(await verifyText(pair.publicKey, entry.sig, entry.hash)).toBe(true);
  });

  it("never signs an unenrolled actor", async () => {
    if (!(await hasEd25519())) return;
    const pair = await generateSigningKey();
    const guest = { ...RAW, actor: { id: null, name: "Guest" } };
    const entry = await sealEntry({ prev: GENESIS, seq: 1, raw: guest, privateKey: pair.privateKey });
    expect(entry.sig).toBeUndefined();
    expect(entry.sealed).toBe(false);
  });

  it("continues an existing chain so the full package still verifies", async () => {
    if (!(await hasEd25519())) return;
    const pair = await generateSigningKey();
    const signers = { [ACTOR.id]: await exportJwk(pair.publicKey) };
    const base = await buildEvents(
      [{ action: "session opened", lane: null, actor: ACTOR, m: 0, room: "studio" }],
      () => pair.privateKey,
    );
    const take = await sealEntry({
      prev: base[0].hash, seq: 2, raw: RAW, privateKey: pair.privateKey,
    });
    const sealed = await sealEntry({
      prev: take.hash, seq: 3,
      raw: { action: "package sealed", lane: null, room: "studio", m: 9, actor: ACTOR },
      privateKey: pair.privateKey,
    });
    const pkg = buildPackage(
      [{ id: "Kick In", name: "Kick In", origin: "recorded" }],
      [...base, take, sealed],
      { code: "0001", title: "continuation" }, sealed.t, signers,
    );
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("holds");
    expect(r.signed).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { buildEvents, entryHash, verdictOf, GENESIS } from "../src/chain.js";
import { hasEd25519, generateSigningKey, exportJwk } from "../src/crypto.js";
import { buildPackage, PKG_FORMAT } from "../src/pkg.js";
import { verifyPackage } from "../src/verify.js";

const META = { code: "0416", title: "test session" };
const ENG = { id: "ctr:7c42", name: "S. Duarte" };
const GUEST = { id: null, name: "Session guest" };
const LANES = [
  { id: 1, name: "Kick In", origin: "recorded" },
  { id: 2, name: "Stem 2", origin: "imported" },
];

/* Signed fixture: mints a keypair for each enrolled id, like the session. */
const sealedFixture = async (extra = []) => {
  const raw = [
    { action: "session opened", lane: null, actor: ENG, m: 0, room: "A" },
    { action: "take 1", lane: 1, actor: ENG, m: 10, room: "A" },
    ...extra,
    { action: "package sealed", lane: null, actor: ENG, m: 90, room: "B" },
  ];
  let keys = {};
  let signers = null;
  if (await hasEd25519()) {
    signers = {};
    const ids = [...new Set(raw.map((e) => e.actor?.id).filter(Boolean))];
    for (const id of ids) {
      const pair = await generateSigningKey();
      keys[id] = pair.privateKey;
      signers[id] = await exportJwk(pair.publicKey);
    }
  }
  const events = await buildEvents(raw, (id) => keys[id] ?? null);
  return buildPackage(LANES, events, META, events[events.length - 1].t, signers);
};

describe("chain", () => {
  it("links every entry to its predecessor with SHA-256", async () => {
    const events = await buildEvents([
      { action: "take 1", lane: 1, actor: ENG, m: 1, room: "A" },
      { action: "edited", lane: 1, actor: ENG, m: 2, room: "A" },
    ]);
    expect(events[0].prev).toBe(GENESIS);
    expect(events[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(events[1].prev).toBe(events[0].hash);
  });

  it("marks unenrolled actors as recorded gaps and breaks the verdict", async () => {
    const events = await buildEvents([
      { action: "take 1", lane: 1, actor: ENG, m: 1, room: "A" },
      { action: "edited", lane: 1, actor: GUEST, m: 2, room: "A" },
    ]);
    expect(events[1].sealed).toBe(false);
    expect(events[1].sig).toBeUndefined();
    const v = verdictOf(events, 1);
    expect(v.key).toBe("broken");
    expect(v.gap.seq).toBe(2);
  });

  it("reports origin unverified when the first entry is unsigned", async () => {
    const events = await buildEvents([
      { action: "imported", lane: 2, actor: GUEST, m: 1, room: "A" },
      { action: "edited", lane: 2, actor: ENG, m: 2, room: "A" },
    ]);
    expect(verdictOf(events, 2).key).toBe("unverified");
  });

  it("commits the artifact: same entry with a different file hashes differently", async () => {
    const base = { action: "bounced", lane: 1, actor: ENG, m: 5, room: "A" };
    const wav = { name: "mix-v1.wav", size: 1024, sha256: "a".repeat(64) };
    const [plain] = await buildEvents([base]);
    const [anchored] = await buildEvents([{ ...base, artifact: wav }]);
    const [renamed] = await buildEvents([{ ...base, artifact: { ...wav, name: "final-master.wav" } }]);
    const [swapped] = await buildEvents([{ ...base, artifact: { ...wav, sha256: "b".repeat(64) } }]);
    const hashes = [plain.hash, anchored.hash, renamed.hash, swapped.hash];
    expect(new Set(hashes).size).toBe(4); /* file identity, name, and presence all commit */
  });
});

describe("verifyPackage", () => {
  it("holds for an untouched signed package", async () => {
    const r = await verifyPackage(await sealedFixture());
    expect(r.kind).toBe("holds");
    expect(r.verdicts.find((v) => v.track.id === 1).verdict.key).toBe("intact");
  });

  it("names the exact entry when an actor name is altered", async () => {
    const pkg = await sealedFixture();
    pkg.entries[1].actor.name = "Someone Else";
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(2);
    expect(r.detail).toMatch(/altered after signing/);
  });

  it("catches a forger who recomputes the hashes but cannot re-sign", async () => {
    if (!(await hasEd25519())) return;
    const pkg = await sealedFixture();
    pkg.entries[1].action = "comped"; /* the lie */
    let prev = GENESIS;
    for (let i = 0; i < pkg.entries.length; i++) { /* the cover-up */
      pkg.entries[i].prev = prev;
      pkg.entries[i].hash = await entryHash(prev, i, pkg.entries[i]);
      prev = pkg.entries[i].hash;
    }
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(2);
    expect(r.detail).toMatch(/signature verification/);
  });

  it("rejects an enrolled entry whose signature was stripped", async () => {
    if (!(await hasEd25519())) return;
    const pkg = await sealedFixture();
    delete pkg.entries[1].sig;
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(2);
    expect(r.detail).toMatch(/no verifiable signature/);
  });

  it("catches a forged identifier on a gap entry", async () => {
    const pkg = await sealedFixture([
      { action: "edited", lane: 1, actor: GUEST, m: 20, room: "A" },
    ]);
    pkg.entries[2].actor.id = "ctr:beef";
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(3);
  });

  it("catches a removed entry as a chain that does not connect", async () => {
    const pkg = await sealedFixture();
    pkg.entries.splice(1, 1);
    pkg.entries.forEach((e, i) => { e.seq = i + 1; }); /* renumber to dodge the seq check */
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.detail).toMatch(/does not connect/);
  });

  it("still verdicts the intact prefix after a break", async () => {
    const pkg = await sealedFixture();
    pkg.entries[2].actor.name = "Forger";
    const r = await verifyPackage(pkg);
    expect(r.breakSeq).toBe(3);
    expect(r.verdicts.find((v) => v.track.id === 1).verdict.key).toBe("intact");
  });

  it("reports an unsealed package", async () => {
    const pkg = await sealedFixture();
    pkg.entries.pop();
    expect((await verifyPackage(pkg)).kind).toBe("unsealed");
  });

  it("marks a signer-stripped package as unsigned so the downgrade is visible", async () => {
    if (!(await hasEd25519())) return;
    const pkg = await sealedFixture();
    /* the downgrade attack: remove signers and signatures, rebuild the hashes */
    delete pkg.signers;
    let prev = GENESIS;
    for (let i = 0; i < pkg.entries.length; i++) {
      delete pkg.entries[i].sig;
      pkg.entries[i].prev = prev;
      pkg.entries[i].hash = await entryHash(prev, i, pkg.entries[i]);
      prev = pkg.entries[i].hash;
    }
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("holds"); /* digests alone cannot refuse this */
    expect(r.signed).toBe(false); /* but the reader must say what it is */
    const signedR = await verifyPackage(await sealedFixture());
    expect(signedR.signed).toBe(true);
  });

  it("survives hostile signer ids without prototype pollution", async () => {
    const pkg = await sealedFixture();
    pkg.signers = { ...(pkg.signers ?? {}), ["__proto__"]: { kty: "OKP", crv: "Ed25519", x: "AAAA" } };
    const r = await verifyPackage(pkg); /* must not throw, must not pollute */
    expect(["holds", "altered"]).toContain(r.kind);
    expect(Object.prototype.x).toBeUndefined();
  });

  it("rejects foreign formats and empty payloads", async () => {
    expect((await verifyPackage(null)).kind).toBe("malformed");
    expect((await verifyPackage({ format: "something/else" })).kind).toBe("malformed");
    const foreign = await verifyPackage({ format: "other-namespace/package.v3", entries: [{}] });
    expect(foreign.kind).toBe("malformed"); /* another namespace is not this format, whatever its version */
    const preAnchor = await verifyPackage({ format: "sealedrecord/package.v1", entries: [{}] });
    expect(preAnchor.kind).toBe("malformed"); /* v1 never shipped; no legacy to honor */
    expect((await verifyPackage({ format: PKG_FORMAT, entries: [] })).kind).toBe("malformed");
  });

  it("refuses a signer map large enough to stall the verifier", async () => {
    const pkg = await sealedFixture();
    pkg.signers = Object.fromEntries(
      Array.from({ length: 201 }, (_, i) => [`ctr:${i}`, { kty: "OKP", crv: "Ed25519", x: "A" }]),
    );
    expect((await verifyPackage(pkg)).kind).toBe("malformed");
  });

  it("reports a null actor as a break, never a crash", async () => {
    const pkg = await sealedFixture();
    pkg.entries[1].actor = null;
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(2);
    expect(r.detail).toMatch(/actor/);
  });

  it("catches an artifact swapped after sealing", async () => {
    const pkg = await sealedFixture([
      { action: "bounced", lane: 1, actor: ENG, m: 20, room: "A", artifact: { name: "mix.wav", size: 2048, sha256: "c".repeat(64) } },
    ]);
    pkg.entries[2].artifact.sha256 = "d".repeat(64); /* point the entry at a different file */
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.breakSeq).toBe(3);
    expect(r.detail).toMatch(/altered after signing/);
  });
});

describe("readings are plain prose", () => {
  it("names the disagreeing digests without em dashes", async () => {
    const pair = await generateSigningKey();
    const jwk = await exportJwk(pair.publicKey);
    const raw = [{ m: 0, action: "session opened", lane: null, room: "r", actor: { id: "ctr:a", name: "A" } },
      { m: 1, action: "package sealed", lane: null, room: "r", actor: { id: "ctr:a", name: "A" } }];
    const events = await buildEvents(raw, () => pair.privateKey);
    const pkg = buildPackage([], events, { code: "1", title: "t" }, "14:01", { "ctr:a": jwk });
    pkg.entries[0].room = "elsewhere";
    const r = await verifyPackage(pkg);
    expect(r.kind).toBe("altered");
    expect(r.detail).toMatch(/recomputed [0-9a-f]{8}…, recorded [0-9a-f]{8}…/);
    expect(r.detail).not.toMatch(/—/);
  });
});

/* FORMAT.md §5: a reader's job is to survive bad input. Every case here
   returns a reading and never throws. Presence is §5.2 step 1; the type of
   prev and hash is the same step (a digest is a string). */
describe("hostile field types produce readings, not exceptions", () => {
  const good = async () => {
    const pair = await generateSigningKey();
    const jwk = await exportJwk(pair.publicKey);
    const raw = [{ m: 0, action: "session opened", lane: null, room: "r", actor: { id: "ctr:a", name: "A" } },
      { m: 1, action: "package sealed", lane: null, room: "r", actor: { id: "ctr:a", name: "A" } }];
    const events = await buildEvents(raw, () => pair.privateKey);
    return buildPackage([{ id: null, name: "x", origin: "recorded" }], events, { code: "1", title: "t" }, "14:01", { "ctr:a": jwk });
  };

  it("null prev", async () => {
    const p = await good(); p.entries[1].prev = null;
    expect(await verifyPackage(p)).toMatchObject({ kind: "altered", breakSeq: 2 });
  });
  it("numeric hash", async () => {
    const p = await good(); p.entries[0].hash = 42;
    expect(await verifyPackage(p)).toMatchObject({ kind: "altered", breakSeq: 1 });
  });
  it("non-numeric m still yields a reading", async () => {
    const p = await good(); p.entries[0].m = "zero";
    expect(["altered"]).toContain((await verifyPackage(p)).kind);
  });
  it("non-object entry", async () => {
    const p = await good(); p.entries[1] = 7;
    expect(await verifyPackage(p)).toMatchObject({ kind: "altered", breakSeq: 2 });
    p.entries[1] = null;
    expect(await verifyPackage(p)).toMatchObject({ kind: "altered", breakSeq: 2 });
  });
  it("non-string format", async () => {
    expect((await verifyPackage({ format: 3, entries: [{}] })).kind).toBe("malformed");
    expect((await verifyPackage({ format: null, entries: [{}] })).kind).toBe("malformed");
  });
  it("numeric signature", async () => {
    const p = await good(); p.entries[0].sig = 99;
    expect(await verifyPackage(p)).toMatchObject({ kind: "altered", breakSeq: 1 });
  });
  it("null track and non-object signer value", async () => {
    const p = await good(); p.tracks = [null, 5, { id: null, name: "x" }]; p.signers["ctr:b"] = "not a key";
    const r = await verifyPackage(p);
    expect(r.kind).toBe("holds");
    expect(r.verdicts.length).toBe(3);
  });
});

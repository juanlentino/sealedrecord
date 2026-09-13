/* Seeded mutations of a record, for differential testing. Deterministic:
   mutate(vector, n) always returns the same record for the same n, so a
   failing case is named by its number. Mutations are the things a hostile
   or careless hand does to a JSON file: drop a field, change its type, move
   an entry, truncate, poison the signers or the attestations. */

const VALUES = [null, 0, 1, -1, "", "x", "1", [], {}, true, 2 ** 53, "0".repeat(64)];
const ENTRY_FIELDS = ["seq", "m", "t", "room", "lane", "action", "note", "artifact", "derivedFrom", "alg", "actor", "prev", "hash", "sig"];
const TOP_FIELDS = ["format", "session", "sealedAt", "tracks", "signers", "attestations", "entries"];

/* mulberry32: small, seedable, good enough to spread cases. */
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const mutate = (vector, n) => {
  const r = rng(n + 1);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const pkg = structuredClone(vector);
  const es = pkg.entries;
  const obj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const i = Math.floor(r() * es.length);
  const ops = [
    () => { delete pkg[pick(TOP_FIELDS)]; return "delete top field"; },
    () => { const f = pick(TOP_FIELDS); pkg[f] = pick(VALUES); return `set top ${f}`; },
    () => { const f = pick(ENTRY_FIELDS); delete es[i][f]; return `delete entry ${i + 1} ${f}`; },
    () => { const f = pick(ENTRY_FIELDS); es[i][f] = pick(VALUES); return `set entry ${i + 1} ${f}`; },
    () => { const j = Math.floor(r() * es.length); [es[i], es[j]] = [es[j], es[i]]; return `swap entries ${i + 1} ${j + 1}`; },
    () => { es.splice(i, 1); return `remove entry ${i + 1}`; },
    () => { es.splice(i, 0, structuredClone(es[i])); return `duplicate entry ${i + 1}`; },
    () => { pkg.entries = es.slice(0, i + 1); return `truncate after ${i + 1}`; },
    () => { es[i] = pick(VALUES); return `replace entry ${i + 1} with a non-object`; },
    () => { const a = es[i].actor; const f = pick(["id", "name"]); a[f] = pick(VALUES); return `set entry ${i + 1} actor.${f}`; },
    () => { if (!obj(es[i].artifact)) return "skip"; es[i].artifact[pick(["name", "size", "sha256", "pcm_sha256"])] = pick(VALUES); return `set entry ${i + 1} artifact field`; },
    () => { if (!obj(pkg.signers)) return "skip"; const id = pick(Object.keys(pkg.signers)); pkg.signers[id] = pick([...VALUES, { kty: "OKP", crv: "Ed25519", x: "AAAA" }]); return `poison signer ${id}`; },
    () => { if (!obj(pkg.signers)) return "skip"; const id = pick(Object.keys(pkg.signers)); delete pkg.signers[id]; return `drop signer ${id}`; },
    () => { if (!obj(pkg.attestations)) return "skip"; pkg.attestations[pick(["key", "receipts", "anchors"])] = pick(VALUES); return "poison attestations member"; },
    () => { const rc = pkg.attestations?.receipts; if (!Array.isArray(rc) || !obj(rc[i])) return "skip"; rc[i][pick(["seq", "received_at", "sig"])] = pick(VALUES); return `poison receipt ${i + 1}`; },
    () => { pkg.tracks = pick([[], [null], [{ id: null }], [{ id: es[i]?.lane ?? null, name: "x" }], VALUES]); return "replace tracks"; },
  ];
  const steps = 1 + Math.floor(r() * 3);
  const what = [];
  for (let s = 0; s < steps; s++) {
    const op = pick(ops);
    /* Entry-level ops need an object at es[i]; after an earlier op it may not be one. */
    const entryOp = ![ops[0], ops[1], ops[11], ops[12], ops[13], ops[15]].includes(op);
    if (entryOp && (!Array.isArray(pkg.entries) || pkg.entries !== es)) { what.push("skip"); continue; }
    if (!obj(es[i]) && entryOp && ![ops[7], ops[8], ops[5], ops[6]].includes(op)) { what.push("skip"); continue; }
    if (op === ops[9] && !obj(es[i].actor)) { what.push("skip"); continue; }
    what.push(op());
  }
  return { pkg, what: what.join("; ") };
};

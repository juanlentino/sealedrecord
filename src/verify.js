/* The independent reader's logic. It is handed a parsed package object and
   nothing else: no session state, no crew list, no trust in any field the
   package asserts about itself. It recomputes the whole SHA-256 chain from
   genesis, and where the package carries signers it verifies each enrolled
   entry's Ed25519 signature, so a forger who rebuilds the hashes still
   fails at the first entry they could not re-sign.

   Result kinds:
     malformed: not a package this reader can read; `detail` says why
     altered: the chain fails at `breakSeq`; `detail` names what failed
     unsealed: chain recomputes but the package was never sealed
     holds: chain recomputes end to end and the package is sealed */

import { GENESIS, entryHash, hhmm, verdictOf } from "./chain.js";
import { verifyText, importPublicJwk, hasEd25519 } from "./crypto.js";
import { PKG_FORMAT } from "./pkg.js";

const FIELDS = ["seq", "m", "room", "action", "actor", "prev", "hash"];
const MAX_ENTRIES = 10000;
const MAX_SIGNERS = 200; /* a session has a handful of members; this is hostile input */

const malformed = (detail) => ({ kind: "malformed", detail });

export const verifyPackage = async (pkg) => {
  if (!pkg || typeof pkg !== "object") return malformed("not a JSON object");
  if (pkg.format !== PKG_FORMAT) {
    return malformed(`unknown format ${JSON.stringify(pkg.format ?? null)}; this reader reads ${PKG_FORMAT}`);
  }
  if (!Array.isArray(pkg.entries) || pkg.entries.length === 0) {
    return malformed("the package carries no entries");
  }
  if (pkg.entries.length > MAX_ENTRIES) {
    return malformed(`the package carries more than ${MAX_ENTRIES} entries; refusing to process it`);
  }

  /* Import signer keys, if the package carries any and the runtime can.
     Null prototype: signer ids are attacker-controlled strings. */
  const keys = Object.create(null);
  const signers = pkg.signers && typeof pkg.signers === "object" ? pkg.signers : null;
  if (signers && Object.keys(signers).length > MAX_SIGNERS) {
    return malformed(`the package carries more than ${MAX_SIGNERS} signer keys; refusing to process it`);
  }
  const checkSigs = Boolean(signers) && (await hasEd25519());
  if (checkSigs) {
    for (const [id, jwk] of Object.entries(signers)) {
      try {
        keys[id] = await importPublicJwk(jwk);
      } catch { /* an unimportable key simply fails that signer's entries below */ }
    }
  }

  /* Re-derive what the session derived; trust nothing carried. */
  const entries = [];
  let prev = GENESIS;
  let breakAt = null;
  for (let i = 0; i < pkg.entries.length; i++) {
    const e = pkg.entries[i];
    const missing = FIELDS.find((f) => e?.[f] === undefined);
    if (missing !== undefined) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} is missing its ${missing} field` };
      break;
    }
    if (e.actor === null || typeof e.actor !== "object") {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} carries no actor; every entry names who acted` };
      break;
    }
    /* A digest is a string. Anything else is a record that fails here,
       never an exception out of the reader. */
    const notText = ["prev", "hash"].find((f) => typeof e[f] !== "string");
    if (notText) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} carries a ${notText} that is not a digest string` };
      break;
    }
    if (e.seq !== i + 1) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} carries sequence number ${e.seq}; entries have been reordered or removed` };
      break;
    }
    if (e.prev !== prev) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} chains from ${e.prev.slice(0, 8)}…, but the preceding entry resolves to ${prev.slice(0, 8)}…; the chain does not connect here` };
      break;
    }
    /* v3: a derivation link may only point at an earlier entry. */
    if (e.derivedFrom !== undefined
      && (!Number.isInteger(e.derivedFrom) || e.derivedFrom < 1 || e.derivedFrom > i)) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} claims derivation from entry ${e.derivedFrom}, which is not an earlier entry in this chain` };
      break;
    }
    /* v3: the signature-scheme field is reserved; this reader speaks Ed25519. */
    if (e.alg !== undefined && e.alg !== "Ed25519") {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} is signed with ${e.alg}, a scheme this reader does not support yet` };
      break;
    }
    const computed = await entryHash(prev, i, e);
    if (computed !== e.hash) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} (${e.action}) does not match its recorded digest: recomputed ${computed.slice(0, 8)}…, recorded ${e.hash.slice(0, 8)}…; its content was altered after signing` };
      break;
    }
    if (e.t !== hhmm(e.m)) {
      breakAt = { seq: i + 1, detail: `entry ${i + 1} displays time ${e.t} but its committed position resolves to ${hhmm(e.m)}; the displayed time was altered` };
      break;
    }
    if (checkSigs && e.actor?.id) {
      const key = keys[e.actor.id];
      if (!e.sig || !key) {
        breakAt = { seq: i + 1, detail: `entry ${i + 1} carries the identifier ${e.actor.id} but no verifiable signature; an enrolled entry must be signed` };
        break;
      }
      if (!(await verifyText(key, e.sig, e.hash))) {
        breakAt = { seq: i + 1, detail: `entry ${i + 1} (${e.action}) fails signature verification: the chain was rebuilt without ${e.actor.name}'s key` };
        break;
      }
    }
    entries.push({ ...e, sealed: Boolean(e.actor.id) });
    prev = e.hash;
  }

  const tracks = Array.isArray(pkg.tracks) ? pkg.tracks : [];
  const verdicts = tracks.map((tr) => ({
    track: tr, verdict: verdictOf(entries, tr?.id),
  }));
  const base = {
    session: pkg.session ?? {}, sealedAt: pkg.sealedAt ?? null,
    entries, tracks, verdicts, total: pkg.entries.length,
    signed: checkSigs,
  };

  if (breakAt) return { kind: "altered", breakSeq: breakAt.seq, detail: breakAt.detail, ...base };
  if (entries[entries.length - 1].action !== "package sealed") {
    return { kind: "unsealed", detail: "the chain recomputes, but the package was never sealed; nothing attests that this is a delivered record", ...base };
  }
  return { kind: "holds", ...base };
};

/* Chain continuation: seal one new entry onto a live chain without
   rebuilding from genesis. Produces exactly what buildEvents would have —
   the reader cannot tell a continued chain from a rebuilt one, which the
   round-trip test proves. */

import { entryHash, hhmm } from "./chain.js";
import { signText } from "./crypto.js";

export const sealEntry = async ({ prev, seq, raw, privateKey = null }) => {
  if (raw.lane === undefined) throw new Error(`entry ${seq} has no lane field; use null for an entry outside any track`);
  const actor = raw.actor || { id: null, name: "unresolved" };
  const sealed = Boolean(actor.id);
  const base = { ...raw, actor, seq, t: hhmm(raw.m ?? 0), sealed, prev };
  const hash = await entryHash(prev, seq - 1, base);
  let sig;
  if (sealed && privateKey) sig = await signText(privateKey, hash);
  return { ...base, hash, ...(sig ? { sig } : {}) };
};

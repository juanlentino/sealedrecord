/* Chain projections. The event log is the single source of truth; everything
   here derives from it and holds no state of its own.

   Every entry's digest is SHA-256 over its full content plus its
   predecessor's digest, and an enrolled actor's entry is signed Ed25519
   over that digest. Identity custody lives outside the record. */

import { sha256Hex, signText } from "./crypto.js";

export const GENESIS = "0".repeat(64);
/* Canonical entry digest (format v3). Every content field is committed, so
   altering any of them after the fact breaks the chain at exactly that
   entry, including the anchored artifact: its file hash, name, size, and
   (when the audio is uncompressed) its PCM hash all commit, so neither
   the file, its name, nor the samples themselves can be swapped. v3 also
   commits the derivation link (`derivedFrom`, an earlier entry's seq) and
   the reserved signature-scheme field (`alg`; absent means Ed25519).
   The reader recomputes this same function over a package it is handed.
   v2 never shipped; clean break,
   same as v1→v2. */
export const entryHash = (prev, i, e) => {
  const actor = e.actor || { id: null, name: "unresolved" };
  const artifact = e.artifact
    ? `${e.artifact.sha256}:${e.artifact.name}:${e.artifact.size}:${e.artifact.pcm_sha256 ?? ""}`
    : "";
  return sha256Hex(
    `${prev}|${i}|${e.action}|${e.lane}|${actor.id}|${actor.name}|${e.m}|${e.room}|${e.note ?? ""}|${artifact}|${e.derivedFrom ?? ""}|${e.alg ?? ""}`,
  );
};

/* Session-relative clock from a 14:00 downbeat. Skeleton-stage: positions
   inside one session. Real wall-clock timestamps arrive with persistence. */
export const hhmm = (m) =>
  `${String(14 + Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* Adds seq, t, sealed, prev, hash, and — when the actor has a signing key —
   an Ed25519 signature over the entry's digest. Derives defensively: events
   are sorted by session time first, and an actor without an identifier is a
   recorded gap, never an error. Sequential by construction: each digest
   commits to the one before it. */
export const buildEvents = async (rawEvents, signerFor = null) => {
  const ordered = [...rawEvents].sort((a, b) => (a.m ?? 0) - (b.m ?? 0));
  let prev = GENESIS;
  const out = [];
  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];
    const actor = e.actor || { id: null, name: "unresolved" };
    const sealed = Boolean(actor.id);
    const hash = await entryHash(prev, i, { ...e, actor });
    let sig;
    if (sealed && signerFor) {
      const key = signerFor(actor.id);
      if (key) sig = await signText(key, hash);
    }
    out.push({ ...e, actor, seq: i + 1, t: hhmm(e.m ?? 0), sealed, prev, hash, ...(sig ? { sig } : {}) });
    prev = hash;
  }
  return out;
};

export const verdictOf = (events, laneId) => {
  const own = events.filter((e) => e.lane === laneId);
  if (!own.length) return { key: "pending", label: "no events" };
  if (!own[0].sealed) return { key: "unverified", label: "origin unverified" };
  const gap = own.find((e) => !e.sealed);
  if (gap) return { key: "broken", label: "chain broken", gap };
  return { key: "intact", label: "chain intact" };
};

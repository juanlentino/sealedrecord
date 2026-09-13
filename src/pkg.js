/* Sealed-record serialization. The record is what leaves the room: the
   sealed prefix of the log, the track labels, the signers' public keys,
   and nothing else. Derived fields (sealed, verdicts) are deliberately
   absent; the reader re-derives them and takes nothing in the file at its
   word. */

/* v3: artifact commits gain the PCM secondary anchor, and entries commit
   derivation links (derivedFrom) and the reserved signature-scheme field
   (alg). v1 and v2 never shipped; no legacy records to honor. */
export const PKG_FORMAT = "sealedrecord/package.v3";

/* Free text for humans, never committed, never read by a verifier. */
export const DEFAULT_NOTE = "Sealed record: SHA-256 chain digests, Ed25519 entry signatures. Attestations (time receipts, timestamp proofs) are metadata about the chain, never part of it.";

export const buildPackage = (lanes, sealedEvents, meta, sealedAt, signers = null, attestations = null, note = DEFAULT_NOTE) => {
  /* Receipts commit the session id into every signed canonical; a record
     that carries attestations without an id would commit "undefined". */
  if (attestations && !meta.id) throw new Error("attestations require a session id; receipts commit it");
  return packageObject(lanes, sealedEvents, meta, sealedAt, signers, attestations, note);
};

const packageObject = (lanes, sealedEvents, meta, sealedAt, signers, attestations, note) => ({
  format: PKG_FORMAT,
  note,
  session: { ...(meta.id ? { id: meta.id } : {}), code: meta.code, title: meta.title },
  sealedAt,
  tracks: lanes.map((l) => ({ id: l.id, name: l.name, origin: l.origin })),
  ...(signers && Object.keys(signers).length ? { signers } : {}),
  ...(attestations ? { attestations } : {}),
  entries: sealedEvents.map((e) => ({
    seq: e.seq, m: e.m, t: e.t, room: e.room, lane: e.lane, action: e.action,
    ...(e.note ? { note: e.note } : {}),
    ...(e.artifact ? {
      artifact: {
        name: e.artifact.name, size: e.artifact.size, sha256: e.artifact.sha256,
        ...(e.artifact.pcm_sha256 ? { pcm_sha256: e.artifact.pcm_sha256 } : {}),
      },
    } : {}),
    ...(e.derivedFrom ? { derivedFrom: e.derivedFrom } : {}),
    ...(e.alg ? { alg: e.alg } : {}),
    actor: { id: e.actor.id, name: e.actor.name },
    prev: e.prev, hash: e.hash,
    ...(e.sig ? { sig: e.sig } : {}),
  })),
});

export const packageText = (lanes, sealedEvents, meta, sealedAt, signers = null, attestations = null, note = DEFAULT_NOTE) =>
  JSON.stringify(buildPackage(lanes, sealedEvents, meta, sealedAt, signers, attestations, note), null, 2);

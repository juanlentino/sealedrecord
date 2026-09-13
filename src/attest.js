/* The reader's side of time attestation. Receipts are a server's signed
   statement "I received the entry with this hash at this time", verifiable
   against the attestation key the record carries, but only as strong as
   trust in that server's clock and key custody. Timestamp proofs
   (OpenTimestamps) are the trustless layer; they travel in the record for
   standard tooling and are not verified here. Attestations are metadata
   ABOUT the chain, never part of it: a record with none still verifies. */

import { importPublicJwk, verifyText } from "./crypto.js";

/* The signing side must byte-match this canonical form. */
export const receiptCanonical = ({ sessionId, seq, hash, receivedAt }) =>
  `sealedrecord/receipt.v1|${sessionId}|${seq}|${hash}|${receivedAt}`;

export const verifyReceipts = async (pkg) => {
  const entries = pkg.entries ?? [];
  const out = { total: entries.length, receipted: 0, verified: 0, problems: [] };
  const att = pkg.attestations;
  if (!att?.key || !Array.isArray(att.receipts)) return out;

  let key;
  try {
    key = await importPublicJwk({ ...att.key, alg: undefined });
  } catch {
    out.problems.push("the attestation key in this package is not importable");
    return out;
  }

  const bySeq = new Map(att.receipts.map((r) => [r.seq, r]));
  for (const e of entries) {
    const r = bySeq.get(e.seq);
    if (!r) continue;
    out.receipted += 1;
    const ok = r.sig && (await verifyText(key, r.sig, receiptCanonical({
      sessionId: pkg.session?.id, seq: e.seq, hash: e.hash, receivedAt: r.received_at,
    })));
    if (ok) out.verified += 1;
    else out.problems.push(`entry ${e.seq}: receipt does not verify — its time or content claim was altered`);
  }
  return out;
};

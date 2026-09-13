/* Reading → words. Pure: takes the library's reading object, returns text
   the page prints. Nothing here touches the DOM, so it is tested in Node
   against the same vectors the library is tested against. */

const VERDICT = {
  holds: { verdict: "intact", label: "Intact", glyph: "✓", headline: "The chain recomputes end to end and the record is sealed." },
  unsigned: { verdict: "unsigned", label: "Intact, unsigned", glyph: "◇", headline: "The chain recomputes end to end and the record is sealed, but no signature was checked." },
  unsealed: { verdict: "unsealed", label: "Unsealed", glyph: "◌", headline: "The chain recomputes, but nothing seals it; this is not a delivered record." },
  altered: { verdict: "broken", label: "Broken", glyph: "✕", headline: "The chain fails and the record has been changed since it was sealed." },
  malformed: { verdict: "malformed", label: "Malformed", glyph: "?", headline: "This is not a record this reader can read." },
};

/* Present whenever a reading was produced without signature checks. A hash
   chain is recomputable by anyone, so such a reading says nothing about who
   signed; it sits inside the reading so a screenshot carries it. */
const CAVEAT = "No signature was checked: the record carries no signer keys, or this browser cannot verify Ed25519. Anyone can recompute a hash chain, so this reading says nothing about who signed.";

export const describeReading = (r) => {
  const v = VERDICT[r.kind === "holds" && r.signed === false ? "unsigned" : r.kind];
  const lines = [];
  const brk = r.kind === "altered" ? { seq: r.breakSeq, detail: r.detail }
    : r.kind === "malformed" ? { seq: null, detail: r.detail }
    : null;
  if (r.kind !== "malformed") {
    const read = r.entries.length;
    lines.push(read === r.total ? `${read} entries read.` : `${read} of ${r.total} entries read; nothing after the break is believed.`);
    if (r.signed) lines.push("Ed25519 signatures verified for every enrolled entry.");
    if (r.session?.title) lines.push(`Session: ${r.session.title}${r.session.code ? ` (#${r.session.code})` : ""}.`);
    if (r.sealedAt) lines.push(`Sealed at ${r.sealedAt}.`);
  }
  if (r.kind === "unsealed") lines.push(r.detail);
  const caveat = r.kind !== "malformed" && !r.signed ? CAVEAT : null;
  return { ...v, lines, brk, caveat };
};

/* Receipts verify against the attestation key the record carries: the key
   holder's word on when entries arrived, never a timestamp proof. Anything
   else under attestations is named and left unverified. */
export const describeReceipts = (rc) => {
  const rest = rc.unchecked?.length ? ` Attestations also carry: ${rc.unchecked.join(", ")} (not verified by this reader).` : "";
  if (!rc.receipted) return `No receipts carried; nothing attests when entries were received.${rest}`;
  const head = `${rc.verified} of ${rc.receipted} receipts verify against the attestation key the record carries (the key holder's word on time, not a timestamp proof).`;
  return (rc.problems.length ? `${head} Problems: ${rc.problems.join(" ")}` : head) + rest;
};

/* One entry, one line, for the ledger under the verdict. */
export const entryLine = (e) => {
  const who = e.actor?.name ?? "unresolved";
  const what = [e.action, e.lane, e.note, e.artifact?.name].filter(Boolean).join(" · ");
  return `${e.seq}. ${e.t} ${what} (${who}, ${e.hash.slice(0, 8)})`;
};

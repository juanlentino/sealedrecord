/* Reading → words. Pure: takes the library's reading object, returns text
   the page prints. Nothing here touches the DOM, so it is tested in Node
   against the same vectors the library is tested against. */

const VERDICT = {
  holds: { verdict: "intact", glyph: "✓", headline: "The chain recomputes end to end and the record is sealed." },
  unsealed: { verdict: "unsealed", glyph: "◌", headline: "The chain recomputes, but nothing seals it; this is not a delivered record." },
  altered: { verdict: "broken", glyph: "✕", headline: "The chain fails and the record has been changed since it was sealed." },
  malformed: { verdict: "malformed", glyph: "?", headline: "This is not a record this reader can read." },
};

export const describeReading = (r) => {
  const v = VERDICT[r.kind];
  const lines = [];
  const brk = r.kind === "altered" ? { seq: r.breakSeq, detail: r.detail }
    : r.kind === "malformed" ? { seq: null, detail: r.detail }
    : null;
  if (r.kind !== "malformed") {
    const read = r.entries.length;
    lines.push(read === r.total ? `${read} entries read.` : `${read} of ${r.total} entries read; nothing after the break is believed.`);
    lines.push(r.signed ? "Ed25519 signatures verified for every enrolled entry." : "Signatures not checked: the record carries no signer keys, or this runtime lacks Ed25519.");
    if (r.session?.title) lines.push(`Session: ${r.session.title}${r.session.code ? ` (#${r.session.code})` : ""}.`);
    if (r.sealedAt) lines.push(`Sealed at ${r.sealedAt}.`);
  }
  if (r.kind === "unsealed") lines.push(r.detail);
  return { ...v, lines, brk };
};

export const describeReceipts = (rc) => {
  if (!rc.receipted) return "No receipts carried; nothing attests when entries were received.";
  const head = `${rc.verified} of ${rc.receipted} receipts verify against the attestation key the record carries.`;
  return rc.problems.length ? `${head} Problems: ${rc.problems.join(" ")}` : head;
};

/* One entry, one line, for the ledger under the verdict. */
export const entryLine = (e) => {
  const who = e.actor?.name ?? "unresolved";
  const what = [e.action, e.lane, e.note, e.artifact?.name].filter(Boolean).join(" · ");
  return `${e.seq}. ${e.t} ${what} (${who}, ${e.hash.slice(0, 8)})`;
};

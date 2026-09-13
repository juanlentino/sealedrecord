#!/usr/bin/env node
/* The library with exit codes.
     sealedrecord verify [--json] <record.json> [file ...]
   exit 0 holds with signatures checked · 1 altered or malformed · 2 unsealed
        · 3 usage or I/O · 4 holds, but no signature was checked */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { verifyPackage, verifyReceipts, pcmHash, findAnchors, findPcmAnchors } from "../index.js";

const USAGE = "usage: sealedrecord verify [--json] <record.json> [file ...]";
const EXIT = { holds: 0, altered: 1, malformed: 1, unsealed: 2 };
const exitFor = (r) => (r.kind === "holds" && !r.signed ? 4 : EXIT[r.kind]);
const HEX = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

const readOr3 = (path) => {
  try { return readFileSync(path); } catch (e) { console.error(`cannot read ${path}: ${e.message}`); process.exit(3); }
};

const checkFile = async (path, entries) => {
  const bytes = readOr3(path);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const sha256 = HEX(await crypto.subtle.digest("SHA-256", buf));
  const exact = findAnchors(sha256, entries);
  if (exact.length) return { file: path, match: "exact", seq: exact.map((e) => e.seq) };
  const audio = findPcmAnchors(await pcmHash(buf), entries);
  if (audio.length) return { file: path, match: "same audio", seq: audio.map((e) => e.seq) };
  return { file: path, match: "no match", seq: [] };
};

const main = async (argv) => {
  const json = argv.includes("--json");
  const args = argv.filter((a) => a !== "--json");
  if (args[0] !== "verify" || !args[1]) { console.error(USAGE); return 3; }
  const [, recordPath, ...files] = args;

  let pkg;
  try { pkg = JSON.parse(readOr3(recordPath).toString("utf8")); } catch { pkg = null; }
  const reading = await verifyPackage(pkg);
  const ok = reading.kind !== "malformed";
  const receipts = ok ? await verifyReceipts({ ...pkg, entries: reading.entries }) : null;
  const checks = ok ? await Promise.all(files.map((f) => checkFile(f, reading.entries))) : [];

  if (json) {
    console.log(JSON.stringify({ reading, receipts, files: checks }, null, 2));
    return exitFor(reading);
  }
  const head = reading.kind === "altered" ? `altered at entry ${reading.breakSeq}` : reading.kind;
  console.log(ok && !reading.signed ? `${head} (signatures not checked)` : head);
  if (reading.detail) console.log(`  ${reading.detail}`);
  if (ok) {
    console.log(`  ${reading.entries.length} of ${reading.total} entries read; signatures ${reading.signed ? "verified" : "not checked: no signer keys in the record, or no Ed25519 in this runtime; a hash chain alone says nothing about who signed"}`);
    console.log(`  ${receipts.verified} of ${receipts.receipted} receipts verify against the attestation key the record carries (the key holder's word on time, not a timestamp proof)${receipts.problems.length ? `; ${receipts.problems.join("; ")}` : ""}`);
    if (receipts.unchecked.length) console.log(`  attestations also carry: ${receipts.unchecked.join(", ")} (not verified by this reader)`);
    /* Per-track attribution (FORMAT.md 5.4). A broken or unverified track is
       a fact the record commits to, not a failed check, so it never moves
       the exit code; pipelines that need it read reading.verdicts. */
    if (reading.verdicts.length) console.log(`  tracks: ${reading.verdicts.map((v) => `${v.track?.name ?? v.track?.id} ${v.verdict.key}`).join(", ")}`);
  }
  for (const c of checks) console.log(`${basename(c.file)}: ${c.match}${c.seq.length ? ` (entry ${c.seq.join(", ")})` : ""}`);
  return exitFor(reading);
};

/* Nothing above should throw; if something does, it is a bug in the reader
   and still gets a defined exit, never a stack trace on a user's screen. */
try {
  process.exit(await main(process.argv.slice(2)));
} catch (e) {
  console.error(`reader error: ${e.message}`);
  process.exit(3);
}

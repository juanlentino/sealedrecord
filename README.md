# sealedrecord

Recomputes the hash chain, signatures, and time receipts of a sealed session record and reports whether it holds, and if not, at which entry it breaks.

## Install and verify

```sh
npm install sealedrecord
```

```js
import { readFileSync } from "node:fs";
import { verifyPackage, verifyReceipts } from "sealedrecord";

const pkg = JSON.parse(readFileSync("vectors/record.json", "utf8"));
const reading = await verifyPackage(pkg);
console.log(reading.kind, reading.signed, reading.entries.length);
// holds true 9

const receipts = await verifyReceipts({ ...pkg, entries: reading.entries });
console.log(receipts);
// { total: 9, receipted: 9, verified: 9, problems: [] }
```

A record that has been changed after sealing breaks at the changed entry. The reading names the entry, what was recomputed, and what the file claimed:

```js
pkg.entries[3].note = "chorus wants a triple";
const broken = await verifyPackage(pkg);
console.log(broken.kind, broken.breakSeq);
// altered 4
console.log(broken.detail);
// entry 4 (note) does not match its recorded digest — recomputed c056c813…, recorded a3442bc7…; its content was altered after signing
console.log(broken.entries.length);
// 3   (the accepted prefix; nothing after the break is read)
```

`reading.kind` is one of four values. `holds`: every digest and signature recomputes and the last entry seals the record. `unsealed`: the chain recomputes but was never sealed. `altered`: the chain fails at `breakSeq`. `malformed`: not a record this reader reads (wrong format tag, no entries, over the size limits).

Matching an audio file to the entry that anchored it:

```js
import { hashFile, pcmHashFile, findAnchors, findPcmAnchors } from "sealedrecord";

const { sha256 } = await hashFile(file);            // File or Blob
const exact = findAnchors(sha256, reading.entries);  // same bytes
const sameAudio = exact.length ? exact : findPcmAnchors(await pcmHashFile(file), reading.entries);
// findPcmAnchors matches on the WAV sample data alone, so a retagged copy
// (new metadata chunks, same samples) still finds its entry.
```

## What this does not do

- No audio analysis, fingerprinting, similarity, or detection of any kind. The sample anchor is a SHA-256 over raw PCM bytes; one sample different, no match.
- No authorship inference. A verified signature proves that the holder of a key signed an entry. Who holds the key is outside the format.
- No key management, custody, backup, or revocation. The record carries public keys only.
- No signing user interface, storage, transport, or network access. The library takes bytes and returns a reading.
- No verification of timestamp proofs (OpenTimestamps or similar). They may travel in the record; this library does not check them.
- No reading or writing of C2PA manifests.
- No sample anchor for compressed audio. Only uncompressed WAV (PCM and IEEE float) has one; other files match by file hash only.

## Specification and background

The normative specification is [docs/FORMAT.md](docs/FORMAT.md). It is written so that a second implementation can be built from the document alone: the digest preimage and its stringification rules, the check order, both anchors byte for byte, the receipt canonical form, limits, and the exact outcomes.

The design the format implements was published before this library existed:

- Provenance Over Detection. SSRN 6402298. https://papers.ssrn.com/abstract=6402298
- Provenance as Substrate. SSRN 6730343. https://papers.ssrn.com/abstract=6730343
- Author ORCID: https://orcid.org/0009-0006-8151-5920

The papers argue for what the format commits to and why; the specification says how. Where they differ, the specification governs this implementation.

## Conformance vectors

`vectors/record.json` is a signed record with three signers, nine entries, receipts on every entry, a derivation link, and anchored audio. `vectors/take.wav` matches entry 2 by file hash; `vectors/take-retagged.wav` has the same samples and an extra metadata chunk, so it matches entry 2 by sample anchor only. `test/vectors.test.js` runs against all three, including a tamper case that must fail at entry 4.

A third-party implementation can run against the same files. That is what makes the format independently implementable rather than defined by whatever this code happens to do. `npm run vectors` regenerates the set with fresh keys; the generator verifies its own output and refuses to write a record that does not hold.

## Runtime

- Zero runtime dependencies. One dev dependency (vitest).
- Requires WebCrypto with SHA-256 and Ed25519: Node 20 or later, or any browser whose `crypto.subtle` implements Ed25519. Where Ed25519 is missing, `hasEd25519()` returns false, `verifyPackage` checks the hash chain only, and the reading carries `signed: false`.
- Every computation is SHA-256 or Ed25519 over UTF-8 strings or raw bytes, with lowercase hex output, so results do not depend on the runtime. The test suite itself runs under Node.
- `hashFile` reads the whole file into memory and refuses files over 200 MiB (`MAX_ARTIFACT_BYTES`). That is a limit of this reader, not of the format.

## API

Reading:

- `verifyPackage(pkg)`: recompute the chain and signatures; returns the reading described above.
- `verifyReceipts(pkg)`: verify time receipts against the key carried in `pkg.attestations`; returns counts and problems.
- `hashFile(file)`: `{ name, size, sha256 }` of a File or Blob.
- `pcmHash(arrayBuffer)`: sample anchor of a WAV, or `null` when the buffer is not one this reader understands.
- `pcmHashFile(file)`: the same from a File or Blob.
- `findAnchors(sha256, entries)`: entries whose artifact has this file hash.
- `findPcmAnchors(pcmSha256, entries)`: entries whose artifact has this sample anchor; empty for `null`.
- `fileMatchesArtifact(file, artifact)`: true when the file's hash equals `artifact.sha256`.
- `verdictOf(entries, laneId)`: per-track verdict (`pending`, `unverified`, `broken`, `intact`).

Format constants and primitives, for anyone writing their own reader or producer:

- `PKG_FORMAT`: the format tag a record must carry.
- `GENESIS`: the 64-zero digest the chain starts from.
- `entryHash(prev, index, entry)`: the entry digest, exactly as the specification defines it.
- `hhmm(m)`: the display time derived from a session minute; the reader checks it.
- `receiptCanonical({ sessionId, seq, hash, receivedAt })`: the string a receipt signs.
- `MAX_ARTIFACT_BYTES`, `formatBytes(n)`: the file-size limit and its display form.

Producing, included as a reference so a second producer can be checked against it:

- `buildEvents(rawEvents, signerFor)`: order, sequence, digest, and sign a list of raw events.
- `sealEntry({ prev, seq, raw, privateKey })`: one entry onto an existing chain, identical to what `buildEvents` would produce.
- `buildPackage(lanes, entries, meta, sealedAt, signers, attestations, note)`: the record object.
- `packageText(...)`: the same, serialized with two-space indentation.

WebCrypto wrappers used throughout, exported so callers hash and sign the same way the reader verifies:

- `sha256Hex(string)`, `signText(privateKey, string)`, `verifyText(publicKey, hexSignature, string)`
- `generateSigningKey()`, `exportJwk(key)`, `importPublicJwk(jwk)`, `importPrivateJwk(jwk)`, `hasEd25519()`

## Status and license

Version 0.x. The format tag is `sealedrecord/package.v3`; the digest rules have been stable across the tag's history, and the current constants are the ones intended to freeze. 1.0 will mean the format is frozen: any later change to a committed field, the preimage, or the check order gets a new tag, and this reader keeps reading v3.

Apache-2.0. See [CHANGELOG.md](CHANGELOG.md) for what changed and when.

## Development

```sh
npm ci
npm test
```

Releases are a version bump, a CHANGELOG entry, and a `vX.Y.Z` tag; CI publishes to npm through trusted publishing. To develop against a consuming project without editing its manifest, `npm link` here and `npm link sealedrecord` there.

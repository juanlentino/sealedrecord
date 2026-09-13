# sealedrecord

Verify a sealed session record without trusting whoever produced it.

A record is one JSON file: a chain of entries where every entry's SHA-256 digest commits to its full content and to the digest before it, an Ed25519 signature per enrolled entry, and optional time receipts. This library recomputes all of it and reports where, if anywhere, the chain breaks. It also matches an audio file to the entry that anchored it, by file bytes or, for uncompressed WAV, by sample bytes alone (a retagged copy still finds its record).

WebCrypto only. No runtime dependencies. Same bytes in a browser and in Node 20 or later.

## Use

```js
import { verifyPackage, verifyReceipts, hashFile, pcmHashFile, findAnchors, findPcmAnchors } from "sealedrecord";

const pkg = JSON.parse(text);
const reading = await verifyPackage(pkg);
// reading.kind: "holds" | "unsealed" | "altered" | "malformed"

const receipts = await verifyReceipts({ ...pkg, entries: reading.entries });

const { sha256 } = await hashFile(file);
const exact = findAnchors(sha256, reading.entries);
const byAudio = exact.length ? exact : findPcmAnchors(await pcmHashFile(file), reading.entries);
```

`docs/FORMAT.md` specifies the record format completely enough to write a second reader from the document alone. `vectors/` holds signed conformance records the test suite runs against; `npm run vectors` regenerates them with fresh keys.

## Producing records

The producer half (`buildEvents`, `sealEntry`, `buildPackage`) is included so a second implementation can check its output against a reference. Key custody, storage, and everything around the record are out of scope here.

## What this does not cover

The library reads and produces the record. It deliberately stops there.

- **Key custody.** Who holds a private key, how it is generated, backed up, or revoked, is the producer's problem. The record carries public keys only.
- **Identity.** An actor id is an opaque string. The record proves that whoever holds a key signed an entry; binding that key to a person is outside the format.
- **Timestamp proofs.** OpenTimestamps or similar proofs may ride in `attestations`; this library carries them and does not verify them. Use standard tooling.
- **Content Credentials.** C2PA manifests embedded in audio files are neither read nor written here. The sample anchor survives them because they live in their own chunks.
- **Transport and storage.** Nothing here fetches, uploads, or persists. Hand it bytes; it hands back a reading.
- **Working documents.** Only sealed records are specified. An unsealed session in transit between collaborators is a different document with a different format tag, and this reader rejects it as `malformed` on purpose.
- **Compressed audio.** The sample anchor is defined for uncompressed WAV only. Anything else has no sample anchor, honestly, and matches by file hash alone.
- **Any user interface.** Readings are plain objects with human-readable `detail` strings; rendering them is the caller's job.

## Development

```sh
npm ci
npm test
```

Releases: bump the version and CHANGELOG, commit, push a `vX.Y.Z` tag. CI publishes to npm through trusted publishing; nothing is published by hand.

To develop against a consuming app without editing its manifest: `npm link` here, then `npm link sealedrecord` in the app. A plain `npm install` there restores the published version.

## License

Apache-2.0.

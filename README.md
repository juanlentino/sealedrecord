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

## Development

```sh
npm ci
npm test
```

To develop against a consuming app without editing its manifest: `npm link` here, then `npm link sealedrecord` in the app. A plain `npm install` there restores the published version.

## License

Apache-2.0.

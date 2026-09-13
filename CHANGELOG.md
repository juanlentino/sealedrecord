# Changelog

All notable changes to this library. SemVer, 0.x: minor for new capability, patch for fixes. The record format has its own version tag (see docs/FORMAT.md) and does not move with this number.

## [Unreleased]

### Changed
- **Surface trimmed**: `formatBytes` and `fileMatchesArtifact` are no longer exported; neither has a role in the format (one is display, the other a one-liner over `hashFile`). 26 names remain.
- Reading and receipt `detail` strings use plain punctuation instead of em dashes. Wording otherwise unchanged; the fragments consumers match on (`altered after signing`, `does not connect`, `entry N: receipt does not verify`) are intact.
- README rewritten for a stranger deciding whether to depend on the library: real output for a holding and a broken record, the explicit non-goals, the specification and the papers it comes from, the conformance vectors, runtime facts, the full API surface, and what 1.0 will mean.

## [0.2.0] - 2026-09-13

### Changed
- **Wire constants are vendor-neutral.** The format identifier is now `sealedrecord/package.v3` and the receipt tag `sealedrecord/receipt.v1`. The digest rules are unchanged, so the version suffix stays at v3; the format tag is an envelope field outside every digest and signature, while the receipt tag is inside the receipt-signed message, so receipts written under the old tag no longer verify. Hard rename, no legacy read path: no sealed record existed outside regenerable fixtures.
- Vectors regenerated under the new constants.
- Tests no longer name any product, demo, or third-party format in literals or comments.

## [0.1.2] - 2026-09-13

### Added
- Trusted publishing: pushing a `v*` tag runs the suite, checks the tag against `package.json`, and publishes to npm via GitHub OIDC. No token anywhere.
- README: what the library does not cover, so the boundary is explicit to outside readers.

## [0.1.1] - 2026-09-12

### Added
- `MAX_ARTIFACT_BYTES` and `fileMatchesArtifact` on the public surface; the first consumer's tests pin the cap.

## [0.1.0] - 2026-09-12

### Added
- Repository scaffold: package manifest, Apache-2.0 license, CI, format specification (docs/FORMAT.md), pinned public surface test.
- The reader: `verifyPackage`, `verifyReceipts`; anchors `hashFile`, `pcmHash`, `pcmHashFile`, `findAnchors`, `findPcmAnchors`; format primitives `PKG_FORMAT`, `GENESIS`, `entryHash`, `hhmm`, `verdictOf`, `receiptCanonical`; the reference producer `buildEvents`, `sealEntry`, `buildPackage`, `packageText`; WebCrypto wrappers.
- Conformance vectors in `vectors/` (signed record, anchored WAV, retagged twin) with `npm run vectors` to regenerate, and a suite that runs against them including a tamper case.
- `buildPackage` and `packageText` take an optional trailing `note` (free text, uncommitted) with a neutral default.

# Changelog

All notable changes to this library. SemVer, 0.x: minor for new capability, patch for fixes. The record format has its own version tag (see docs/FORMAT.md) and does not move with this number.

## [Unreleased]

## [0.1.0] - 2026-09-12

### Added
- Repository scaffold: package manifest, Apache-2.0 license, CI, format specification (docs/FORMAT.md), pinned public surface test.
- The reader: `verifyPackage`, `verifyReceipts`; anchors `hashFile`, `pcmHash`, `pcmHashFile`, `findAnchors`, `findPcmAnchors`; format primitives `PKG_FORMAT`, `GENESIS`, `entryHash`, `hhmm`, `verdictOf`, `receiptCanonical`; the reference producer `buildEvents`, `sealEntry`, `buildPackage`, `packageText`; WebCrypto wrappers.
- Conformance vectors in `vectors/` (signed record, anchored WAV, retagged twin) with `npm run vectors` to regenerate, and a suite that runs against them including a tamper case.
- `buildPackage` and `packageText` take an optional trailing `note` (free text, uncommitted) with a neutral default.

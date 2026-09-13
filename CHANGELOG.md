# Changelog

All notable changes to this library. SemVer, 0.x: minor for new capability, patch for fixes. The record format has its own version tag (see docs/FORMAT.md) and does not move with this number.

## [Unreleased]

### Changed
- Page: header and footer span the content width instead of a narrower column; the footer's exit-code sentence matches exit 4.

## [0.6.0] - 2026-09-13

### Added
- **CLI exit code 4**: the chain holds but no signature was checked (no `signers` in the record, or no Ed25519 in the runtime). Exit 0 now means holds with every signature checked, so a pipeline keyed on 0 cannot accept a record whose `signers` were stripped. Readings and `--json` are unchanged; the reader's outcomes are unchanged (FORMAT.md §4.4 still reads `holds`, `signed: false`).
- **`buildEvents` refuses a claimed identity with no key.** A `signerFor` that returns nothing for an enrolled actor throws; hash-only records pass `signerFor` as `null`, as before. A reference producer never emits a record that looks like a stripped one. FORMAT.md §8 states the producer contract and why readers cannot tell the two apart.
- `verifyReceipts` returns `unchecked`: the names of every `attestations` member other than `key` and `receipts`, carried unparsed and unverified (timestamp proofs, for instance). `--json` gains `receipts.unchecked`; nothing existing is renamed or removed.
- Hostile field types produce readings, never exceptions: `prev` and `hash` must be strings (FORMAT.md §5.2 step 2, §9), a non-string signature or receipt signature fails verification instead of throwing, receipts that are not objects are ignored, a null track yields `pending`. The CLI catches anything left and exits 3 with a one-line message. Tests cover null prev, numeric hash, non-numeric m, non-object entry, non-string format, numeric signature, null track.
- Page: a forced `hasEd25519() === false` test path; a no-script fallback in static markup.

### Changed
- CLI and page state what receipts prove: they verify against the attestation key the record carries, the key holder's word on time, not a timestamp proof; both name attestation members that went unverified.
- CLI prints `holds (signatures not checked)` when a reading was produced without signature checks; the following line says why and what a hash chain alone proves. Exit codes unchanged.
- Page: the hero claim is filled in once the runtime has answered whether it can verify Ed25519; the static markup makes no promise about signatures. A reading produced without signature checks carries the caveat inside the reading, for every kind, and `holds` without signatures is its own verdict, "Intact, unsigned", with its own styling. Without scripts or WebCrypto the page says so instead of showing placeholders.
- Page-only changes redeploy the verifier from `main` without a library release (`pages.yml`). The page still runs the published tarball at `package.json`'s version; the deploy refuses if that version is not on the registry. 0.5.3 was a library release with no library change, which this removes the need for.

## [0.5.3] - 2026-09-13

### Changed
- The web verifier reads as a finished page: system sans for prose with mono reserved for digests and code, a two-column layout on wide screens (record left, reading right), card surfaces with a coloured left rule for verdicts and file results, quieter buttons, a spacing scale. No fonts or scripts from anywhere but the site; same markup ids, same behaviour, same tests.
- README's development section describes the whole release path (npm, Pages, GitHub Release assets) and how to build the verifier locally.

## [0.5.2] - 2026-09-13

### Added
- The release workflow creates the GitHub Release itself, with each deliverable attached as its own file: the npm tarball as the registry serves it, the web verifier as an offline zip, the conformance vectors, `FORMAT.md`, and `COMPARISON.md`. Notes come from the CHANGELOG section via `scripts/release-notes.mjs`.

### Fixed
- `test/cli.test.js` wrote scratch files into `dist-site/`, which only exists after the assembler runs; CI went red on Node 20 by test ordering. It uses a temp directory now.

## [0.5.1] - 2026-09-13

### Changed
- README, package description, and the web verifier's footer say the same thing in the same words: one package, three readers (library, `npx sealedrecord verify`, the static page), all running the same code.

## [0.5.0] - 2026-09-13

### Added
- **Command line**: `sealedrecord verify [--json] <record.json> [file ...]`, the library with exit codes (0 holds, 1 altered or malformed, 2 unsealed, 3 usage or I/O). Files after the record are checked as exact, same audio, or no match. Same `index.js`, no dependency; `test/cli.test.js` runs the binary against the vectors.

### Changed
- `COMPARISON.md` names the CAWG identity assertion (1.2, checked against the spec): several named actors can sign parts of one manifest with their own credentials, which corrects the earlier "one signer" wording; what remains different is that identity still resolves to a credential outside the file, and nothing orders the actors in time.
- `COMPARISON.md` states the C2PA specification version it was written against (2.4) and that it is written from inside the content-authenticity community, with corrections invited as issues.

## [0.4.2] - 2026-09-13

### Fixed
- `COMPARISON.md` is actually in the tarball. 0.4.1 claimed it and shipped without it: the `files` edit had not applied.

## [0.4.1] - 2026-09-13

### Added
- `CITATION.cff` naming the two SSRN papers and the ORCID, so GitHub offers "Cite this repository" on the front page. README opens with pointers to the specification, the C2PA comparison, and the live verifier.
- `COMPARISON.md`: how the record format relates to C2PA (one asset versus a chain, certificate identity versus carried keys, inside the file versus beside it, validator surface), where they agree, how they compose, and when each alone is enough. Linked from the README and shipped in the tarball beside the format spec.

## [0.4.0] - 2026-09-13

### Added
- **A static verifier on GitHub Pages** (`site/`, https://juanlentino.github.io/sealedrecord/). Drop or paste a record, get the reading; check a file against it by exact bytes or by audio samples. The page runs the unpacked npm tarball of the version it names, not the checkout, and the conformance vectors are inlined so the example buttons make no request. No storage, no analytics, no scripts from any other origin. Deployed by the release workflow only, after the registry serves the version and the tarball diffs clean against the tag, so the page cannot drift from what consumers install.
- `scripts/site-assemble.mjs` builds `dist-site/` from `site/`, the tarball (`--local` packs the working tree), and the vectors. `test/site-*.test.js` cover the wording, the file check, the byte-identity of the shipped library, and the page's origin allowlist.

## [0.3.0] - 2026-09-13

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

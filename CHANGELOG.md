# Changelog

All notable changes to this library. SemVer, 0.x: minor for new capability, patch for fixes. The record format has its own version tag (see docs/FORMAT.md) and does not move with this number.

## [Unreleased]

### Added
- Issues: a `1.0` milestone with the freeze gate as its issue, one `unclaimed` issue per idea in NOTES.md, labels (`spec-gap`, `unclaimed`, `not-planned`, `freeze`), and two issue templates (specification gap, misjudged record) with the security form and the unclaimed list as contact links. Nothing was backfilled for past work; the CHANGELOG and releases carry that. A pull request template, and the templates and CONTRIBUTING say plainly that a template, a claim, or a proposal creates no obligation to merge.

### Changed
- COMPARISON.md: CAWG Identity Assertion citations name 1.3 (DIF ratified 17 August 2026) and link the versioned URL, since https://cawg.io/identity/ still redirects to 1.2. §5.1.1 and §6.3 keep their numbers in 1.3, and §6.3 is unchanged from 1.2. **What an action's time is worth, corrected.** The claim that an action's time is the claim generator's statement and not the actor's signature was wrong. An action may carry the time it took place (C2PA 2.4 §18.15), and a contributor's identity assertion may reference the actions assertion and so sign over it (CAWG 1.3 §6.1). Every such signature is made once, after rendering, against the hard binding (CAWG 1.3 §5.1.1, §6.1), the order of actions in the array does not imply the order performed, with the only exception constraining the first element (C2PA 2.4 §18.15.1, §18.15.2), and §18.15.4.3 calls the time a simple non-trusted time-stamp. The conclusion is unchanged: neither specification seals sequence as it happens.
- COMPARISON.md: temporal regions of interest and their composition with CAWG identity assertions, from C2PA 2.4 §18.2, §18.3.8, §18.15.4.6 and CAWG 1.2 §5.1.1, §6.3. What that binds (the actor to a span of the finished asset), when it is signed (after rendering, against the hard binding), and the mapping from record entries to actions with temporal regions in "How they compose". Prompted by a question on the CAI Discord.
- **What the freeze rests on, stated.** The Go reader is a second reader, not an independent one: it was written from FORMAT.md without reading the JavaScript, and it shares an author with the specification and the reference reader. The vectors, the fuzz, and that reader test whether the document determines behaviour, not whether a stranger reads it the same way; no third-party implementation exists. FORMAT.md §11 says the freeze rests on this, and that a third-party reader later finding an undetermined outcome is answered by a new tag under §11, with v3 records reading as they did. README, `conformance/go/README.md`, and the explainer page say the same; the word "independent" is gone from all three.
- README and CONTRIBUTING name the differential fuzz, the lint, the Go tests as a development step, and the explainer page; the status line calls 0.8 the freeze candidate.

### Added
- `explain.html` beside the verifier: what is being verified, what each verdict means, what it does not mean, why the page can be trusted. No scripts on it at all; linked once from the lede and once from the footer, so the verifier page itself gains one link and nothing else.

## [0.8.0] - 2026-09-13

### Added
- **Differential fuzz between the two readers.** `scripts/fuzz.mjs` makes seeded mutations of the vector (drop or retype fields, move or duplicate entries, poison signers, receipts, tracks); `test/differential.test.js` runs them through the reference reader and the Go reader and fails on any disagreement in kind, break position, `signed`, or verdicts, or on any exception. 300 cases in CI (`FUZZ_N` raises it; 10,000 pass). It found three more places the document did not determine behaviour, now sentences in it: a `tracks` element that is not an object, or has no `id`, matches no entry; a present `artifact` must be a non-null object (step 2); a `null` in `note`, `derivedFrom`, `alg`, or `pcm_sha256` commits as empty, the same as absent, while §4.5's checks still reject `null` in `derivedFrom` and `alg`.
- `oxlint` in CI and as `npm run lint`.
- **Security review pass** (no forgery or bypass path found; prototype pollution, key confusion, receipt replay, JWK tricks, page XSS, WAV bounds all checked). Its two actionable findings, both resource caps: `MAX_RECORD_BYTES` (32 MiB) refuses a record file before parsing in the CLI and the page; the CLI's file check refuses files over `MAX_ARTIFACT_BYTES` by name instead of reading them. 27 exports.
- **Correctness review pass** (walk order, preimage, verdicts, receipts, exit codes, API list, Node 20 all checked): one asymmetry fixed, an `actor` that is an array is now refused at step 2 like the Go reader does; FORMAT.md says arrays are not objects there.
- **A second reader, from the document alone.** `conformance/go/` implements FORMAT.md in Go with the standard library, written without reading the JavaScript, and passes every vector case; CI runs it beside the reference. Six places where the document did not determine behaviour are now sentences in it: `m` must be a JSON number (checked at step 2, so coercion cannot read `null` as minute zero); a `signers` value that is not an object, arrays included, is treated as absent; an importable JWK is exactly `kty OKP`, `crv Ed25519`, a 32-byte `x`, other members ignored; conforming producers emit `m`, `derivedFrom`, and `artifact.size` as integers; receipts match entries by strict equality of `seq` and the canonical takes `seq` and `hash` from the entry; step 9's failure wording is not normative.
- FORMAT.md §11 records the stripped-`signers` asymmetry as known and accepted in v3, with the reader's answer (`signed`, exit 4) and the v4 question it would be.

### Changed
- Reader: `m` that is not a number is `altered` at step 2; `signers` as an array reads as absent; `importPublicJwk` imports only `kty`, `crv`, `x`. Each affects only records that no conforming producer emits.
- **Producers refuse what would commit as the text `undefined`.** `buildEvents` and `sealEntry` throw on an event with no `lane` field (null is a lane); `buildPackage` throws on attestations for a session with no id. Reader outcomes unchanged; FORMAT.md §3, §7, §8 state the producer contract.

### Added
- `docs/FORMAT.md` section 11, status and change policy: the tag is the contract, any outcome change is a new tag, 1.0 freezes v3, and a fork that changes the rules uses its own namespace in the tag, stated as a conformance rule rather than a licence term, since the licence cannot enforce it. `CONTRIBUTING.md` gains forks and decisions sections. `SECURITY.md`: what counts as a security issue for a verifier, how to report privately, what is out of scope. Private vulnerability reporting enabled on the repository.
- `CONTRIBUTING.md`, and a contributing section in the README: the repository is open to pull requests and forks; NOTES.md is an unclaimed list, not a backlog; what a change needs and which changes need a conversation first.

### Changed
- `NOTES.md` moved to the repository root, beside `CHANGELOG.md` and `COMPARISON.md`, away from `docs/FORMAT.md`, which is normative and ships in the tarball. The notes do not ship and should not: a wishlist next to the specification invites the conflation the rename exists to prevent. Heading is now "Notes on the command line", so the framing no longer depends on a disclaimer.

## [0.7.0] - 2026-09-13

### Added
- **Per-track verdicts on the command line and the page.** The library always computed them; only `--json` carried them. Human CLI output prints `tracks: <name> <verdict>, ...`; the page lists them under the reading. Nothing for a record with no tracks. Exit codes unchanged: a broken or unverified track is a fact the record commits to (FORMAT.md 4.1, 5.4), not a failed check, so pipelines that need attribution read `reading.verdicts`. Removed from the notes.
- **Build stamp.** `dist-site/build.json` names the library version the page was assembled from and the commit that last touched the page's inputs (`site/`, the assembler, the vectors, `package.json`). No timestamp, so it changes only when the deployable would. The page never reads it; it is for maintainers, `curl`, and the offline zip, where it states build provenance, not deployment.
- **Post-deploy verification.** Both Pages jobs now fetch the live page after deploying and fail unless its stamp is the build they just made (polling through the ten-minute cache). A bad or skipped deploy fails in the run a maintainer is already watching.
- **Daily freshness check** (`freshness.yml`, also by hand): compares the live stamp with `main` and the registry's latest version; its badge is on the README so a stale page shows on the front page.
- `pages.yml` can be run by hand (`workflow_dispatch`), with the same registry guard.
- `docs/NOTES.md`: notes on where the command line is going (interactive session, one entry in full, report, diff, explain a break, batch and stdin and folder checks, per-track verdicts, `spec`, colour) and what it will not grow into.

### Changed
- README's runtime section says what each surface does when Ed25519 is missing (exit 4, "Intact, unsigned").
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

# Threat model

## What this project does and where untrusted input enters

sealedrecord is a verifier for sealed session records (format `sealedrecord/package.v3`, specified in `docs/FORMAT.md`). It recomputes a SHA-256 hash chain, checks Ed25519 entry signatures and time receipts, and matches audio files to their anchors. It ships as one package with three readers: the library (`index.js`, `src/`), a command line (`bin/sealedrecord.js`), and a static web verifier (`site/`).

**All input is untrusted.** A record is a JSON file that someone else produced and that the verifier is asked to judge. Audio files passed for anchor matching are untrusted too. The verifier holds no private keys and makes no network calls (`docs/FORMAT.md`, README "What this does not do").

The security property, from `SECURITY.md`: **the verifier must never report `holds` for a record that does not hold under the rules in `docs/FORMAT.md`, and must never throw instead of returning a reading.** A field of the wrong type is a reading (`malformed` or `altered`), never an exception (`docs/FORMAT.md` section 9).

## Components that matter most / least

- **Most:** `src/verify.js`, `src/chain.js`, `src/crypto.js`, `src/pkg.js` (the walk in `docs/FORMAT.md` section 5, the digest in section 4.1, signature and receipt checks in sections 5.2 and 7), and `src/pcm.js` / `src/artifact.js` (WAV parsing and anchors, section 6).
- **High:** `bin/sealedrecord.js` (reads files from paths given on the command line; exit codes are part of the contract).
- **Lower:** `site/` (the browser verifier: it renders a reading of an untrusted record, so injection into the page through record fields is in scope; styling is not).
- **Reference producers** (`src/append.js`, `src/attest.js`): in scope only where a crafted input makes the reader disagree with the specification.
- **`conformance/go`:** an independent second reader built from the specification alone. A disagreement between the two readers on the same input is a specification gap or a bug, and worth reporting.

## How to exercise it

- `npm test` runs the vitest suite, including a differential fuzz (`test/differential.test.js`, `scripts/fuzz.mjs`) that feeds seeded mutations of `vectors/record.json` through both readers. `FUZZ_N` raises the count.
- `cd conformance/go && go test ./...` runs the second reader against the vectors.
- `node bin/sealedrecord.js verify <record.json> [audio files]` is the command line.
- `vectors/` holds a valid record and two WAV files (one retagged) to mutate from.

## How you rate severity

- **Critical:** a record (or a record plus audio) that reads `holds`, or a track that reads `intact`, when the specification says it must not: a forged or altered entry, a signature or receipt that verifies when it should fail, a chain break that is not reported, an anchor that matches the wrong audio.
- **High:** an input that makes any reader throw, hang, or exhaust memory instead of returning a reading, within the documented limits (record file 32 MiB, audio 200 MiB, at most 10,000 entries and 200 signers). Script injection into the web verifier from record fields.
- **Medium:** a wrong `breakSeq`, `detail`, or verdict that does not turn a failing record into a passing one; the two readers disagreeing on the kind of a reading.
- **Low:** command-line path handling and messages, cosmetic issues in the web verifier.

## Anything to leave alone

- Out of scope by design (README "What this does not do"): key custody, identity, authorship inference, verifying OpenTimestamps or other timestamp proofs, C2PA, sample anchors for compressed audio, and links between records.
- A stripped `signers` map reading `holds` with `signed: false` is documented behavior (`docs/FORMAT.md` section 4.4); the command line exits 4 for it.
- `scripts/live-check.mjs` and the deploy scripts for the public site are maintenance tooling, not part of the verifier.

## Reports and patches

Please include the record (or a script that builds it) and the reading you got versus the one the specification requires, citing the `docs/FORMAT.md` section. Patches should keep both readers in agreement and add the case to the vitest suite.

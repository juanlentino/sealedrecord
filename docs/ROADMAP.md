# Roadmap

What the command line grows into, in order, and what it will not become. Nothing here is scheduled; each item lands when it is built and tested, as its own 0.x minor. The constraints do not move: zero runtime dependencies, WebCrypto only, no network, nothing persisted, no model, no product.

## 1. Interactive shell

`sealedrecord` with no arguments opens a full-screen session: a welcome panel naming the library version and what this runtime can verify, a prompt, and a status line. The prompt takes a small vocabulary and a bare path means `verify`:

```
› record.json          verify it; the record stays loaded
› take.wav             check a file against the loaded record
› entries              the ledger, one line per entry
› entry 4              everything committed at entry 4
› receipts             receipts and what they rest on
› help · quit
```

Built on Node's `readline` and plain ANSI sequences. With arguments, the existing one-shot `verify` runs unchanged, so pipelines see no difference. Exit codes stay as documented.

## 2. Entry drill-down

`entry N` prints every committed field of one entry, its artifact and derivation link, its actor, and, when the chain broke there, the recomputed and recorded digests in full. The same output is available non-interactively as `sealedrecord entry <record> <N>`.

## 3. Report

`report [path]` writes the current reading, receipts, and file checks as text or JSON, for handing to someone who was not at the terminal. Same content as `--json`, plus the human wording, with the library version and the format tag on the first line.

## 4. Diff

`sealedrecord diff a.json b.json` reads both records and names the first entry where they diverge, with both digests. A session continued in two places, or a suspected edit, becomes one line of output.

## Not planned

- **Producer commands** (`sign`, `seal`). Making records requires key custody, and custody is outside this package by design. The library's producer half exists as a reference for second implementations, not as a tool.
- **A watcher** over a folder. A daemon has its own failure modes and nobody has asked.
- **A model.** Explaining readings in prose would mean a network, a provider, and a vendor. The readings already say what they checked and what they did not.
- **Timestamp-proof verification.** Carried, named as unverified, left to standard OpenTimestamps tooling.

# Notes on the command line

Ideas for what the command line could do, and what it will not. None of it is scheduled or promised, and none of it is reserved: anyone may pick an idea here, build it, and open a pull request, or fork the repository and take it elsewhere. Each idea is also an open issue labelled `unclaimed`; comment there to claim one. Claiming reserves nothing and promises nothing on either side: a pull request is judged on what it is when it arrives. An idea leaves this file when it ships, as a 0.x minor, or when it is answered as a not-fit. See CONTRIBUTING.md for what a contribution needs. The rules do not move for any of them: no runtime dependencies, WebCrypto only, no network, nothing saved, no model.

**An interactive session.** Run `sealedrecord` with nothing after it and get a full-screen prompt instead of a usage line: a panel with the library version and what this runtime can verify, then `›`. Type a path to a record and it is verified and stays loaded. Type a path to an audio file and it is checked against that record. `entries` lists the ledger, `entry 4` shows one entry in full, `receipts` says what the receipts rest on, `help` and `quit` do what they say. That is the whole vocabulary. Node's `readline` and some ANSI is enough to build it. The one-shot `sealedrecord verify …` keeps working exactly as now, exit codes included.

**One entry in full.** Every committed field, the artifact, the derivation link, the actor, and when the chain broke there, both digests unabbreviated. Also as `sealedrecord entry <record> <N>` for scripts.

**A report to hand over.** `report` writes the reading, receipts, and file checks to a file, text or JSON, with the library version and the format tag on the first line, for someone who was not at the terminal.

**Diff.** `sealedrecord diff a.json b.json`: the first entry where two records part ways, with both digests. A session continued in two places, or a quiet edit, in one line.

**Explain a break.** For a record that fails, print the preimage the reader recomputed for the breaking entry field by field, beside what the file carried, so a person sees which field moved rather than only that the digest did. This is the one most useful thing to hand a stranger with a broken record.

**More than one at a time.** `sealedrecord verify *.json`, one line per record and a summary, exit code the worst of the set. `check-dir takes/` runs every audio file in a folder against the loaded record and lists exact, same audio, or no match per file. `sealedrecord verify -` reads the record from stdin.

**`spec`.** Prints the format tag, the digest recipe, the limits, and the library version, so the tool describes its own format without a document lookup.

**Colour, carefully.** Once the interactive session exists: the verdict word only, never as the sole signal, and `NO_COLOR` honoured.

**Maybe, later, if asked.** A conformance runner that scores a second implementation's output against the vectors, once a second implementation exists. A `--quiet` that prints only the kind, for pipelines that want less than `--json`.

**Things this will not grow into.** Signing or sealing from the command line: that needs key custody, and custody is outside this package on purpose; the producer functions in the library are a reference for second implementations, not a tool. A folder watcher: a daemon has its own failure modes and nobody has asked. A model that explains readings: that means a network and a vendor, and the readings already say what was checked and what was not. Verifying timestamp proofs: carried, named as unverified, left to standard OpenTimestamps tooling. Plugins: a surface for third-party code inside a verifier is the wrong shape. Update checks: network. A searchable record browser over a directory: storage and indexing, a product's job. Reading C2PA manifests: a different specification and a large dependency; see COMPARISON.md.

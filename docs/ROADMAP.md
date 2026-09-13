# Where the command line is going

Notes, not commitments. Things land when they are built and tested, each as a 0.x minor. The rules stay the same throughout: no runtime dependencies, WebCrypto only, no network, nothing saved, no model.

**An interactive session.** Run `sealedrecord` with nothing after it and get a full-screen prompt instead of a usage line: a panel with the library version and what this runtime can verify, then `›`. Type a path to a record and it is verified and stays loaded. Type a path to an audio file and it is checked against that record. `entries` lists the ledger, `entry 4` shows one entry in full, `receipts` says what the receipts rest on, `help` and `quit` do what they say. That is the whole vocabulary. Node's `readline` and some ANSI is enough to build it. The one-shot `sealedrecord verify …` keeps working exactly as now, exit codes included.

**One entry in full.** Every committed field, the artifact, the derivation link, the actor, and when the chain broke there, both digests unabbreviated. Also as `sealedrecord entry <record> <N>` for scripts.

**A report to hand over.** `report` writes the reading, receipts, and file checks to a file, text or JSON, with the library version and the format tag on the first line, for someone who was not at the terminal.

**Diff.** `sealedrecord diff a.json b.json`: the first entry where two records part ways, with both digests. A session continued in two places, or a quiet edit, in one line.

**Things this will not grow into.** Signing or sealing from the command line: that needs key custody, and custody is outside this package on purpose; the producer functions in the library are a reference for second implementations, not a tool. A folder watcher: a daemon has its own failure modes and nobody has asked. A model that explains readings: that means a network and a vendor, and the readings already say what was checked and what was not. Verifying timestamp proofs: carried, named as unverified, left to standard OpenTimestamps tooling.

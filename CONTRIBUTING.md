# Contributing

The repository is open to contributions and to forks. NOTES.md lists ideas nobody has claimed; COMPARISON.md and docs/FORMAT.md welcome corrections; a second implementation of the format, in any language, can test itself against `vectors/` and is welcome to report where the specification was unclear.

## What a contribution needs

- Tests first. A change arrives with the test that fails without it. `npm test` must pass on Node 20 and 24, including the assembled site (`node scripts/site-assemble.mjs --local` runs inside the suite).
- A line in CHANGELOG.md under Unreleased. Releases are cut separately; do not bump the version or tag.
- The rules of the package: zero runtime dependencies, WebCrypto only, no network at runtime, nothing persisted without the user asking, no model, no product or vendor names anywhere in the repository.
- The prose register: plain declarative sentences, no em dashes, in code comments, docs, and page copy alike.
- Files stay small; split rather than grow.

## What needs a conversation first

Anything that changes a reader outcome: the digest preimage, the committed fields, the check order, or what `verifyPackage` returns for a record that reads one way today. docs/FORMAT.md is normative, and its status section says such a change means a new format tag. Open an issue before writing code.

The list under "Things this will not grow into" in NOTES.md is not a rule against forks. It says what this repository will not merge, and why, so nobody spends a weekend on it here.

## Licence

Apache-2.0. By contributing you agree that your contribution is licensed the same way.

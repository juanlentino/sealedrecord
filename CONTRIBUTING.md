# Contributing

The repository is open to contributions and to forks. NOTES.md lists ideas nobody has claimed; COMPARISON.md and docs/FORMAT.md welcome corrections; a second implementation of the format, in any language, can test itself against `vectors/` and is welcome to report where the specification was unclear.

## What a contribution needs

- Tests first. A change arrives with the test that fails without it. `npm test` must pass on Node 20 and 24, including the assembled site and the differential fuzz against the Go reader (Go is needed locally for that test; it skips without it and CI has it). `npm run lint` clean. A change to reader behaviour changes both readers and `docs/FORMAT.md` together, and `cd conformance/go && go test ./...` must still pass.
- A line in CHANGELOG.md under Unreleased. Releases are cut separately; do not bump the version or tag.
- The rules of the package: zero runtime dependencies, WebCrypto only, no network at runtime, nothing persisted without the user asking, no model, no product or vendor names anywhere in the repository.
- The prose register: plain declarative sentences, no em dashes, in code comments, docs, and page copy alike.
- Files stay small; split rather than grow.

## What needs a conversation first

Anything that changes a reader outcome: the digest preimage, the committed fields, the check order, or what `verifyPackage` returns for a record that reads one way today. docs/FORMAT.md is normative, and its status section says such a change means a new format tag. Open an issue before writing code.

The list under "Things this will not grow into" in NOTES.md is not a rule against forks. It says what this repository will not merge, and why, so nobody spends a weekend on it here.

## Forks

Fork freely; the licence allows it. Two things keep forks and this repository from confusing each other's users. A fork that changes any rule in docs/FORMAT.md must use its own namespace in the format tag, as FORMAT.md section 11 says, so records and readers never claim a conformance they do not have. And a fork is its own project: it does not present itself as this one, and the name `sealedrecord` is not licensed as a trademark (Apache-2.0, section 6).

## Decisions

One maintainer merges. A pull request that meets the requirements above and stays inside the rules is merged; one that does not is answered with the reason. A disagreement about direction is resolved by the maintainer here and by a fork elsewhere, and both outcomes are fine.

## Licence

Apache-2.0. By contributing you agree that your contribution is licensed the same way.

A pull request is a proposal. Opening one, or claiming an unclaimed issue, does not mean it will be merged; one maintainer decides, with the reason given either way (CONTRIBUTING.md, Decisions). A fork is always available if the answer is no.

**What this changes, in one or two sentences**

**Checklist**
- [ ] A test that fails without this change, added first
- [ ] `npm test` passes on Node 20 and 24; `npm run lint` clean
- [ ] If reader behaviour changed: both readers and docs/FORMAT.md changed together, and `cd conformance/go && go test ./...` passes
- [ ] No existing outcome for a conforming record changes (or this is a discussed new format tag, linked below)
- [ ] CHANGELOG.md line under Unreleased; no version bump, no tag
- [ ] No runtime dependency, no network at runtime, nothing persisted, no product or vendor name
- [ ] Plain declarative sentences, no em dashes, in code comments and docs

**Issue**

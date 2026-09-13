# How this format relates to C2PA

C2PA (Coalition for Content Provenance and Authenticity) already specifies signed provenance for media, so a second format needs a reason to exist. The reason is that the two describe different objects and rest on different trust, and that they fit together. This document says where the line falls, in enough detail that the claim can be checked against both specifications.

It was written by a member of the content-authenticity community against C2PA Technical Specification 2.4 (https://spec.c2pa.org/). When the specification moves, this document should move with it. Corrections are welcome as issues on this repository.

## What each one is

**A C2PA manifest** is a signed statement about one asset: what it is, how it was made or edited, and which earlier assets it came from (ingredients). It is embedded in the asset's own container, bound to the asset's bytes by a hard binding, and signed by a certificate whose validity a validator judges against a trust list.

**A sealed record** (this format, `docs/FORMAT.md`) is a session log. Entries from one or more people are chained in order over a span of time; every entry's digest commits to its own content and to the digest before it; each enrolled entry carries an Ed25519 signature from its actor; the signers' public keys travel in the record. It lives outside the assets and names them by hash, and for uncompressed audio by a hash of the samples alone.

## Where they differ

### 1. A finished asset versus a sequence of work

A manifest speaks for one asset at the moment it was signed. Earlier contributors appear as ingredients pointing backward, each with its own manifest, and the CAWG identity assertion (section 2 below) lets several named actors sign parts of one manifest. None of these mechanisms establishes sequence. Nothing in C2PA or CAWG can state that three people acted in a given order over a given hour and that nothing has since been reordered, inserted, or removed. A sealed record states exactly that. Change entry 4 and the chain breaks at entry 4, and the reader reports both digests.

### 2. Credentialed identity versus carried keys

A C2PA signature is as strong as the certificate chain behind it. A signer outside the validator's trust list is reported as unknown, which is the correct behaviour for a design that delegates identity to certificate authorities. A sealed record delegates nothing: its signers' public keys are in the file, the reader recomputes every signature against them, and whether a key belongs to a person is left to whoever needs the answer. Receipts and timestamp proofs can attest on top of the record afterwards, as metadata about the chain that never enters it.

The closest mechanism on the C2PA side is the Creator Assertions Working Group's identity assertion (CAWG Identity Assertion 1.2, https://cawg.io/identity/). A named actor signs a set of the manifest's assertions with their own credential, separately from the claim signer, and one manifest may carry several such assertions from distinct actors. That moves identity a real distance away from the claim signer's certificate. Two differences remain. The credential is still an X.509 certificate or a verifiable credential from an issuer, so identity resolves to something outside the file, where a sealed record resolves to a public key inside it and stops. And identity assertions within one manifest carry no order relative to each other; each says which assertions an actor vouches for, and none says who acted after whom.

### 3. Inside the file versus beside it

A manifest is embedded in the asset and goes wherever the asset goes, until something strips it. Re-encoding, re-containering, and many distribution paths drop embedded manifests; the C2PA specification acknowledges this and defines soft bindings (fingerprints and watermarks) to recover the connection. A sealed record was never inside the asset. The sample anchor recomputes from the audio bytes alone, so a file retagged after sealing still finds its entry, and a file whose manifest was stripped still verifies against the record that names it. A transcode changes the samples and defeats the anchor, the same limit a hard binding has.

### 4. Validator dependencies

A C2PA validator needs a trust list, X.509 chain validation, CBOR and COSE parsing, and the container-specific JUMBF logic. The reference reader for this format needs WebCrypto SHA-256 and Ed25519, and the specification is written so that a second reader can be built from the document without consulting this code. A smaller surface is easier to verify independently. That is the design goal; it says nothing about which design is better for the problems C2PA was built for.

## Where they agree

Both commit to bytes with SHA-256 and sign with standard algorithms. The act of signing is kept apart from the claim of identity on each side: CAWG places the named actor's signature beside the claim signer's, and a sealed record places the actor's signature on the entry and leaves the binding of key to person outside the format. A valid manifest proves a signature was made, and a holding record proves integrity and order; neither proves that what was signed is true. The limits of hard bindings are stated plainly in both specifications.

## How they compose

The natural arrangement has the manifest point at the record. An assertion in the manifest carries the session identifier and the sample anchor, so a validator reading the manifest has a lookup path to the log the asset came from, and a reader of the log can confirm the asset by its anchor. The manifest travels with the file and is what platforms know how to display. The record survives the file's travels and holds the sequence of work.

Should C2PA later define a durable, multi-signer, chained session assertion, the right move for this format is to specify an encoding of the record as that assertion and keep the same reader. What the format commits to does not depend on the container it rides in.

## When C2PA alone is enough

A single asset, one signer, provenance established at publication, and identity anchored in a certificate authority the audience already trusts. A sealed record adds nothing there. Use the manifest.

## When a sealed record is the missing piece

More than one contributor, or work that happens over time before anything is published. Identity that cannot or should not depend on a certificate authority. Files that will be stripped, retagged, or re-hosted before anyone asks where they came from. Verification that has to work with no institution consulted.

## Background

The design argument behind the record format, including why provenance is treated as a substrate onto which institutions attest, is in:

- Provenance Over Detection. SSRN 6402298. https://papers.ssrn.com/abstract=6402298
- Provenance as Substrate. SSRN 6730343. https://papers.ssrn.com/abstract=6730343

The C2PA Technical Specification (2.4 at the time of writing) and the companion Soft Binding API are at https://spec.c2pa.org/. Statements about them above describe the published design at a general level; the specification carries the normative text.

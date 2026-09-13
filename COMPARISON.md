# How this format relates to C2PA

A frequent and fair question: C2PA (Coalition for Content Provenance and Authenticity) already specifies signed provenance for media. Why does a second format exist? Short answer: the two describe different objects and rest on different trust. They compose. This document says where the line is, without advocacy, so the question has a checkable answer.

## What each one is

**A C2PA manifest** is a signed statement about one asset: what it is, how it was made or edited, and which earlier assets it came from (ingredients). It is embedded in the asset's own container, bound to the asset's bytes by a hard binding, and signed by a certificate whose validity a validator judges against a trust list.

**A sealed record** (this format, `docs/FORMAT.md`) is a session log: an ordered chain of entries from one or more people over a span of time, where every entry's digest commits to its own content and to the digest before it, each enrolled entry carries an Ed25519 signature from its actor, and the record carries the signers' public keys itself. It lives outside the assets. It names them by hash, and for uncompressed audio by a hash of the samples alone.

A manifest describes a result. A record describes the work.

## Where they differ

### 1. One asset, one signer, one moment versus a chain

A manifest speaks for one asset at the moment it was signed. Multiple contributors appear only as ingredients pointing backward, each with its own manifest. There is no primitive in C2PA for "these three people acted in this order over this hour, and none of it has been reordered, inserted, or removed since." A sealed record is that primitive. Change entry 4 and the chain breaks at entry 4; the reader says so with both digests.

### 2. Institutional identity versus carried keys

A C2PA signature is only as good as the certificate chain behind it. A signer outside the validator's trust list is reported as unknown, which is correct behaviour for that design: identity is delegated to certificate authorities. A sealed record delegates nothing. Its signers' public keys travel in the file, the reader recomputes every signature against them, and whether a key belongs to a person is a question the format deliberately leaves to whoever needs to answer it. Receipts and timestamp proofs can then attest on top of the record; they are metadata about the chain, never part of it.

This is the difference in one sentence: C2PA proves who, according to an authority; a sealed record proves that the same key signed, in this order, according to arithmetic.

### 3. Inside the file versus beside it

A manifest is embedded in the asset, so it goes wherever the asset goes, until something strips it. Re-encoding, re-containering, and many distribution paths drop embedded manifests; the C2PA specification acknowledges this and defines soft bindings (fingerprints and watermarks) to recover the connection. A sealed record was never inside the asset. The sample anchor recomputes from the audio bytes alone, so a file that was retagged after sealing still finds its entry, and a file whose manifest was stripped still verifies against the record it is named in. What the record cannot survive is a transcode, which changes the samples; that is the same limit a hard binding has.

### 4. Validator dependencies

A C2PA validator needs a trust list, X.509 chain validation, CBOR and COSE parsing, and the container-specific JUMBF logic. The reference reader for this format needs WebCrypto SHA-256 and Ed25519 and nothing else, and the specification is written so that a second reader can be built from the document without reading this code. That is a design goal, not a claim of superiority: a smaller surface is easier to verify independently, which is the whole point of a verifier.

## Where they agree

Both commit to bytes with SHA-256. Both sign with standard primitives. Both treat the signed object as evidence, not as truth about the world: a valid manifest proves a signature, not honesty, and a holding record proves integrity and order, not the accuracy of what people signed into it. Both are honest about the limits of hard bindings.

## How they compose

The natural arrangement is one where the manifest points at the record. A C2PA assertion can carry the session identifier and the sample anchor; a validator that reads the manifest then has a lookup path to the log the asset came from, and a reader of the log can confirm the asset by its anchor. The label on the bottle names the ledger. Neither replaces the other: the manifest is what travels with the file and what platforms know how to display; the record is what survives the file's travels and what proves the sequence of work.

If C2PA later defines a durable, multi-signer, chained session assertion, the right move for this format is to specify an encoding of the record as that assertion and keep the same reader. The format is the commitment scheme, not the container.

## When C2PA alone is enough

Single asset, single signer, provenance established at publication, identity anchored in a certificate authority the audience already trusts. In that case a sealed record adds nothing you need. Say so and use the manifest.

## When a sealed record is the missing piece

More than one contributor. Work that happens over time before anything is published. Identity that cannot or should not depend on a certificate authority. Files that will be stripped, retagged, or re-hosted before anyone asks where they came from. Verification that must be possible with no institution consulted.

## Background

The design argument behind the record format, including why provenance is treated as a substrate that institutions attest onto rather than a service they provide, is in:

- Provenance Over Detection. SSRN 6402298. https://papers.ssrn.com/abstract=6402298
- Provenance as Substrate. SSRN 6730343. https://papers.ssrn.com/abstract=6730343

The C2PA specification is at https://c2pa.org/specifications/. Statements about it above describe the published design at a general level; consult the specification for the normative text.

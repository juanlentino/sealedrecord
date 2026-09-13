# Sealed record format, version `sealedrecord/package.v3`

This document specifies the record completely enough to implement an independent reader. Where it and the reference implementation disagree, the reference implementation is the bug report; the record bytes are the authority.

The format identifier `sealedrecord/package.v3` and the receipt tag `sealedrecord/receipt.v1` are opaque protocol constants. Readers compare them byte for byte and attach no meaning to them. The version suffix counts revisions of the digest rules (v3 is the third), and the namespace is simply where this specification lives; a namespace was renamed once before any record left the room, which is why the suffix did not restart at v1.

## 1. Encoding

A record is one UTF-8 JSON document. All digests and signatures are lowercase hexadecimal strings. All hashing and signing operates on the UTF-8 bytes of the strings described below, never on raw binary except where §6 says so.

## 2. Top level

| Field | Type | Committed | Notes |
|---|---|---|---|
| `format` | string | no | Must equal `sealedrecord/package.v3`. Anything else is `malformed`. |
| `note` | string | no | Free text for humans. Readers ignore it. |
| `session` | object | partly | `id` (optional string), `code`, `title`. Only `id` participates in receipts (§7). |
| `sealedAt` | string | no | The `t` of the sealing entry. Display only. |
| `tracks` | array | no | `{ id, name, origin }`. Used only to compute per-track verdicts (§5.4). |
| `signers` | object | no | Map from actor id to an Ed25519 public JWK (`kty: "OKP"`, `crv: "Ed25519"`, `x`). Optional. |
| `attestations` | object | no | `{ key, receipts, ... }`, see §7. Optional. |
| `entries` | array | yes | The chain. 1 to 10000 entries. |

"Committed" means the value participates in an entry digest. Nothing at the top level is committed directly; the chain is committed entry by entry, and the reader believes nothing else in the file.

## 3. Entry

| Field | Type | Required | Committed |
|---|---|---|---|
| `seq` | integer | yes | as the zero-based index `seq - 1` |
| `m` | number | yes | yes |
| `t` | string | yes | no, but must equal `hhmm(m)` (§4.3) |
| `room` | string | yes | yes |
| `lane` | string or null | emitted always | yes |
| `action` | string | yes | yes |
| `note` | string | no | yes (absent commits as empty) |
| `artifact` | object | no | yes (§4.2) |
| `derivedFrom` | integer | no | yes (absent commits as empty) |
| `alg` | string | no | yes (absent commits as empty) |
| `actor` | object | yes | `id` (string or null) and `name` both committed |
| `prev` | string | yes | yes, as the first preimage component |
| `hash` | string | yes | the digest; recomputed, never believed |
| `sig` | string | no | Ed25519 over `hash` (§4.4) |

The reference producer never emits `lane` as undefined; a reader recomputing the digest stringifies whatever it finds (§4.1), so a missing `lane` commits as the text `undefined` and will not match a digest produced with `null`.

## 4. The chain

### 4.1 Digest

```
GENESIS = 64 ASCII zeros
prev_0  = GENESIS
hash_i  = SHA-256( preimage_i )   as lowercase hex
prev_i  = hash_{i-1}
```

`preimage_i` is the following components joined with `|` (U+007C), no trailing separator, `i` being the zero-based index:

```
prev | i | action | lane | actor.id | actor.name | m | room | note' | artifact' | derivedFrom' | alg'
```

Stringification follows JavaScript template conversion: numbers in shortest decimal form, `null` as the text `null`, `undefined` as the text `undefined`, booleans as `true`/`false`. The primed components use these substitutions:

- `note'`: `note` if present, else empty string.
- `derivedFrom'`: `derivedFrom` if present, else empty string.
- `alg'`: `alg` if present, else empty string.
- `artifact'`: empty string when the entry has no artifact; otherwise `sha256:name:size:pcm'` where `pcm'` is `pcm_sha256` if present else empty. Note the `:` separator inside this component.
- `actor`: when absent, treated as `{ id: null, name: "unresolved" }`.

Because a pipe or colon inside a field value is not escaped, the format relies on the digest committing to the whole string, not on field boundaries being recoverable from it.

### 4.2 Artifact

```json
{ "name": "take.wav", "size": 35244, "sha256": "<hex>", "pcm_sha256": "<hex>" }
```

`sha256` is the SHA-256 of the file's bytes as delivered. `pcm_sha256` is the sample anchor of §6, present only for WAV files the anchor understands. `name` and `size` commit, so a renamed or padded file breaks the entry.

### 4.3 Session clock

`m` is a session-relative minute count. `t` is derived from it and must match or the record is `altered`:

```
hhmm(m) = pad2(14 + floor(m / 60)) + ":" + pad2(m mod 60)
```

The 14 is a fixed downbeat, not a time zone. `t` is display; `m` is what is committed. `sealedAt` at the top level is the `t` of the last entry and is not checked.

### 4.4 Signature

An entry whose `actor.id` is a non-empty string is enrolled. When the record carries `signers`, every enrolled entry must carry `sig`, and `signers[actor.id]` must be an importable Ed25519 public JWK, and

```
Ed25519.verify( signers[actor.id], sig_bytes, UTF8(hash) ) == true
```

`sig` is the 64-byte signature as 128 hex characters. The signed message is the UTF-8 bytes of the lowercase hex digest string, not the 32 raw digest bytes.

When the record carries no `signers`, or the runtime cannot do Ed25519, signatures are not checked and the reading reports `signed: false`. An unimportable key in `signers` fails every entry by that actor. Reader implementations may need to drop a JWK `alg` member before import; the curve field is authoritative.

### 4.5 Derivation and scheme fields

- `derivedFrom`, when present, must be an integer `1 <= derivedFrom < seq`. It names an earlier entry by `seq`.
- `alg`, when present, must be `"Ed25519"`. Any other value is `altered` at that entry, since this reader cannot verify it.

## 5. Reading a record

### 5.1 Malformed

Return `{ kind: "malformed", detail }` when: the value is not an object; `format` differs from `sealedrecord/package.v3`; `entries` is not a non-empty array; `entries.length > 10000`; `signers` has more than 200 keys.

### 5.2 Walk

Walk `entries` in order with `prev = GENESIS`. Stop at the first entry that fails any check, in this order, and report `{ kind: "altered", breakSeq, detail }` where `breakSeq` is the one-based position:

1. Each of `seq`, `m`, `room`, `action`, `actor`, `prev`, `hash` is present (not undefined).
2. `actor` is a non-null object, and `prev` and `hash` are strings (a digest is a string; any other type fails here).
3. `seq == index + 1`.
4. `prev == running prev`.
5. `derivedFrom`, if present, is an integer in `[1, index]`.
6. `alg`, if present, is `"Ed25519"`.
7. Recomputed digest (§4.1) equals `hash`.
8. `t == hhmm(m)`.
9. If signatures are being checked and `actor.id` is truthy: `sig` present, key present and importable, signature verifies.

After each accepted entry, set `running prev = hash` and mark the entry `sealed = Boolean(actor.id)`.

Entries after the break are not read. `entries` in the result holds the accepted prefix.

### 5.3 Outcome

If no entry failed: the record is `unsealed` unless the last entry's `action` is exactly `package sealed`, in which case it `holds`.

The result carries `session`, `sealedAt`, `entries` (accepted, with `sealed` added), `tracks`, `verdicts`, `total` (count in the file), and `signed` (whether signatures were checked).

### 5.4 Track verdicts

For each `tracks[i]`, take the accepted entries whose `lane` equals `tracks[i].id` (strict equality; the producer uses the lane string itself as the id). Then:

- no entries: `pending`
- first entry not sealed: `unverified` (origin unverified)
- any later entry not sealed: `broken`, with `gap` naming the first such entry
- otherwise: `intact`

## 6. Anchors

### 6.1 File anchor

`sha256` = SHA-256 over the entire file, lowercase hex. The reference reader refuses files over 200 MiB because it digests in memory; that is a reader limit, not a format rule.

### 6.2 Sample anchor (`pcm_sha256`)

Defined only for RIFF/WAVE files with an uncompressed `fmt ` chunk. Parse the container yourself; do not decode through an audio API.

1. Bytes 0..3 are `RIFF`, bytes 8..11 are `WAVE`, file is at least 12 bytes. Otherwise: no anchor.
2. From offset 12, read chunks: 4-byte id, 4-byte little-endian size, body. If `body + size` exceeds the file: no anchor. Advance by `8 + size + (size mod 2)`; odd bodies are padded.
3. `fmt ` chunk: size at least 16; format tag (u16 LE at body+0) is 1 (PCM) or 3 (IEEE float), otherwise no anchor. Read `channels` (u16 LE at body+2), `rate` (u32 LE at body+4), `bits` (u16 LE at body+14).
4. `data` chunk: the body bytes, exactly `size` long.
5. If more than one `fmt ` or `data` chunk appears, the last one read wins.
6. Both chunks required, else no anchor.
7. Anchor = SHA-256 over `UTF8("pcm|" + channels + "|" + rate + "|" + bits + "|")` followed by the `data` body bytes, lowercase hex.

Any parse failure yields no anchor (`null`), never an error. Metadata chunks (`LIST`, `bext`, `id3 `) do not participate, so retagging leaves the anchor unchanged; a transcode or resample changes it.

### 6.3 Matching

`findAnchors(sha256, entries)` returns every entry whose `artifact.sha256` equals the file hash. `findPcmAnchors(pcm, entries)` returns every entry whose `artifact.pcm_sha256` equals the sample anchor, and returns nothing for a null anchor. A reader shows an exact-bytes match and a samples-only match differently; the second means the delivered file is not the anchored file, only the same audio.

## 7. Time receipts

`attestations` is metadata about the chain, never part of it. A record with none still verifies.

```json
"attestations": {
  "key": { "kty": "OKP", "crv": "Ed25519", "x": "..." },
  "receipts": [ { "seq": 1, "received_at": "2026-08-14T18:05:00.000Z", "sig": "<hex>" } ]
}
```

A receipt for entry `seq` is valid when

```
Ed25519.verify( attestations.key, sig_bytes, UTF8(canonical) ) == true
canonical = "sealedrecord/receipt.v1|" + session.id + "|" + seq + "|" + hash + "|" + received_at
```

with `hash` taken from the entry (verify the chain first; receipts vouch for time, not content) and `session.id` stringified as in §4.1 (a missing id commits as `undefined`). Drop any JWK `alg` member before importing `attestations.key`.

The reader reports `total` entries, `receipted` (entries with a receipt), `verified`, a `problems` list, and `unchecked`: the names of every other member of `attestations`, carried unparsed and unverified. Entries without a receipt are not a problem. An unimportable key is one problem and no receipts verify. Receipts that are not objects are ignored.

What a receipt proves: the holder of `attestations.key` saw this hash at this time. It is as strong as trust in that key and its clock, no stronger. Other attestation members (for example OpenTimestamps proofs) may ride alongside; this specification does not verify them.

## 8. Producing a record

A conforming producer sorts raw events by `m` ascending, assigns `seq` from 1, derives `t`, computes each digest per §4.1, signs each enrolled entry's digest with that actor's private key, and serialises exactly the fields listed in §2 and §3, omitting optional fields that are absent rather than emitting `null`. A producer that signs at all signs every enrolled entry and carries every signer's key; a record with `actor.id` set, no `sig`, and no `signers` is what a hash-only producer emits, and a reader cannot tell it from a signed record whose `signers` were removed (§4.4). Readers report `signed: false` for both; consumers must read that field rather than the outcome alone. The last entry of a finished record has `action` equal to `package sealed`.

## 9. Limits and refusals

| Limit | Value | Result |
|---|---|---|
| entries | 1..10000 | `malformed` outside |
| signers | at most 200 | `malformed` above |
| file anchor input | reader policy, 200 MiB in the reference | error, not a reading |
| field of the wrong type | any | a reading, never an exception: `malformed` at the top level (§5.1), `altered` at the entry (§5.2); a non-string `sig` or receipt signature is a failed signature |

## 10. Test vectors

`vectors/` in this repository holds a signed record that `holds`, a WAV that matches an entry by file hash, and a retagged copy of the same WAV that matches only by sample anchor. `npm run vectors` regenerates them with fresh keys; the digests change, the structure does not.

## 11. Status and change policy

The format tag is the contract. `sealedrecord/package.v3` names exactly the rules in this document; a reader that implements them reads every v3 record, and a record that follows them reads the same under every conforming reader.

Any change that alters an outcome for an existing record gets a new tag. That covers the digest preimage (§4.1), the committed fields (§3), the check order (§5.2), the outcome rules (§5.3, §5.4), the anchor definitions (§6), and the receipt canonical form (§7). Wording, limits that only refuse more hostile input, and additions that leave every existing outcome unchanged do not.

Version 1.0 of the reference implementation will mean this document is frozen at v3. After that, a change to the rules is a new tag, and the reference reader keeps reading v3 alongside it.

Anyone may fork this format under the licence. A fork that changes any rule above must use its own namespace in the tag (`example.org/package.v1`, not `sealedrecord/package.v4`), so that no reader can mistake one format for the other and no record can claim conformance it does not have. A fork that keeps the rules and only ships a different reader keeps the tag; conformance is what the vectors test, not who wrote the code.


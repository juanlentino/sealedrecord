# A second reader, from the document alone

This is an independent implementation of docs/FORMAT.md in Go, written without reading the JavaScript, using only the standard library (crypto/sha256, crypto/ed25519). It exists to test one claim: that the specification is complete enough to build a reader from. `go test ./...` runs it against `../../vectors/`, the same files the reference reader is tested against, and CI runs both.

It is not a package and is not published. Anyone building a reader in another language can start here or from the document; every place this one had to guess became a sentence in FORMAT.md, which is the point.

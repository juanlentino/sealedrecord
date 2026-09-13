# A second reader, from the document alone

This is an implementation of docs/FORMAT.md in Go using only the standard library (crypto/sha256, crypto/ed25519), written against the document without reading the JavaScript. It shares an author with the specification and the reference reader. Building a reader from the document catches places where the document does not determine an outcome, and it caught six; each became a sentence in FORMAT.md. It cannot catch a place where both readers assume the same thing, because the same mind wrote both. A reader by someone else is the test that has not been run. `go test ./...` runs it against `../../vectors/`, the same files the reference reader is tested against, and CI runs both.

It is not a package and is not published. Anyone building a reader in another language can start here or from the document; every place this one had to guess became a sentence in FORMAT.md, which is the point.

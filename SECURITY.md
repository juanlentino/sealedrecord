# Security

A verifier's security property is that it never reports `holds` for a record that does not hold. If you find a record, or a way of constructing one, that this reader accepts when the rules in docs/FORMAT.md say it should not, or a way to make the reader throw instead of returning a reading, that is a security issue.

Report it privately through GitHub's vulnerability reporting on this repository (Security tab, "Report a vulnerability"). Include the record or a script that builds it. Expect an acknowledgement within seven days. A fix ships as a patch release with a CHANGELOG entry naming the class of input; the report is credited unless you ask otherwise.

Out of scope: key custody, identity, timestamp-proof verification, and anything the README lists under "What this does not do". A stripped `signers` map reading `holds` with `signed: false` is documented behaviour (FORMAT.md section 4.4); the command line exits 4 for it.

Supported: the latest 0.x release. Older versions are not patched.

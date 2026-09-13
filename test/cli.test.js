import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* The CLI is the library with exit codes. Every case runs the real binary
   against the real vectors. */
const BIN = fileURLToPath(new URL("../bin/sealedrecord.js", import.meta.url));
const V = fileURLToPath(new URL("../vectors/", import.meta.url));
const T = mkdtempSync(join(tmpdir(), "sealedrecord-cli-")) + "/";
const run = (...args) => spawnSync("node", [BIN, ...args], { encoding: "utf8" });

const tampered = () => {
  const p = JSON.parse(readFileSync(`${V}record.json`, "utf8"));
  p.entries[3].note += "!";
  const f = `${T}tampered.json`;
  writeFileSync(f, JSON.stringify(p));
  return f;
};

describe("sealedrecord verify", () => {
  it("exits 0 and says holds for the vector", () => {
    const r = run("verify", `${V}record.json`);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^holds/m);
    expect(r.stdout).toMatch(/9 of 9 receipts/);
  });

  it("exits 1 and names the entry for a tampered record", () => {
    const r = run("verify", tampered());
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/^altered at entry 4/m);
    expect(r.stdout).toMatch(/recomputed [0-9a-f]{8}/);
  });

  it("exits 2 for an unsealed chain", () => {
    const p = JSON.parse(readFileSync(`${V}record.json`, "utf8"));
    p.entries.pop();
    writeFileSync(`${T}unsealed.json`, JSON.stringify(p));
    expect(run("verify", `${T}unsealed.json`).status).toBe(2);
  });

  it("exits 1 for malformed input and 3 for a missing file", () => {
    writeFileSync(`${T}nope.json`, "{}");
    expect(run("verify", `${T}nope.json`).status).toBe(1);
    expect(run("verify", `${T}does-not-exist.json`).status).toBe(3);
    expect(run().status).toBe(3);
  });

  it("checks files: exact, same audio, no match", () => {
    const r = run("verify", `${V}record.json`, `${V}take.wav`, `${V}take-retagged.wav`, BIN);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/take\.wav: exact/);
    expect(r.stdout).toMatch(/take-retagged\.wav: same audio/);
    expect(r.stdout).toMatch(/sealedrecord\.js: no match/);
  });

  it("--json prints the reading object", () => {
    const r = run("verify", "--json", `${V}record.json`);
    const j = JSON.parse(r.stdout);
    expect(j.reading.kind).toBe("holds");
    expect(j.receipts.verified).toBe(9);
  });
});

describe("what the CLI says about receipts and about bad input", () => {
  it("states the trust basis of receipts and names unverified attestation members", () => {
    const p = JSON.parse(readFileSync(`${V}record.json`, "utf8"));
    p.attestations.anchors = [{ proof_b64: "AAAA" }];
    writeFileSync(`${T}with-anchors.json`, JSON.stringify(p));
    const r = run("verify", `${T}with-anchors.json`);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/receipts verify against the attestation key the record carries/);
    expect(r.stdout).toMatch(/not a timestamp proof/);
    expect(r.stdout).toMatch(/attestations also carry: anchors \(not verified by this reader\)/);
    const j = JSON.parse(run("verify", "--json", `${T}with-anchors.json`).stdout);
    expect(j.receipts.unchecked).toEqual(["anchors"]);
  });

  it("exits 1 with a reading, not a stack trace, on hostile field types", () => {
    const p = JSON.parse(readFileSync(`${V}record.json`, "utf8"));
    p.entries[1].prev = null; p.entries[0].hash = 42;
    writeFileSync(`${T}hostile.json`, JSON.stringify(p));
    const r = run("verify", `${T}hostile.json`);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/^altered at entry 1/m);
    expect(r.stderr).not.toMatch(/TypeError|at .*\.js:\d+/);
  });

  it("says when signatures were not checked, on the same line as the verdict", () => {
    const p = JSON.parse(readFileSync(`${V}record.json`, "utf8"));
    delete p.signers;
    writeFileSync(`${T}stripped.json`, JSON.stringify(p));
    const r = run("verify", `${T}stripped.json`);
    expect(r.stdout).toMatch(/^holds \(signatures not checked\)/m);
  });
});

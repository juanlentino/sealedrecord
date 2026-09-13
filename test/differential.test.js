import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPackage } from "../index.js";
import { mutate } from "../scripts/fuzz.mjs";

/* Differential fuzz: the same mutated records through the reference reader
   and the Go reader built from the document alone. Any disagreement in kind
   or breakSeq is a specification gap or a bug; any exception is a bug. The
   seed is fixed, so a failure reproduces. */
const GO = fileURLToPath(new URL("../conformance/go", import.meta.url));
const hasGo = spawnSync("go", ["version"]).status === 0;
const vector = JSON.parse(readFileSync(new URL("../vectors/record.json", import.meta.url), "utf8"));
const N = Number(process.env.FUZZ_N ?? 300);

describe.skipIf(!hasGo)("the two readers agree on mutated records", () => {
  it(`${N} seeded mutations, no disagreement, no exception`, async () => {
    const dir = mkdtempSync(join(tmpdir(), "sealedrecord-fuzz-"));
    const files = [];
    const js = [];
    for (let i = 0; i < N; i++) {
      const { pkg, what } = mutate(vector, i);
      const f = join(dir, `${i}.json`);
      writeFileSync(f, JSON.stringify(pkg));
      files.push(f);
      const r = await verifyPackage(pkg); /* must not throw */
      js.push({ what, kind: r.kind, breakSeq: r.breakSeq ?? 0, signed: r.signed ?? false, verdicts: (r.verdicts ?? []).map((v) => v.verdict.key) });
    }
    const go = spawnSync("go", ["run", "./cmd/read", ...files], { cwd: GO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    expect(go.status, go.stderr).toBe(0);
    const lines = go.stdout.trim().split("\n").map((l) => JSON.parse(l));
    const disagreements = [];
    lines.forEach((g, i) => {
      const j = js[i];
      const same = g.kind === j.kind && (g.breakSeq ?? 0) === j.breakSeq && (j.kind === "malformed" || (g.signed === j.signed && JSON.stringify(g.verdicts ?? []) === JSON.stringify(j.verdicts)));
      if (!same) disagreements.push({ i, what: j.what, js: j, go: g });
    });
    expect(disagreements).toEqual([]);
  }, 120000);
});

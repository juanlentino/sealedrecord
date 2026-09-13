import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

/* The assembled site is what Pages serves. Two things must be true of it:
   the library it runs is byte-identical to this checkout (the tarball is
   built from it), and the page reaches no origin but the ones it links. */
const ROOT = new URL("../", import.meta.url);
const OUT = new URL("../dist-site/", import.meta.url);
const read = (p) => readFileSync(new URL(p, OUT), "utf8");

beforeAll(() => {
  execFileSync("node", ["scripts/site-assemble.mjs", "--local"], { cwd: ROOT, stdio: "pipe" });
}, 60000);

describe("assembled site", () => {
  it("runs the packed library, byte for byte", () => {
    expect(read("sealedrecord/index.js")).toBe(readFileSync(new URL("index.js", ROOT), "utf8"));
    for (const f of readdirSync(new URL("src/", ROOT))) {
      expect(read(`sealedrecord/src/${f}`)).toBe(readFileSync(new URL(`src/${f}`, ROOT), "utf8"));
    }
    expect(existsSync(new URL("sealedrecord/package.json", OUT))).toBe(true);
  });

  it("ships an explainer page with no scripts and no foreign origins, linked from the verifier", () => {
    const x = read("explain.html");
    expect(x).not.toMatch(/<script/);
    const allowed = /^https:\/\/(github\.com\/juanlentino\/sealedrecord|papers\.ssrn\.com\/abstract=(6402298|6730343)|orcid\.org\/0009-0006-8151-5920)/;
    for (const m of x.matchAll(/https?:\/\/[^\s"'<>)]+/g)) expect(m[0]).toMatch(allowed);
    for (const h of ["What is being verified", "What a verdict means", "What a verdict does not mean", "Why this page can be trusted"]) expect(x).toContain(h);
    expect(x).not.toMatch(/—/);
    expect((read("index.html").match(/href="explain\.html"/g) ?? []).length).toBe(2);
  });

  it("inlines the vectors so the example buttons make no request", () => {
    const v = read("vectors.js");
    expect(v).toMatch(/"format": ?"sealedrecord\/package\.v3"/);
    expect(v).toMatch(/export const TAKE_WAV = "UklGR/);        /* base64 of "RIFF" */
    expect(v).toMatch(/export const TAKE_RETAGGED_WAV = "UklGR/);
  });

  it("references no origin but the allowed links", () => {
    const html = read("index.html");
    const urls = [...html.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]);
    const allowed = /^https:\/\/(github\.com\/juanlentino\/sealedrecord|papers\.ssrn\.com\/abstract=(6402298|6730343)|orcid\.org\/0009-0006-8151-5920)/;
    for (const u of urls) expect(u).toMatch(allowed);
    for (const must of ["docs/FORMAT.md", "github.com/juanlentino/sealedrecord", "abstract=6402298", "abstract=6730343", "orcid.org/0009-0006-8151-5920"]) {
      expect(html).toContain(must);
    }
    expect(html).toMatch(/aria-live/);
    /* No unconditional signature claim in static markup; the runtime fills it in. */
    expect(html).not.toMatch(/Every digest and signature is recomputed/);
    expect(html).toMatch(/<noscript>/);
    expect(html).toMatch(/nothing on this page has verified anything/i);
    expect(html).not.toMatch(/<link[^>]+(preconnect|prefetch|dns-prefetch)/);
    expect(html).not.toMatch(/<script[^>]+src="https?:/);
    for (const f of ["verifier.js", "render.js", "anchors.js"]) expect(read(f)).not.toMatch(/fetch\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|sessionStorage|document\.cookie/);
  });
});

describe("build stamp", () => {
  it("names the library version and the last commit that touched the page's inputs, without a timestamp", () => {
    const stamp = JSON.parse(read("build.json"));
    expect(stamp.library).toBe(JSON.parse(readFileSync(new URL("package.json", ROOT), "utf8")).version);
    expect(stamp.source).toMatch(/^[0-9a-f]{40}$/);
    expect(stamp.inputs).toEqual(["site/", "scripts/site-assemble.mjs", "vectors/", "package.json"]);
    expect(Object.keys(stamp).sort()).toEqual(["inputs", "library", "source"]); /* nothing that changes per run */
  });
  it("is served as a static file the page does not fetch", () => {
    for (const f of ["verifier.js", "render.js", "anchors.js"]) expect(read(f)).not.toMatch(/build\.json/);
  });
});

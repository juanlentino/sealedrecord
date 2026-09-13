package conformance

// The reader, FORMAT.md 5. Built from the document alone.

import (
	"bytes"
	"crypto/ed25519"
	"encoding/json"
	"fmt"
	"math"
)

type Verdict struct {
	Track any
	Key   string
	Gap   map[string]any
}

type Reading struct {
	Kind     string
	BreakSeq int
	Detail   string
	Entries  []map[string]any
	Total    int
	Signed   bool
	Verdicts []Verdict
}

// ParseRecord decodes JSON keeping number text, so stringification can
// follow 4.1 without a lossy float round trip.
func ParseRecord(b []byte) (map[string]any, error) {
	d := json.NewDecoder(bytes.NewReader(b))
	d.UseNumber()
	var v any
	if err := d.Decode(&v); err != nil {
		return nil, err
	}
	m, ok := v.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("not a JSON object")
	}
	return m, nil
}

func malformed(detail string) Reading { return Reading{Kind: "malformed", Detail: detail} }

func Verify(pkg map[string]any) Reading {
	if f, _ := pkg["format"].(string); f != Format {
		return malformed(fmt.Sprintf("unknown format %v", pkg["format"]))
	}
	raw, ok := pkg["entries"].([]any)
	if !ok || len(raw) == 0 {
		return malformed("the package carries no entries")
	}
	if len(raw) > 10000 {
		return malformed("more than 10000 entries")
	}
	signers, hasSigners := pkg["signers"].(map[string]any)
	if hasSigners && len(signers) > 200 {
		return malformed("more than 200 signer keys")
	}
	keys := map[string]ed25519.PublicKey{}
	if hasSigners {
		for id, jwk := range signers {
			if k, ok := importJwk(jwk); ok {
				keys[id] = k
			}
		}
	}
	prev := Genesis
	var accepted []map[string]any
	breakSeq, detail := 0, ""
	for i, ev := range raw {
		e, _ := ev.(map[string]any)
		if seq, d := checkEntry(e, i, prev, hasSigners, keys); seq != 0 {
			breakSeq, detail = seq, d
			break
		}
		actor := actorOf(e)
		id, _ := actor["id"].(string)
		e["sealed"] = id != ""
		accepted = append(accepted, e)
		prev = e["hash"].(string)
	}
	tracks, _ := pkg["tracks"].([]any)
	r := Reading{Entries: accepted, Total: len(raw), Signed: hasSigners, Verdicts: verdicts(accepted, tracks)}
	if breakSeq != 0 {
		r.Kind, r.BreakSeq, r.Detail = "altered", breakSeq, detail
		return r
	}
	if a, _ := accepted[len(accepted)-1]["action"].(string); a != "package sealed" {
		r.Kind, r.Detail = "unsealed", "the chain recomputes, but the package was never sealed"
		return r
	}
	r.Kind = "holds"
	return r
}

// checkEntry runs 5.2 steps 1 to 9 for one entry; a non-zero seq is the break.
func checkEntry(e map[string]any, i int, prev string, checkSigs bool, keys map[string]ed25519.PublicKey) (int, string) {
	seq := i + 1
	if e == nil {
		return seq, "entry is not an object"
	}
	for _, f := range []string{"seq", "m", "room", "action", "actor", "prev", "hash"} {
		if _, ok := e[f]; !ok {
			return seq, "missing " + f
		}
	}
	if a, ok := e["actor"].(map[string]any); !ok || a == nil {
		return seq, "actor is not an object"
	}
	if _, ok := e["prev"].(string); !ok {
		return seq, "prev is not a digest string"
	}
	if _, ok := e["hash"].(string); !ok {
		return seq, "hash is not a digest string"
	}
	if _, ok := number(e["m"]); !ok {
		return seq, "m is not a number"
	}
	if s, ok := number(e["seq"]); !ok || s != float64(seq) {
		return seq, "sequence number out of order"
	}
	if e["prev"].(string) != prev {
		return seq, "the chain does not connect here"
	}
	if dv, ok := e["derivedFrom"]; ok {
		d, isNum := number(dv)
		if !isNum || d != math.Trunc(d) || d < 1 || d > float64(i) {
			return seq, "derivedFrom is not an earlier entry"
		}
	}
	if alg, ok := e["alg"]; ok && alg != "Ed25519" {
		return seq, "unsupported signature scheme"
	}
	if EntryHash(prev, i, e) != e["hash"].(string) {
		return seq, "does not match its recorded digest"
	}
	mv, mPresent := e["m"]
	if t, _ := e["t"].(string); t != HHMM(mv, mPresent) {
		return seq, "displayed time does not match the committed position"
	}
	if id, _ := actorOf(e)["id"].(string); checkSigs && id != "" {
		k, ok := keys[id]
		if _, hasSig := e["sig"]; !hasSig || !ok {
			return seq, "an enrolled entry must be signed"
		}
		if !verifyHex(k, e["sig"], e["hash"].(string)) {
			return seq, "fails signature verification"
		}
	}
	return 0, ""
}

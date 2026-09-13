package conformance

// Per-track verdicts, FORMAT.md 5.4, and receipts, FORMAT.md 7.

import (
	"encoding/json"
	"sort"
)

// same is JavaScript strict equality over decoded JSON values.
func same(a, b any) bool {
	switch x := a.(type) {
	case json.Number:
		y, ok := b.(json.Number)
		if !ok {
			return false
		}
		fx, _ := x.Float64()
		fy, _ := y.Float64()
		return fx == fy
	case string:
		y, ok := b.(string)
		return ok && x == y
	case nil:
		return b == nil
	case bool:
		y, ok := b.(bool)
		return ok && x == y
	}
	return false
}

func verdicts(entries []map[string]any, tracks []any) []Verdict {
	out := make([]Verdict, 0, len(tracks))
	for _, tv := range tracks {
		t, _ := tv.(map[string]any)
		var id any
		if t != nil {
			id = t["id"]
		}
		var own []map[string]any
		for _, e := range entries {
			if same(e["lane"], id) {
				own = append(own, e)
			}
		}
		v := Verdict{Track: tv, Key: "intact"}
		switch {
		case len(own) == 0:
			v.Key = "pending"
		case own[0]["sealed"] != true:
			v.Key = "unverified"
		default:
			for _, e := range own {
				if e["sealed"] != true {
					v.Key, v.Gap = "broken", e
					break
				}
			}
		}
		out = append(out, v)
	}
	return out
}

type Receipts struct {
	Total, Receipted, Verified int
	Problems                   []string
	Unchecked                  []string
}

func VerifyReceipts(pkg map[string]any, entries []map[string]any) Receipts {
	out := Receipts{Total: len(entries), Problems: []string{}, Unchecked: []string{}}
	att, _ := pkg["attestations"].(map[string]any)
	for k := range att {
		if k != "key" && k != "receipts" {
			out.Unchecked = append(out.Unchecked, k)
		}
	}
	sort.Strings(out.Unchecked)
	list, ok := att["receipts"].([]any)
	if att == nil || att["key"] == nil || !ok {
		return out
	}
	key, ok := importJwk(att["key"])
	if !ok {
		out.Problems = append(out.Problems, "the attestation key in this package is not importable")
		return out
	}
	session, _ := pkg["session"].(map[string]any)
	sid, sidPresent := session["id"]
	for _, e := range entries {
		var r map[string]any
		for _, rv := range list {
			if rm, ok := rv.(map[string]any); ok && same(rm["seq"], e["seq"]) {
				r = rm
			}
		}
		if r == nil {
			continue
		}
		out.Receipted++
		canonical := "sealedrecord/receipt.v1|" + stringify(sid, sidPresent) + "|" + str(e, "seq") + "|" + str(e, "hash") + "|" + str(r, "received_at")
		if verifyHex(key, r["sig"], canonical) {
			out.Verified++
		} else {
			out.Problems = append(out.Problems, "entry "+str(e, "seq")+": receipt does not verify")
		}
	}
	return out
}

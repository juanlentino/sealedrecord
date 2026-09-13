package conformance

// The digest and the session clock, FORMAT.md 4.1 and 4.3.

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
)

const Genesis = "0000000000000000000000000000000000000000000000000000000000000000"
const Format = "sealedrecord/package.v3"

func sha256Hex(b []byte) string {
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}

func actorOf(e map[string]any) map[string]any {
	if a, ok := e["actor"].(map[string]any); ok && a != nil {
		return a
	}
	return map[string]any{"id": nil, "name": "unresolved"}
}

// optional is the primed component of 4.1: the value when present and not
// null, else the empty string.
func optional(e map[string]any, k string) string {
	if v, ok := e[k]; ok && v != nil {
		return stringify(v, true)
	}
	return ""
}

func artifactComponent(e map[string]any) string {
	a, ok := e["artifact"].(map[string]any)
	if !ok || a == nil {
		return ""
	}
	return str(a, "sha256") + ":" + str(a, "name") + ":" + str(a, "size") + ":" + optional(a, "pcm_sha256")
}

// EntryHash is preimage_i of 4.1, hashed.
func EntryHash(prev string, i int, e map[string]any) string {
	actor := actorOf(e)
	pre := strings.Join([]string{
		prev, fmt.Sprint(i), str(e, "action"), str(e, "lane"), str(actor, "id"), str(actor, "name"),
		str(e, "m"), str(e, "room"), optional(e, "note"), artifactComponent(e), optional(e, "derivedFrom"), optional(e, "alg"),
	}, "|")
	return sha256Hex([]byte(pre))
}

func pad2(s string) string {
	if len(s) < 2 {
		return strings.Repeat("0", 2-len(s)) + s
	}
	return s
}

// HHMM is 4.3 for a numeric m. A non-numeric m stringifies as JavaScript
// would arrive at NaN, which can never equal a recorded t.
func HHMM(mv any, present bool) string {
	m, ok := number(mv)
	if !ok {
		if !present || mv == nil {
			m = 0 // JavaScript: `m ?? 0` in the producer; the reader uses m as given, null/60 = 0
		} else {
			return "NaN"
		}
	}
	h := 14 + math.Floor(m/60)
	r := math.Mod(m, 60)
	return pad2(jsFloat(h)) + ":" + pad2(jsFloat(r))
}

func jsFloat(f float64) string {
	if f == math.Trunc(f) {
		return fmt.Sprintf("%.0f", f)
	}
	return fmt.Sprintf("%g", f)
}

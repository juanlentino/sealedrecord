package conformance

// Stringification per FORMAT.md 4.1: JavaScript template conversion of
// JSON values. Numbers keep their decoded text when integral; null is the
// text "null"; a missing key is the text "undefined".

import (
	"encoding/json"
	"math"
	"strconv"
	"strings"
)

func stringify(v any, present bool) string {
	if !present {
		return "undefined"
	}
	switch x := v.(type) {
	case nil:
		return "null"
	case string:
		return x
	case bool:
		if x {
			return "true"
		}
		return "false"
	case json.Number:
		return jsNumber(x)
	case []any:
		parts := make([]string, len(x))
		for i, e := range x {
			parts[i] = stringify(e, true)
		}
		return strings.Join(parts, ",")
	case map[string]any:
		return "[object Object]"
	}
	return "undefined"
}

// jsNumber renders a JSON number the way a JavaScript template would:
// integral values without a fraction, others in shortest round-trip form.
func jsNumber(n json.Number) string {
	f, err := n.Float64()
	if err != nil {
		return string(n)
	}
	if f == math.Trunc(f) && math.Abs(f) < 1e21 {
		return strconv.FormatFloat(f, 'f', 0, 64)
	}
	return strconv.FormatFloat(f, 'g', -1, 64)
}

func field(m map[string]any, k string) (any, bool) {
	v, ok := m[k]
	return v, ok
}

func str(m map[string]any, k string) string {
	v, ok := field(m, k)
	return stringify(v, ok)
}

func number(v any) (float64, bool) {
	n, ok := v.(json.Number)
	if !ok {
		return 0, false
	}
	f, err := n.Float64()
	return f, err == nil
}

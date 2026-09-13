// read: one line of JSON per record given, for differential testing
// against the reference reader. Output: {"file","kind","breakSeq","signed","verdicts"}.
package main

import (
	"encoding/json"
	"fmt"
	"os"

	conformance "sealedrecord/conformance"
)

func main() {
	enc := json.NewEncoder(os.Stdout)
	for _, path := range os.Args[1:] {
		out := map[string]any{"file": path}
		b, err := os.ReadFile(path)
		if err != nil {
			out["kind"] = "unreadable"
			enc.Encode(out)
			continue
		}
		pkg, err := conformance.ParseRecord(b)
		if err != nil {
			out["kind"] = "malformed"
			enc.Encode(out)
			continue
		}
		r := conformance.Verify(pkg)
		keys := make([]string, len(r.Verdicts))
		for i, v := range r.Verdicts {
			keys[i] = v.Key
		}
		out["kind"], out["breakSeq"], out["signed"], out["verdicts"] = r.Kind, r.BreakSeq, r.Signed, keys
		if err := enc.Encode(out); err != nil {
			fmt.Fprintln(os.Stderr, err)
		}
	}
}

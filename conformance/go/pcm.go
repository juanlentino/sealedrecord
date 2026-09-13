package conformance

// The sample anchor, FORMAT.md 6.2, parsed by hand from the RIFF bytes.

import (
	"encoding/binary"
	"fmt"
)

// PcmHash returns the anchor and true, or "" and false when the bytes are
// not a WAV this specification defines an anchor for.
func PcmHash(b []byte) (string, bool) {
	if len(b) < 12 || string(b[0:4]) != "RIFF" || string(b[8:12]) != "WAVE" {
		return "", false
	}
	var channels, bits uint16
	var rate uint32
	var haveFmt bool
	var data []byte
	at := 12
	for at+8 <= len(b) {
		id := string(b[at : at+4])
		size := int(binary.LittleEndian.Uint32(b[at+4 : at+8]))
		body := at + 8
		if body+size > len(b) {
			return "", false
		}
		if id == "fmt " {
			if size < 16 {
				return "", false
			}
			tag := binary.LittleEndian.Uint16(b[body : body+2])
			if tag != 1 && tag != 3 {
				return "", false
			}
			channels = binary.LittleEndian.Uint16(b[body+2 : body+4])
			rate = binary.LittleEndian.Uint32(b[body+4 : body+8])
			bits = binary.LittleEndian.Uint16(b[body+14 : body+16])
			haveFmt = true
		}
		if id == "data" {
			data = b[body : body+size]
		}
		at = body + size + size%2
	}
	if !haveFmt || data == nil {
		return "", false
	}
	prefix := []byte(fmt.Sprintf("pcm|%d|%d|%d|", channels, rate, bits))
	return sha256Hex(append(prefix, data...)), true
}

// FindAnchors and FindPcmAnchors, FORMAT.md 6.3.
func FindAnchors(sha string, entries []map[string]any) []map[string]any {
	return matching(entries, "sha256", sha)
}

func FindPcmAnchors(pcm string, entries []map[string]any) []map[string]any {
	if pcm == "" {
		return nil
	}
	return matching(entries, "pcm_sha256", pcm)
}

func matching(entries []map[string]any, key, want string) []map[string]any {
	var out []map[string]any
	for _, e := range entries {
		if a, ok := e["artifact"].(map[string]any); ok && a != nil {
			if s, ok := a[key].(string); ok && s == want {
				out = append(out, e)
			}
		}
	}
	return out
}

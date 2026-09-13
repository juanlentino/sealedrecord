package conformance

// The vectors are the contract. Every expectation here is stated in
// docs/FORMAT.md; nothing was taken from the reference implementation.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
)

func load(t *testing.T) map[string]any {
	t.Helper()
	b, err := os.ReadFile("../../vectors/record.json")
	if err != nil {
		t.Fatal(err)
	}
	v, err := ParseRecord(b)
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func clone(t *testing.T, v map[string]any) map[string]any {
	b, _ := json.Marshal(v)
	c, err := ParseRecord(b)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestHolds(t *testing.T) {
	r := Verify(load(t))
	if r.Kind != "holds" || !r.Signed || len(r.Entries) != 9 || r.Total != 9 {
		t.Fatalf("got %+v", r)
	}
	for _, v := range r.Verdicts {
		if v.Key != "intact" {
			t.Fatalf("track %v: %s", v.Track, v.Key)
		}
	}
}

func TestAlteredAtFour(t *testing.T) {
	p := clone(t, load(t))
	e := p["entries"].([]any)[3].(map[string]any)
	e["note"] = e["note"].(string) + "!"
	r := Verify(p)
	if r.Kind != "altered" || r.BreakSeq != 4 || len(r.Entries) != 3 {
		t.Fatalf("got %+v", r)
	}
}

func TestUnsealedAndMalformed(t *testing.T) {
	p := clone(t, load(t))
	p["entries"] = p["entries"].([]any)[:8]
	if r := Verify(p); r.Kind != "unsealed" {
		t.Fatalf("got %s", r.Kind)
	}
	if r := Verify(map[string]any{"format": "other/package.v3", "entries": []any{map[string]any{}}}); r.Kind != "malformed" {
		t.Fatalf("got %s", r.Kind)
	}
}

func TestStrippedSignersReadsUnsigned(t *testing.T) {
	p := clone(t, load(t))
	delete(p, "signers")
	if r := Verify(p); r.Kind != "holds" || r.Signed {
		t.Fatalf("got %+v", r)
	}
}

func TestReceipts(t *testing.T) {
	p := load(t)
	rc := VerifyReceipts(p, Verify(p).Entries)
	if rc.Verified != 9 || rc.Receipted != 9 || len(rc.Problems) != 0 {
		t.Fatalf("got %+v", rc)
	}
}

func TestAnchors(t *testing.T) {
	entries := Verify(load(t)).Entries
	take, _ := os.ReadFile("../../vectors/take.wav")
	retag, _ := os.ReadFile("../../vectors/take-retagged.wav")
	sum := sha256.Sum256(take)
	if len(FindAnchors(hex.EncodeToString(sum[:]), entries)) != 1 {
		t.Fatal("take.wav should match entry 2 by file hash")
	}
	sum = sha256.Sum256(retag)
	if len(FindAnchors(hex.EncodeToString(sum[:]), entries)) != 0 {
		t.Fatal("retagged copy must not match by file hash")
	}
	pcm, ok := PcmHash(retag)
	if !ok || len(FindPcmAnchors(pcm, entries)) != 1 {
		t.Fatal("retagged copy should match entry 2 by sample anchor")
	}
	if _, ok := PcmHash([]byte("not a wav")); ok {
		t.Fatal("a non-WAV has no anchor")
	}
}

package conformance

// Ed25519 keys from JWKs and signatures from hex, FORMAT.md 4.4 and 7.

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
)

// importJwk accepts an Ed25519 public JWK: kty OKP, crv Ed25519, x of 32
// bytes base64url. Any alg member is ignored, as 4.4 allows.
func importJwk(v any) (ed25519.PublicKey, bool) {
	j, ok := v.(map[string]any)
	if !ok || j == nil {
		return nil, false
	}
	if kty, _ := j["kty"].(string); kty != "OKP" {
		return nil, false
	}
	if crv, _ := j["crv"].(string); crv != "Ed25519" {
		return nil, false
	}
	x, _ := j["x"].(string)
	raw, err := base64.RawURLEncoding.DecodeString(x)
	if err != nil || len(raw) != ed25519.PublicKeySize {
		return nil, false
	}
	return ed25519.PublicKey(raw), true
}

// verifyHex checks a 128-hex-character signature over the UTF-8 bytes of
// msg. A signature that is not a string, or not hex, is simply false.
func verifyHex(pub ed25519.PublicKey, sigv any, msg string) bool {
	s, ok := sigv.(string)
	if !ok {
		return false
	}
	sig, err := hex.DecodeString(s)
	if err != nil || len(sig) != ed25519.SignatureSize {
		return false
	}
	return ed25519.Verify(pub, []byte(msg), sig)
}

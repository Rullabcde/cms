package encryption

import (
	"testing"
)

func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := []byte("01234567890123456789012345678901") // 32 bytes
	engine, err := NewEngine(key)
	if err != nil {
		t.Fatalf("failed to create engine: %v", err)
	}

	plaintext := "my-secret-password-123!"
	encrypted, err := engine.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("encrypt failed: %v", err)
	}

	if encrypted.Algorithm != "aes-256-gcm" {
		t.Errorf("expected algorithm aes-256-gcm, got %s", encrypted.Algorithm)
	}

	if encrypted.Value == plaintext {
		t.Error("encrypted value should not match plaintext")
	}

	decrypted, err := engine.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("decrypt failed: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("expected %q, got %q", plaintext, decrypted)
	}
}

func TestEncryptFieldsRoundTrip(t *testing.T) {
	key := []byte("01234567890123456789012345678901")
	engine, _ := NewEngine(key)

	fields := map[string]string{
		"username": "postgres",
		"password": "super-secret",
		"host":     "db.example.com",
	}

	encrypted, err := engine.EncryptFields(fields)
	if err != nil {
		t.Fatalf("EncryptFields failed: %v", err)
	}

	if len(encrypted) != 3 {
		t.Errorf("expected 3 encrypted fields, got %d", len(encrypted))
	}

	decrypted, err := engine.DecryptFields(encrypted)
	if err != nil {
		t.Fatalf("DecryptFields failed: %v", err)
	}

	for k, v := range fields {
		if decrypted[k] != v {
			t.Errorf("field %q: expected %q, got %q", k, v, decrypted[k])
		}
	}
}

func TestTamperDetection(t *testing.T) {
	key := []byte("01234567890123456789012345678901")
	engine, _ := NewEngine(key)

	encrypted, _ := engine.Encrypt("secret")

	// Tamper with the ciphertext
	encrypted.Value = "dGFtcGVyZWQ=" // base64("tampered")

	_, err := engine.Decrypt(encrypted)
	if err == nil {
		t.Error("expected error for tampered ciphertext, got nil")
	}
}

func TestInvalidKeyLength(t *testing.T) {
	_, err := NewEngine([]byte("short-key"))
	if err == nil {
		t.Error("expected error for invalid key length, got nil")
	}
}

func TestUniqueNonces(t *testing.T) {
	key := []byte("01234567890123456789012345678901")
	engine, _ := NewEngine(key)

	e1, _ := engine.Encrypt("same-text")
	e2, _ := engine.Encrypt("same-text")

	if e1.Nonce == e2.Nonce {
		t.Error("nonces should be unique per encryption operation")
	}
	if e1.Value == e2.Value {
		t.Error("ciphertexts should differ due to unique nonces")
	}
}

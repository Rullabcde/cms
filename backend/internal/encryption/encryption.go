package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

var (
	ErrInvalidKey      = errors.New("encryption key must be exactly 32 bytes (256 bits)")
	ErrDecryptFailed   = errors.New("decryption failed: invalid ciphertext or corrupted data")
	ErrInvalidField    = errors.New("invalid encrypted field structure")
)

// Engine handles AES-256-GCM encryption and decryption
type Engine struct {
	gcm cipher.AEAD
}

// NewEngine creates a new encryption engine with the given 32-byte key
func NewEngine(key []byte) (*Engine, error) {
	if len(key) != 32 {
		return nil, ErrInvalidKey
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	return &Engine{gcm: gcm}, nil
}

// EncryptedField represents a single encrypted value with its nonce
type EncryptedField struct {
	Value     string `json:"value"`     // base64-encoded ciphertext
	Nonce     string `json:"nonce"`     // base64-encoded 12-byte nonce
	Algorithm string `json:"algorithm"` // always "aes-256-gcm"
}

// Encrypt encrypts plaintext and returns an EncryptedField
func (e *Engine) Encrypt(plaintext string) (*EncryptedField, error) {
	nonce := make([]byte, e.gcm.NonceSize()) // 12 bytes
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := e.gcm.Seal(nil, nonce, []byte(plaintext), nil)

	return &EncryptedField{
		Value:     base64.StdEncoding.EncodeToString(ciphertext),
		Nonce:     base64.StdEncoding.EncodeToString(nonce),
		Algorithm: "aes-256-gcm",
	}, nil
}

// Decrypt decrypts an EncryptedField and returns the plaintext
func (e *Engine) Decrypt(field *EncryptedField) (string, error) {
	if field == nil {
		return "", ErrInvalidField
	}

	ciphertext, err := base64.StdEncoding.DecodeString(field.Value)
	if err != nil {
		return "", fmt.Errorf("failed to decode ciphertext: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(field.Nonce)
	if err != nil {
		return "", fmt.Errorf("failed to decode nonce: %w", err)
	}

	plaintext, err := e.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptFailed
	}

	return string(plaintext), nil
}

// EncryptFields encrypts a map of key-value pairs (for credential_fields JSONB)
func (e *Engine) EncryptFields(fields map[string]string) (map[string]EncryptedField, error) {
	result := make(map[string]EncryptedField, len(fields))
	for key, value := range fields {
		encrypted, err := e.Encrypt(value)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt field %q: %w", key, err)
		}
		result[key] = *encrypted
	}
	return result, nil
}

// DecryptFields decrypts a map of EncryptedField values back to plaintext
func (e *Engine) DecryptFields(fields map[string]EncryptedField) (map[string]string, error) {
	result := make(map[string]string, len(fields))
	for key, field := range fields {
		plaintext, err := e.Decrypt(&field)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt field %q: %w", key, err)
		}
		result[key] = plaintext
	}
	return result, nil
}

// EncryptJSON encrypts a JSON-serializable value (for old_value/new_value in audit logs)
func (e *Engine) EncryptJSON(v interface{}) (string, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %w", err)
	}

	encrypted, err := e.Encrypt(string(data))
	if err != nil {
		return "", err
	}

	// Serialize the EncryptedField as JSON for storage
	result, err := json.Marshal(encrypted)
	if err != nil {
		return "", fmt.Errorf("failed to marshal encrypted field: %w", err)
	}

	return string(result), nil
}

// DecryptJSON decrypts an encrypted JSON string back to the target type
func (e *Engine) DecryptJSON(encryptedJSON string, target interface{}) error {
	var field EncryptedField
	if err := json.Unmarshal([]byte(encryptedJSON), &field); err != nil {
		return fmt.Errorf("failed to unmarshal encrypted field: %w", err)
	}

	plaintext, err := e.Decrypt(&field)
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(plaintext), target)
}

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

type Engine struct {
	gcm cipher.AEAD
}

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

type EncryptedField struct {
	Value     string `json:"value"`
	Nonce     string `json:"nonce"`
	Algorithm string `json:"algorithm"`
}

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

func (e *Engine) EncryptJSON(v interface{}) (string, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %w", err)
	}

	encrypted, err := e.Encrypt(string(data))
	if err != nil {
		return "", err
	}

	result, err := json.Marshal(encrypted)
	if err != nil {
		return "", fmt.Errorf("failed to marshal encrypted field: %w", err)
	}

	return string(result), nil
}

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

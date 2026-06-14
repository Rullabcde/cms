package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	ServerPort string
	Env        string // "development", "production", "staging"

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string

	// JWT
	JWTSecret          string
	AccessTokenExpiry  int // minutes
	RefreshTokenExpiry int // days

	// Google OAuth2
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// Encryption
	MasterEncryptionKey string

	// Frontend
	FrontendURL string

	// Bootstrap
	AdminEmail string

	// CORS
	AllowedOrigins []string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	accessTokenExpiry, _ := strconv.Atoi(getEnv("ACCESS_TOKEN_EXPIRY_MINUTES", "15"))
	refreshTokenExpiry, _ := strconv.Atoi(getEnv("REFRESH_TOKEN_EXPIRY_DAYS", "7"))

	originsRaw := getEnv("ALLOWED_ORIGINS", "")
	var origins []string
	if originsRaw != "" {
		for _, o := range strings.Split(originsRaw, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins = append(origins, o)
			}
		}
	}
	if len(origins) == 0 {
		origins = []string{getEnv("FRONTEND_URL", "http://localhost:3000")}
	}

	cfg := &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		Env:        getEnv("APP_ENV", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "cms_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		JWTSecret:          getEnv("JWT_SECRET", ""),
		AccessTokenExpiry:  accessTokenExpiry,
		RefreshTokenExpiry: refreshTokenExpiry,

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/callback"),

		MasterEncryptionKey: getEnv("MASTER_ENCRYPTION_KEY", ""),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		AdminEmail:          getEnv("ADMIN_EMAIL", ""),
		AllowedOrigins:      origins,
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation: %w", err)
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	var errs []string

	if c.JWTSecret == "" {
		errs = append(errs, "JWT_SECRET is required")
	} else if c.JWTSecret == "change-me-in-production" || len(c.JWTSecret) < 32 {
		if c.Env == "production" {
			errs = append(errs, "JWT_SECRET must be at least 32 characters in production")
		}
	}

	if c.MasterEncryptionKey == "" {
		errs = append(errs, "MASTER_ENCRYPTION_KEY is required for credential encryption")
	}

	if c.GoogleClientID == "" || c.GoogleClientSecret == "" {
		errs = append(errs, "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required")
	}

	if c.Env == "production" && c.DBPassword == "postgres" {
		errs = append(errs, "DB_PASSWORD must not use default value in production")
	}

	if c.AccessTokenExpiry <= 0 || c.AccessTokenExpiry > 1440 {
		errs = append(errs, "ACCESS_TOKEN_EXPIRY_MINUTES must be between 1 and 1440")
	}
	if c.RefreshTokenExpiry <= 0 || c.RefreshTokenExpiry > 365 {
		errs = append(errs, "REFRESH_TOKEN_EXPIRY_DAYS must be between 1 and 365")
	}

	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}

func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

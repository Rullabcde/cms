package config

import (
	"os"
	"strconv"

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

func Load() *Config {
	// Load .env file if it exists (ignore error in production)
	godotenv.Load()

	accessTokenExpiry, _ := strconv.Atoi(getEnv("ACCESS_TOKEN_EXPIRY_MINUTES", "15"))
	refreshTokenExpiry, _ := strconv.Atoi(getEnv("REFRESH_TOKEN_EXPIRY_DAYS", "7"))

	return &Config{
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

		JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production"),
		AccessTokenExpiry:  accessTokenExpiry,
		RefreshTokenExpiry: refreshTokenExpiry,

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/callback"),

		MasterEncryptionKey: getEnv("MASTER_ENCRYPTION_KEY", ""),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		AdminEmail:          getEnv("ADMIN_EMAIL", ""),
		AllowedOrigins:      []string{getEnv("FRONTEND_URL", "http://localhost:3000")},
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/company/cms-backend/internal/auth"
	"github.com/company/cms-backend/internal/models"
	"github.com/gofiber/fiber/v2"
)

type contextKey string

const (
	UserContextKey contextKey = "user"
)

// CORS middleware
func CORS(origins []string) fiber.Handler {
	allowOrigin := strings.Join(origins, ",")
	return func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", allowOrigin)
		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token")
		c.Set("Access-Control-Allow-Credentials", "true")
		c.Set("Access-Control-Max-Age", "86400")

		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	}
}

// SecurityHeaders adds security-related HTTP headers
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		return c.Next()
	}
}

// RateLimiter implements a simple in-memory rate limiter
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	// Cleanup old entries periodically
	go func() {
		ticker := time.NewTicker(window)
		defer ticker.Stop()
		for range ticker.C {
			rl.cleanup()
		}
	}()
	return rl
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-rl.window)
	for key, times := range rl.requests {
		var valid []time.Time
		for _, t := range times {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, key)
		} else {
			rl.requests[key] = valid
		}
	}
}

func (rl *RateLimiter) Allow(key string) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	var valid []time.Time
	for _, t := range rl.requests[key] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		retryAfter := valid[0].Add(rl.window).Sub(now)
		rl.requests[key] = valid
		return false, retryAfter
	}

	rl.requests[key] = append(valid, now)
	return true, 0
}

// RateLimit middleware for general API endpoints
func RateLimit(limiter *RateLimiter) fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := c.IP()
		if allowed, retryAfter := limiter.Allow(key); !allowed {
			c.Set("Retry-After", fmt.Sprintf("%d", int(retryAfter.Seconds())))
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   "Too many requests",
				"message": "Rate limit exceeded. Please try again later.",
			})
		}
		return c.Next()
	}
}

// Auth middleware - validates JWT from cookie
func Auth(authService *auth.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Cookies("access_token")
		if token == "" {
			// Also check Authorization header
			authHeader := c.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		claims, err := authService.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Store user info in context
		c.Locals("user_id", claims.UserID)
		c.Locals("user_email", claims.Email)
		c.Locals("user_role", claims.Role)

		return c.Next()
	}
}

// RequireRole middleware - checks user role
func RequireRole(roles ...models.Role) fiber.Handler {
	roleSet := make(map[models.Role]bool, len(roles))
	for _, r := range roles {
		roleSet[r] = true
	}

	return func(c *fiber.Ctx) error {
		roleStr, ok := c.Locals("user_role").(models.Role)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		if !roleSet[roleStr] {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}

		return c.Next()
	}
}

// CSRFProtection implements double-submit cookie CSRF protection
func CSRFProtection() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip for safe methods
		if c.Method() == "GET" || c.Method() == "HEAD" || c.Method() == "OPTIONS" {
			// Issue CSRF token if not set
			if c.Cookies("csrf_token") == "" {
				token := generateCSRFToken()
				c.Cookie(&fiber.Cookie{
					Name:     "csrf_token",
					Value:    token,
					HTTPOnly: false, // Frontend needs to read this
					Secure:   true,
					SameSite: "Strict",
					MaxAge:   86400,
				})
			}
			return c.Next()
		}

		// Validate CSRF token for state-changing requests
		cookieToken := c.Cookies("csrf_token")
		headerToken := c.Get("X-CSRF-Token")

		if cookieToken == "" || headerToken == "" || cookieToken != headerToken {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "CSRF token validation failed",
			})
		}

		return c.Next()
	}
}

func generateCSRFToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// RequestLogger logs request details
func RequestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		duration := time.Since(start)

		// Don't log sensitive data
		fmt.Printf("[%s] %s %s %d %v\n",
			time.Now().Format(time.RFC3339),
			c.Method(),
			c.Path(),
			c.Response().StatusCode(),
			duration,
		)

		return err
	}
}

// GetUserFromContext extracts user info from fiber context
func GetUserFromContext(c *fiber.Ctx) (userID string, email string, role models.Role) {
	userID, _ = c.Locals("user_id").(string)
	email, _ = c.Locals("user_email").(string)
	role, _ = c.Locals("user_role").(models.Role)
	return
}

// GetUserIDFromContext is a helper to get just the user ID
func GetUserIDFromContext(c *fiber.Ctx) string {
	id, _ := c.Locals("user_id").(string)
	return id
}

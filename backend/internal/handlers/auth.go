package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"time"

	"github.com/company/cms-backend/internal/auth"
	"github.com/company/cms-backend/internal/middleware"
	"github.com/company/cms-backend/internal/models"
	"github.com/company/cms-backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AuthHandler struct {
	authService      *auth.Service
	userService      *services.UserService
	whitelistService *services.WhitelistService
	auditService     *services.AuditService
	frontendURL      string
}

func NewAuthHandler(authSvc *auth.Service, userSvc *services.UserService, whitelistSvc *services.WhitelistService, auditSvc *services.AuditService, frontendURL string) *AuthHandler {
	return &AuthHandler{
		authService:      authSvc,
		userService:      userSvc,
		whitelistService: whitelistSvc,
		auditService:     auditSvc,
		frontendURL:      frontendURL,
	}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	state := generateState()
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		HTTPOnly: true,
		Secure:   true,
		MaxAge:   300,
	})

	url := h.authService.GetAuthURL(state)
	return c.Redirect(url)
}

func (h *AuthHandler) Callback(c *fiber.Ctx) error {
	state := c.Query("state")
	savedState := c.Cookies("oauth_state")
	if state == "" || state != savedState {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid OAuth state",
		})
	}

	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing authorization code",
		})
	}

	userInfo, err := h.authService.ExchangeCode(c.Context(), code)
	if err != nil {
		h.auditService.Log(services.AuditLogParams{
			Action:        models.AuditActionLogin,
			ResourceType:  "session",
			ResourceID:    "unknown",
			ChangeSummary: "Login failed: OAuth exchange error",
			IPAddress:     c.IP(),
			UserAgent:     c.Get("User-Agent"),
			Status:        models.AuditStatusFailure,
		})
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication failed",
		})
	}

	if !h.whitelistService.IsEmailWhitelisted(userInfo.Email) {
		h.auditService.Log(services.AuditLogParams{
			Action:        models.AuditActionLogin,
			ResourceType:  "session",
			ResourceID:    userInfo.Email,
			ChangeSummary: "Login denied: email not whitelisted",
			IPAddress:     c.IP(),
			UserAgent:     c.Get("User-Agent"),
			Status:        models.AuditStatusFailure,
		})
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Email not authorized. Contact your administrator.",
		})
	}

	user, err := h.userService.FindOrCreateUser(userInfo.Email, userInfo.Sub)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process user",
		})
	}

	now := time.Now()
	h.userService.UpdateLastLogin(user.ID, now)

	accessToken, err := h.authService.GenerateAccessToken(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	refreshToken, err := h.authService.GenerateRefreshToken(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   15 * 60,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   7 * 24 * 60 * 60,
	})

	csrfToken := generateCSRFToken()
	c.Cookie(&fiber.Cookie{
		Name:     "csrf_token",
		Value:    csrfToken,
		HTTPOnly: false,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   86400,
	})

	h.auditService.Log(services.AuditLogParams{
		UserID:        &user.ID,
		Action:        models.AuditActionLogin,
		ResourceType:  "session",
		ResourceID:    user.ID.String(),
		ChangeSummary: "User logged in via Google OAuth",
		IPAddress:     c.IP(),
		UserAgent:     c.Get("User-Agent"),
		Status:        models.AuditStatusSuccess,
	})

	return c.Redirect(h.frontendURL + "/")
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing refresh token",
		})
	}

	claims, err := h.authService.ValidateToken(refreshToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid refresh token",
		})
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid user ID in token",
		})
	}

	user, err := h.userService.GetByID(userID)
	if err != nil || !user.IsActive {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found or inactive",
		})
	}

	newAccessToken, _ := h.authService.GenerateAccessToken(user)
	newRefreshToken, _ := h.authService.GenerateRefreshToken(user)

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    newAccessToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   15 * 60,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    newRefreshToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   7 * 24 * 60 * 60,
	})

	return c.JSON(fiber.Map{"message": "Token refreshed"})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	userIDStr := middleware.GetUserIDFromContext(c)
	userID, _ := uuid.Parse(userIDStr)

	if userID != uuid.Nil {
		h.auditService.Log(services.AuditLogParams{
			UserID:        &userID,
			Action:        models.AuditActionLogout,
			ResourceType:  "session",
			ResourceID:    userIDStr,
			ChangeSummary: "User logged out",
			IPAddress:     c.IP(),
			UserAgent:     c.Get("User-Agent"),
			Status:        models.AuditStatusSuccess,
		})
	}

	c.Cookie(&fiber.Cookie{Name: "access_token", MaxAge: -1})
	c.Cookie(&fiber.Cookie{Name: "refresh_token", MaxAge: -1})
	c.Cookie(&fiber.Cookie{Name: "csrf_token", MaxAge: -1})

	return c.JSON(fiber.Map{"message": "Logged out successfully"})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userIDStr := middleware.GetUserIDFromContext(c)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user"})
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(fiber.Map{
		"id":    user.ID,
		"email": user.Email,
		"role":  user.Role,
	})
}

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func generateCSRFToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func parseUUIDParam(c *fiber.Ctx, param string) (uuid.UUID, error) {
	return uuid.Parse(c.Params(param))
}

func parsePagination(c *fiber.Ctx) (int, int) {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	return page, limit
}

package handlers

import (
	"strings"

	"github.com/company/cms-backend/internal/middleware"
	"github.com/company/cms-backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CredentialHandler handles credential CRUD endpoints
type CredentialHandler struct {
	service *services.CredentialService
}

// NewCredentialHandler creates a new credential handler
func NewCredentialHandler(svc *services.CredentialService) *CredentialHandler {
	return &CredentialHandler{service: svc}
}

// List returns paginated credentials
func (h *CredentialHandler) List(c *fiber.Ctx) error {
	page, limit := parsePagination(c)

	filter := services.CredentialFilter{
		CategoryID: c.Query("category_id"),
		Search:     c.Query("q"),
		Sort:       c.Query("sort", "recent"),
		Page:       page,
		Limit:      limit,
	}

	if tags := c.Query("tags"); tags != "" {
		filter.Tags = strings.Split(tags, ",")
	}

	credentials, total, err := h.service.List(filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch credentials",
		})
	}

	return c.JSON(fiber.Map{
		"data":  credentials,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Get returns a single credential with decrypted fields
func (h *CredentialHandler) Get(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid credential ID"})
	}

	credential, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Credential not found"})
	}

	return c.JSON(fiber.Map{"data": credential})
}

// Create creates a new credential
func (h *CredentialHandler) Create(c *fiber.Ctx) error {
	var req services.CredentialCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name is required"})
	}

	if len(req.CredentialFields) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "At least one credential field is required"})
	}

	userIDStr := middleware.GetUserIDFromContext(c)
	userID, _ := uuid.Parse(userIDStr)

	credential, err := h.service.Create(req, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create credential",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": credential})
}

// Update updates a credential
func (h *CredentialHandler) Update(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid credential ID"})
	}

	var req services.CredentialUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userIDStr := middleware.GetUserIDFromContext(c)
	userID, _ := uuid.Parse(userIDStr)

	credential, err := h.service.Update(id, req, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update credential",
		})
	}

	return c.JSON(fiber.Map{"data": credential})
}

// Delete soft-deletes a credential
func (h *CredentialHandler) Delete(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid credential ID"})
	}

	userIDStr := middleware.GetUserIDFromContext(c)
	userID, _ := uuid.Parse(userIDStr)

	if err := h.service.Delete(id, userID, c.IP(), c.Get("User-Agent")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete credential",
		})
	}

	return c.JSON(fiber.Map{"message": "Credential deleted"})
}

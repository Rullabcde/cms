package handlers

import (
	"bufio"
	"fmt"
	"strings"

	"github.com/company/cms-backend/internal/middleware"
	"github.com/company/cms-backend/internal/models"
	"github.com/company/cms-backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// CategoryHandler handles category endpoints
type CategoryHandler struct {
	service *services.CategoryService
}

func NewCategoryHandler(svc *services.CategoryService) *CategoryHandler {
	return &CategoryHandler{service: svc}
}

func (h *CategoryHandler) List(c *fiber.Ctx) error {
	categories, err := h.service.List()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch categories"})
	}
	return c.JSON(fiber.Map{"data": categories})
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	var req services.CategoryCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name is required"})
	}

	userID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	category, err := h.service.Create(req, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": category})
}

func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	var req services.CategoryCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	userID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	category, err := h.service.Update(id, req, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": category})
}

func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid category ID"})
	}

	userID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	if err := h.service.Delete(id, userID, c.IP(), c.Get("User-Agent")); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Category deleted"})
}

// UserHandler handles user management endpoints (Admin only)
type UserHandler struct {
	service *services.UserService
}

func NewUserHandler(svc *services.UserService) *UserHandler {
	return &UserHandler{service: svc}
}

func (h *UserHandler) List(c *fiber.Ctx) error {
	users, err := h.service.List()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch users"})
	}
	return c.JSON(fiber.Map{"data": users})
}

func (h *UserHandler) UpdateRole(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var body struct {
		Role models.Role `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.Role != models.RoleAdmin && body.Role != models.RoleEditor && body.Role != models.RoleViewer {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
	}

	adminID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	if err := h.service.UpdateRole(id, body.Role, adminID, c.IP(), c.Get("User-Agent")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Role updated"})
}

func (h *UserHandler) Deactivate(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	adminID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	if err := h.service.Deactivate(id, adminID, c.IP(), c.Get("User-Agent")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "User deactivated"})
}

// WhitelistHandler handles whitelist endpoints (Admin only)
type WhitelistHandler struct {
	service *services.WhitelistService
}

func NewWhitelistHandler(svc *services.WhitelistService) *WhitelistHandler {
	return &WhitelistHandler{service: svc}
}

func (h *WhitelistHandler) List(c *fiber.Ctx) error {
	entries, err := h.service.List()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch whitelist"})
	}
	return c.JSON(fiber.Map{"data": entries})
}

func (h *WhitelistHandler) Add(c *fiber.Ctx) error {
	var body struct {
		Email string  `json:"email"`
		Notes *string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if body.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email is required"})
	}

	userID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	entry, err := h.service.Add(body.Email, body.Notes, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": entry})
}

func (h *WhitelistHandler) Remove(c *fiber.Ctx) error {
	id, err := parseUUIDParam(c, "id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid whitelist ID"})
	}

	userID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	if err := h.service.Remove(id, userID, c.IP(), c.Get("User-Agent")); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Email removed from whitelist"})
}

func (h *WhitelistHandler) BulkImport(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File is required"})
	}

	if file.Size > 10*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File too large (max 10MB)"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read file"})
	}
	defer f.Close()

	var emails []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		email := strings.TrimSpace(scanner.Text())
		if email != "" && strings.Contains(email, "@") {
			emails = append(emails, email)
		}
	}

	userID, _ := uuid.Parse(middleware.GetUserIDFromContext(c))
	imported, skipped, err := h.service.BulkImport(emails, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": fmt.Sprintf("Imported %d emails, %d skipped", imported, skipped),
		"imported": imported,
		"skipped":  skipped,
	})
}

// AuditLogHandler handles audit log endpoints (Admin only)
type AuditLogHandler struct {
	service *services.AuditService
}

func NewAuditLogHandler(svc *services.AuditService) *AuditLogHandler {
	return &AuditLogHandler{service: svc}
}

func (h *AuditLogHandler) List(c *fiber.Ctx) error {
	page, limit := parsePagination(c)

	filter := services.AuditLogFilter{
		UserID:       c.Query("user_id"),
		Action:       c.Query("action"),
		ResourceType: c.Query("resource_type"),
		Status:       c.Query("status"),
		DateFrom:     c.Query("date_from"),
		DateTo:       c.Query("date_to"),
		Page:         page,
		Limit:        limit,
	}

	logs, total, err := h.service.List(filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch audit logs"})
	}

	return c.JSON(fiber.Map{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *AuditLogHandler) Export(c *fiber.Ctx) error {
	filter := services.AuditLogFilter{
		UserID:       c.Query("user_id"),
		Action:       c.Query("action"),
		ResourceType: c.Query("resource_type"),
		Status:       c.Query("status"),
		DateFrom:     c.Query("date_from"),
		DateTo:       c.Query("date_to"),
		Limit:        10000,
	}

	logs, _, err := h.service.List(filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch audit logs"})
	}

	// Build CSV
	var csv strings.Builder
	csv.WriteString("User,Action,Resource Type,Resource ID,Change Summary,Status,IP Address,Created At\n")
	for _, log := range logs {
		email := ""
		if log.User != nil {
			email = log.User.Email
		}
		csv.WriteString(fmt.Sprintf("%s,%s,%s,%s,\"%s\",%s,%s,%s\n",
			email, log.Action, log.ResourceType, log.ResourceID,
			log.ChangeSummary, log.Status, log.IPAddress,
			log.CreatedAt.Format("2006-01-02 15:04:05")))
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=audit_logs.csv")
	return c.SendString(csv.String())
}

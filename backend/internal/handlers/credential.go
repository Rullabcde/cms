package handlers

import (
	"bufio"
	"encoding/csv"
	"io"
	"strconv"
	"strings"

	"github.com/company/cms-backend/internal/middleware"
	"github.com/company/cms-backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CredentialHandler struct {
	service *services.CredentialService
}

func NewCredentialHandler(svc *services.CredentialService) *CredentialHandler {
	return &CredentialHandler{service: svc}
}

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

func (h *CredentialHandler) ImportCSV(c *fiber.Ctx) error {
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

	// Read the file content and handle BOM
	reader := bufio.NewReader(f)
	// Skip UTF-8 BOM if present
	bom, _ := reader.Peek(3)
	if len(bom) >= 3 && bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF {
		reader.Discard(3)
	}

	csvReader := csv.NewReader(reader)
	csvReader.TrimLeadingSpace = true

	// Read header row
	header, err := csvReader.Read()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to parse CSV: " + err.Error()})
	}

	// Map header columns
	colIndex := make(map[string]int)
	for i, h := range header {
		colIndex[strings.ToLower(strings.TrimSpace(h))] = i
	}

	requiredCols := []string{"name"}
	for _, col := range requiredCols {
		if _, ok := colIndex[col]; !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Missing required column: " + col + ". Expected columns: name, category, description, username, password, tags",
			})
		}
	}

	userIDStr := middleware.GetUserIDFromContext(c)
	userID, _ := uuid.Parse(userIDStr)
	ipAddr := c.IP()
	userAgent := c.Get("User-Agent")

	var imported, skipped int
	var errors []string

	rowNum := 1 // header is row 0
	for {
		rowNum++
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			skipped++
			errors = append(errors, "Row "+strconv.Itoa(rowNum)+": parse error")
			continue
		}

		name := getField(record, colIndex, "name")
		if name == "" {
			skipped++
			errors = append(errors, "Row "+strconv.Itoa(rowNum)+": name is empty")
			continue
		}

		categoryName := getField(record, colIndex, "category")
		description := getField(record, colIndex, "description")
		username := getField(record, colIndex, "username")
		password := getField(record, colIndex, "password")
		tagsRaw := getField(record, colIndex, "tags")

		// Parse tags
		var tags []string
		if tagsRaw != "" {
			for _, t := range strings.Split(tagsRaw, ",") {
				t = strings.TrimSpace(t)
				if t != "" {
					tags = append(tags, t)
				}
			}
		}

		// Build credential fields: username + password under "_default"
		credFields := map[string]map[string]string{
			"_default": {},
		}
		if username != "" {
			credFields["_default"]["username"] = username
		}
		if password != "" {
			credFields["_default"]["password"] = password
		}
		// If both empty, add a placeholder so the credential is valid
		if len(credFields["_default"]) == 0 {
			credFields["_default"]["note"] = "imported from CSV"
		}

		req := services.CredentialCreateRequest{
			Name:             name,
			Tags:             tags,
			CredentialFields: credFields,
		}

		if description != "" {
			req.Description = &description
		}

		// Resolve category by name
		catID, resolveErr := h.service.ResolveCategory(categoryName, userID, ipAddr, userAgent)
		if resolveErr != nil {
			skipped++
			errors = append(errors, "Row "+strconv.Itoa(rowNum)+": "+resolveErr.Error())
			continue
		}
		req.CategoryID = catID

		_, createErr := h.service.Create(req, userID, ipAddr, userAgent)
		if createErr != nil {
			skipped++
			errors = append(errors, "Row "+strconv.Itoa(rowNum)+": "+createErr.Error())
			continue
		}
		imported++
	}

	result := fiber.Map{
		"message":  "Import complete",
		"imported": imported,
		"skipped":  skipped,
	}
	if len(errors) > 0 {
		result["errors"] = errors
	}

	return c.JSON(result)
}

func getField(record []string, index map[string]int, key string) string {
	if i, ok := index[key]; ok && i < len(record) {
		return strings.TrimSpace(record[i])
	}
	return ""
}

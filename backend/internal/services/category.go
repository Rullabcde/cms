package services

import (
	"fmt"

	"github.com/company/cms-backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryService struct {
	db    *gorm.DB
	audit *AuditService
}

func NewCategoryService(db *gorm.DB, audit *AuditService) *CategoryService {
	return &CategoryService{db: db, audit: audit}
}

func (s *CategoryService) List() ([]models.Category, error) {
	var categories []models.Category
	err := s.db.Order("is_default DESC, name ASC").Find(&categories).Error
	return categories, err
}

func (s *CategoryService) GetByID(id uuid.UUID) (*models.Category, error) {
	var category models.Category
	err := s.db.First(&category, "id = ?", id).Error
	return &category, err
}

type CategoryCreateRequest struct {
	Name        string  `json:"name" validate:"required,max=50"`
	Description *string `json:"description" validate:"omitempty,max=200"`
	Color       *string `json:"color" validate:"omitempty,max=7"`
	Icon        *string `json:"icon"`
}

func (s *CategoryService) Create(req CategoryCreateRequest, userID uuid.UUID, ipAddress, userAgent string) (*models.Category, error) {
	category := models.Category{
		Name:            req.Name,
		Description:     req.Description,
		Color:           req.Color,
		Icon:            req.Icon,
		CreatedByUserID: userID,
	}

	if err := s.db.Create(&category).Error; err != nil {
		return nil, err
	}

	s.audit.Log(AuditLogParams{
		UserID:        &userID,
		Action:        models.AuditActionCreate,
		ResourceType:  "category",
		ResourceID:    category.ID.String(),
		ChangeSummary: fmt.Sprintf("Created category: %s", category.Name),
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return &category, nil
}

func (s *CategoryService) Update(id uuid.UUID, req CategoryCreateRequest, userID uuid.UUID, ipAddress, userAgent string) (*models.Category, error) {
	var category models.Category
	if err := s.db.First(&category, "id = ?", id).Error; err != nil {
		return nil, err
	}

	oldName := category.Name
	updates := map[string]interface{}{
		"name":              req.Name,
		"description":       req.Description,
		"color":             req.Color,
		"icon":              req.Icon,
		"updated_by_user_id": userID,
	}

	if err := s.db.Model(&category).Updates(updates).Error; err != nil {
		return nil, err
	}

	changeSummary := fmt.Sprintf("Updated category: %s", oldName)
	s.audit.Log(AuditLogParams{
		UserID:        &userID,
		Action:        models.AuditActionUpdate,
		ResourceType:  "category",
		ResourceID:    id.String(),
		ChangeSummary: changeSummary,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return s.GetByID(id)
}

func (s *CategoryService) Delete(id uuid.UUID, userID uuid.UUID, ipAddress, userAgent string) error {
	var category models.Category
	if err := s.db.First(&category, "id = ?", id).Error; err != nil {
		return err
	}

	var count int64
	s.db.Model(&models.Credential{}).Where("category_id = ? AND is_deleted = ?", id, false).Count(&count)
	if count > 0 {
		return fmt.Errorf("category has %d credentials; move or delete them first", count)
	}

	if err := s.db.Delete(&category).Error; err != nil {
		return err
	}

	s.audit.Log(AuditLogParams{
		UserID:        &userID,
		Action:        models.AuditActionDelete,
		ResourceType:  "category",
		ResourceID:    id.String(),
		ChangeSummary: fmt.Sprintf("Deleted category: %s", category.Name),
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return nil
}

package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/company/cms-backend/internal/encryption"
	"github.com/company/cms-backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CredentialService struct {
	db     *gorm.DB
	crypto *encryption.Engine
	audit  *AuditService
}

func NewCredentialService(db *gorm.DB, crypto *encryption.Engine, audit *AuditService) *CredentialService {
	return &CredentialService{db: db, crypto: crypto, audit: audit}
}

type CredentialFilter struct {
	CategoryID string
	Tags       []string
	Search     string
	Sort       string // "recent", "alphabetical", "created"
	Page       int
	Limit      int
}

type CredentialCreateRequest struct {
	CategoryID       uuid.UUID                    `json:"category_id" validate:"required"`
	Name             string                       `json:"name" validate:"required,max=255"`
	DatabaseName     *string                      `json:"database_name"`
	Description      *string                      `json:"description"`
	Tags             []string                     `json:"tags"`
	CredentialFields map[string]map[string]string `json:"credential_fields" validate:"required"`
}

type CredentialUpdateRequest struct {
	CategoryID       *uuid.UUID                   `json:"category_id"`
	Name             *string                      `json:"name" validate:"omitempty,max=255"`
	DatabaseName     *string                      `json:"database_name"`
	Description      *string                      `json:"description"`
	Tags             []string                     `json:"tags"`
	CredentialFields map[string]map[string]string `json:"credential_fields"`
}

type CredentialResponse struct {
	ID               uuid.UUID                    `json:"id"`
	CategoryID       uuid.UUID                    `json:"category_id"`
	Category         *models.Category             `json:"category,omitempty"`
	Name             string                       `json:"name"`
	DatabaseName     *string                      `json:"database_name"`
	Description      *string                      `json:"description"`
	Tags             []string                     `json:"tags"`
	CredentialFields map[string]map[string]string `json:"credential_fields,omitempty"`
	IsDeleted        bool                         `json:"is_deleted"`
	CreatedAt        string                       `json:"created_at"`
	CreatedBy        *models.User                 `json:"created_by,omitempty"`
	UpdatedAt        string                       `json:"updated_at"`
	UpdatedBy        *models.User                 `json:"updated_by,omitempty"`
}

func flattenNestedFields(nested map[string]map[string]string) map[string]string {
	flat := make(map[string]string)
	for dbName, fields := range nested {
		for key, value := range fields {
			flat[dbName+"::"+key] = value
		}
	}
	return flat
}

func unflattenNestedFields(flat map[string]string) map[string]map[string]string {
	nested := make(map[string]map[string]string)
	for compositeKey, value := range flat {
		parts := strings.SplitN(compositeKey, "::", 2)
		if len(parts) == 2 {
			dbName, fieldKey := parts[0], parts[1]
			if nested[dbName] == nil {
				nested[dbName] = make(map[string]string)
			}
			nested[dbName][fieldKey] = value
		} else {
			// Legacy flat format - put under "_default" database
			if nested["_default"] == nil {
				nested["_default"] = make(map[string]string)
			}
			nested["_default"][compositeKey] = value
		}
	}
	return nested
}

func (s *CredentialService) List(filter CredentialFilter) ([]CredentialResponse, int64, error) {
	var credentials []models.Credential
	var total int64

	query := s.db.Model(&models.Credential{}).
		Where("is_deleted = ?", false).
		Preload("Category").
		Preload("CreatedBy").
		Preload("UpdatedBy")

	if filter.CategoryID != "" {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if len(filter.Tags) > 0 {
		tagsJSON, _ := json.Marshal(filter.Tags)
		query = query.Where("tags @> ?::jsonb", string(tagsJSON))
	}
	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ? OR tags::text ILIKE ? OR database_name ILIKE ?", searchPattern, searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sort
	switch filter.Sort {
	case "alphabetical":
		query = query.Order("name ASC")
	case "created":
		query = query.Order("created_at DESC")
	default: // "recent"
		query = query.Order("updated_at DESC")
	}

	if filter.Limit == 0 {
		filter.Limit = 50
	}
	if filter.Page == 0 {
		filter.Page = 1
	}
	offset := (filter.Page - 1) * filter.Limit

	if err := query.Offset(offset).Limit(filter.Limit).Find(&credentials).Error; err != nil {
		return nil, 0, err
	}

	var responses []CredentialResponse
	for _, cred := range credentials {
		responses = append(responses, CredentialResponse{
			ID:           cred.ID,
			CategoryID:   cred.CategoryID,
			Category:     &cred.Category,
			Name:         cred.Name,
			DatabaseName: cred.DatabaseName,
			Description:  cred.Description,
			Tags:         cred.Tags,
			IsDeleted:    cred.IsDeleted,
			CreatedAt:    cred.CreatedAt.Format("2006-01-02T15:04:05Z"),
			CreatedBy:    &cred.CreatedBy,
			UpdatedAt:    cred.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedBy:    cred.UpdatedBy,
		})
	}

	return responses, total, nil
}

func (s *CredentialService) GetByID(id uuid.UUID) (*CredentialResponse, error) {
	var cred models.Credential
	err := s.db.Preload("Category").Preload("CreatedBy").Preload("UpdatedBy").
		Where("is_deleted = ?", false).
		First(&cred, "id = ?", id).Error
	if err != nil {
		return nil, err
	}

	encFields := make(map[string]encryption.EncryptedField, len(cred.CredentialFields))
	for k, v := range cred.CredentialFields {
		encFields[k] = encryption.EncryptedField{
			Value:     v.Value,
			Nonce:     v.Nonce,
			Algorithm: v.Algorithm,
		}
	}
	decryptedFields, err := s.crypto.DecryptFields(encFields)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt credential fields: %w", err)
	}

	nestedFields := unflattenNestedFields(decryptedFields)

	return &CredentialResponse{
		ID:               cred.ID,
		CategoryID:       cred.CategoryID,
		Category:         &cred.Category,
		Name:             cred.Name,
		DatabaseName:     cred.DatabaseName,
		Description:      cred.Description,
		Tags:             cred.Tags,
		CredentialFields: nestedFields,
		IsDeleted:        cred.IsDeleted,
		CreatedAt:        cred.CreatedAt.Format("2006-01-02T15:04:05Z"),
		CreatedBy:        &cred.CreatedBy,
		UpdatedAt:        cred.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedBy:        cred.UpdatedBy,
	}, nil
}

func (s *CredentialService) Create(req CredentialCreateRequest, userID uuid.UUID, ipAddress, userAgent string) (*CredentialResponse, error) {
	flatFields := flattenNestedFields(req.CredentialFields)
	encryptedFields, err := s.crypto.EncryptFields(flatFields)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt fields: %w", err)
	}

	modelFields := make(map[string]models.EncryptedField)
	for k, v := range encryptedFields {
		modelFields[k] = models.EncryptedField{
			Value:     v.Value,
			Nonce:     v.Nonce,
			Algorithm: v.Algorithm,
		}
	}

	cred := models.Credential{
		CategoryID:       req.CategoryID,
		Name:             req.Name,
		DatabaseName:     req.DatabaseName,
		Description:      req.Description,
		Tags:             req.Tags,
		CredentialFields: modelFields,
		CreatedByUserID:  userID,
	}

	if err := s.db.Create(&cred).Error; err != nil {
		return nil, err
	}

	userIDCopy := userID
	s.audit.Log(AuditLogParams{
		UserID:        &userIDCopy,
		Action:        models.AuditActionCreate,
		ResourceType:  "credential",
		ResourceID:    cred.ID.String(),
		ChangeSummary: fmt.Sprintf("Created credential: %s", cred.Name),
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return s.GetByID(cred.ID)
}

func (s *CredentialService) Update(id uuid.UUID, req CredentialUpdateRequest, userID uuid.UUID, ipAddress, userAgent string) (*CredentialResponse, error) {
	var cred models.Credential
	if err := s.db.First(&cred, "id = ? AND is_deleted = ?", id, false).Error; err != nil {
		return nil, err
	}

	oldFieldsJSON, _ := json.Marshal(cred.CredentialFields)
	oldValueStr := string(oldFieldsJSON)

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.DatabaseName != nil {
		updates["database_name"] = *req.DatabaseName
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.CategoryID != nil {
		updates["category_id"] = *req.CategoryID
	}
	if req.Tags != nil {
		tagsJSON, _ := json.Marshal(req.Tags)
		updates["tags"] = gorm.Expr("?::jsonb", string(tagsJSON))
	}
	if req.CredentialFields != nil {
		flatFields := flattenNestedFields(req.CredentialFields)
		encryptedFields, err := s.crypto.EncryptFields(flatFields)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt fields: %w", err)
		}
		modelFields := make(map[string]models.EncryptedField)
		for k, v := range encryptedFields {
			modelFields[k] = models.EncryptedField{
				Value:     v.Value,
				Nonce:     v.Nonce,
				Algorithm: v.Algorithm,
			}
		}
		fieldsJSON, _ := json.Marshal(modelFields)
		updates["credential_fields"] = gorm.Expr("?::jsonb", string(fieldsJSON))
	}

	updates["updated_by_user_id"] = userID
	if err := s.db.Model(&cred).Updates(updates).Error; err != nil {
		return nil, err
	}

	newFieldsJSON, _ := json.Marshal(updates)
	newValueStr := string(newFieldsJSON)
	userIDCopy := userID
	s.audit.Log(AuditLogParams{
		UserID:        &userIDCopy,
		Action:        models.AuditActionUpdate,
		ResourceType:  "credential",
		ResourceID:    id.String(),
		ChangeSummary: fmt.Sprintf("Updated credential: %s", cred.Name),
		OldValue:      &oldValueStr,
		NewValue:      &newValueStr,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return s.GetByID(id)
}

func (s *CredentialService) Delete(id uuid.UUID, userID uuid.UUID, ipAddress, userAgent string) error {
	result := s.db.Model(&models.Credential{}).
		Where("id = ? AND is_deleted = ?", id, false).
		Updates(map[string]interface{}{
			"is_deleted":        true,
			"updated_by_user_id": userID,
		})

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	userIDCopy := userID
	s.audit.Log(AuditLogParams{
		UserID:        &userIDCopy,
		Action:        models.AuditActionDelete,
		ResourceType:  "credential",
		ResourceID:    id.String(),
		ChangeSummary: "Soft deleted credential",
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return nil
}

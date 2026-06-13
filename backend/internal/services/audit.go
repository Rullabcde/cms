package services

import (
	"github.com/company/cms-backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditService handles audit log operations
type AuditService struct {
	db *gorm.DB
}

// NewAuditService creates a new audit service
func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// Log creates a new audit log entry
func (s *AuditService) Log(params AuditLogParams) error {
	log := models.AuditLog{
		UserID:        params.UserID,
		Action:        params.Action,
		ResourceType:  params.ResourceType,
		ResourceID:    params.ResourceID,
		ChangeSummary: params.ChangeSummary,
		OldValue:      params.OldValue,
		NewValue:      params.NewValue,
		IPAddress:     params.IPAddress,
		UserAgent:     params.UserAgent,
		Status:        params.Status,
		ErrorMessage:  params.ErrorMessage,
	}
	return s.db.Create(&log).Error
}

// AuditLogParams defines parameters for creating an audit log
type AuditLogParams struct {
	UserID        *uuid.UUID
	Action        models.AuditAction
	ResourceType  string
	ResourceID    string
	ChangeSummary string
	OldValue      *string
	NewValue      *string
	IPAddress     string
	UserAgent     string
	Status        models.AuditStatus
	ErrorMessage  *string
}

// AuditLogFilter defines filtering options for querying audit logs
type AuditLogFilter struct {
	UserID       string
	Action       string
	ResourceType string
	Status       string
	DateFrom     string
	DateTo       string
	Page         int
	Limit        int
}

// List returns paginated audit logs with filters
func (s *AuditService) List(filter AuditLogFilter) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	query := s.db.Model(&models.AuditLog{}).Preload("User")

	if filter.UserID != "" {
		query = query.Where("user_id = ?", filter.UserID)
	}
	if filter.Action != "" {
		query = query.Where("action = ?", filter.Action)
	}
	if filter.ResourceType != "" {
		query = query.Where("resource_type = ?", filter.ResourceType)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.DateFrom != "" {
		query = query.Where("created_at >= ?", filter.DateFrom)
	}
	if filter.DateTo != "" {
		query = query.Where("created_at <= ?", filter.DateTo)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Limit == 0 {
		filter.Limit = 50
	}
	if filter.Page == 0 {
		filter.Page = 1
	}
	offset := (filter.Page - 1) * filter.Limit

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(filter.Limit).
		Find(&logs).Error

	return logs, total, err
}

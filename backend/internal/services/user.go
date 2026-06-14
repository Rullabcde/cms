package services

import (
	"fmt"
	"time"

	"github.com/company/cms-backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserService struct {
	db    *gorm.DB
	audit *AuditService
}

func NewUserService(db *gorm.DB, audit *AuditService) *UserService {
	return &UserService{db: db, audit: audit}
}

func (s *UserService) List() ([]models.User, error) {
	var users []models.User
	err := s.db.Where("is_active = ?", true).Order("email ASC").Find(&users).Error
	return users, err
}

func (s *UserService) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := s.db.Where("email = ? AND is_active = ?", email, true).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *UserService) GetByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := s.db.First(&user, "id = ?", id).Error
	return &user, err
}

func (s *UserService) FindOrCreateUser(email, googleSub string) (*models.User, error) {
	var user models.User

	err := s.db.Where("google_oauth_sub = ?", googleSub).First(&user).Error
	if err == nil {
		return &user, nil
	}

	err = s.db.Where("email = ?", email).First(&user).Error
	if err == nil {
		// Update google sub if not set
		if user.GoogleOAuthSub == "" {
			user.GoogleOAuthSub = googleSub
			s.db.Save(&user)
		}
		return &user, nil
	}

	var whitelist models.WhitelistEmail
	err = s.db.Where("email = ? AND is_active = ?", email, true).First(&whitelist).Error
	if err != nil {
		return nil, fmt.Errorf("email not authorized: %s", email)
	}

	var userCount int64
	s.db.Model(&models.User{}).Where("google_oauth_sub != ?", "system-service-account").Count(&userCount)

	role := models.RoleViewer
	if userCount <= 1 {
		role = models.RoleAdmin
	}

	user = models.User{
		Email:          email,
		GoogleOAuthSub: googleSub,
		Role:           role,
		IsActive:       true,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *UserService) UpdateRole(id uuid.UUID, newRole models.Role, adminID uuid.UUID, ipAddress, userAgent string) error {
	var user models.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		return err
	}

	oldRole := user.Role
	if err := s.db.Model(&user).Update("role", newRole).Error; err != nil {
		return err
	}

	changeSummary := fmt.Sprintf("Changed role for %s from %s to %s", user.Email, oldRole, newRole)
	s.audit.Log(AuditLogParams{
		UserID:        &adminID,
		Action:        models.AuditActionUpdate,
		ResourceType:  "user",
		ResourceID:    id.String(),
		ChangeSummary: changeSummary,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return nil
}

func (s *UserService) Deactivate(id uuid.UUID, adminID uuid.UUID, ipAddress, userAgent string) error {
	result := s.db.Model(&models.User{}).Where("id = ?", id).Update("is_active", false)
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	s.audit.Log(AuditLogParams{
		UserID:        &adminID,
		Action:        models.AuditActionUpdate,
		ResourceType:  "user",
		ResourceID:    id.String(),
		ChangeSummary: "Deactivated user",
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return nil
}

type WhitelistService struct {
	db    *gorm.DB
	audit *AuditService
}

func NewWhitelistService(db *gorm.DB, audit *AuditService) *WhitelistService {
	return &WhitelistService{db: db, audit: audit}
}

func (s *WhitelistService) List() ([]models.WhitelistEmail, error) {
	var entries []models.WhitelistEmail
	err := s.db.Preload("CreatedBy").Order("email ASC").Find(&entries).Error
	return entries, err
}

func (s *WhitelistService) Add(email string, notes *string, userID uuid.UUID, ipAddress, userAgent string) (*models.WhitelistEmail, error) {
	entry := models.WhitelistEmail{
		Email:           email,
		IsActive:        true,
		CreatedByUserID: userID,
		Notes:           notes,
	}

	if err := s.db.Create(&entry).Error; err != nil {
		return nil, err
	}

	s.audit.Log(AuditLogParams{
		UserID:        &userID,
		Action:        models.AuditActionCreate,
		ResourceType:  "whitelist",
		ResourceID:    entry.ID.String(),
		ChangeSummary: fmt.Sprintf("Added email to whitelist: %s", email),
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return &entry, nil
}

func (s *WhitelistService) Remove(id uuid.UUID, userID uuid.UUID, ipAddress, userAgent string) error {
	var entry models.WhitelistEmail
	if err := s.db.First(&entry, "id = ?", id).Error; err != nil {
		return err
	}

	if err := s.db.Model(&entry).Update("is_active", false).Error; err != nil {
		return err
	}

	s.audit.Log(AuditLogParams{
		UserID:        &userID,
		Action:        models.AuditActionDelete,
		ResourceType:  "whitelist",
		ResourceID:    id.String(),
		ChangeSummary: fmt.Sprintf("Removed email from whitelist: %s", entry.Email),
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return nil
}

func (s *WhitelistService) BulkImport(emails []string, userID uuid.UUID, ipAddress, userAgent string) (int, int, error) {
	var imported, skipped int

	for _, email := range emails {
		var count int64
		s.db.Model(&models.WhitelistEmail{}).Where("email = ?", email).Count(&count)
		if count > 0 {
			skipped++
			continue
		}

		entry := models.WhitelistEmail{
			Email:           email,
			IsActive:        true,
			CreatedByUserID: userID,
		}

		if err := s.db.Create(&entry).Error; err != nil {
			skipped++
			continue
		}
		imported++
	}

	s.audit.Log(AuditLogParams{
		UserID:        &userID,
		Action:        models.AuditActionImport,
		ResourceType:  "whitelist",
		ResourceID:    "bulk",
		ChangeSummary: fmt.Sprintf("Bulk imported %d emails to whitelist (%d skipped)", imported, skipped),
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Status:        models.AuditStatusSuccess,
	})

	return imported, skipped, nil
}

func (s *UserService) UpdateLastLogin(id uuid.UUID, t time.Time) {
	s.db.Model(&models.User{}).Where("id = ?", id).Update("last_login_at", t)
}

func (s *WhitelistService) IsEmailWhitelisted(email string) bool {
	var count int64
	s.db.Model(&models.WhitelistEmail{}).Where("email = ? AND is_active = ?", email, true).Count(&count)
	return count > 0
}

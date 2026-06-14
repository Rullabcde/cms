package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleEditor Role = "editor"
	RoleViewer Role = "viewer"
)

// User representsthe users table
type User struct {
	ID              uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	Email           string     `gorm:"uniqueIndex;not null" json:"email"`
	GoogleOAuthSub  string     `gorm:"uniqueIndex;column:google_oauth_sub;not null" json:"-"`
	Role            Role       `gorm:"type:varchar(20);default:'viewer';not null" json:"role"`
	IsActive        bool       `gorm:"default:true;not null" json:"is_active"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Credentials     []Credential     `gorm:"foreignKey:CreatedByUserID" json:"-"`
	AuditLogs       []AuditLog       `gorm:"foreignKey:UserID" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type WhitelistEmail struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Email            string    `gorm:"uniqueIndex;not null" json:"email"`
	IsActive         bool      `gorm:"default:true;not null" json:"is_active"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
	CreatedByUserID  uuid.UUID `gorm:"type:uuid;not null" json:"created_by_user_id"`
	Notes            *string   `json:"notes"`

	// Relationships
	CreatedBy        User      `gorm:"foreignKey:CreatedByUserID" json:"-"`
}

func (w *WhitelistEmail) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

type Category struct {
	ID               uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	Name             string    `gorm:"uniqueIndex;not null;size:50" json:"name"`
	Description      *string   `json:"description"`
	Color            *string   `gorm:"size:7" json:"color"`
	Icon             *string   `json:"icon"`
	IsDefault        bool      `gorm:"default:false" json:"is_default"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
	CreatedByUserID  uuid.UUID `gorm:"type:uuid;not null" json:"created_by_user_id"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	UpdatedByUserID  *uuid.UUID `gorm:"type:uuid" json:"updated_by_user_id"`

	// Relationships
	Credentials      []Credential `gorm:"foreignKey:CategoryID" json:"-"`
	CreatedBy        User         `gorm:"foreignKey:CreatedByUserID" json:"-"`
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type EncryptedField struct {
	Value     string `json:"value"`
	Nonce     string `json:"nonce"`
	Algorithm string `json:"algorithm"`
}

type Credential struct {
	ID                uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	CategoryID        uuid.UUID  `gorm:"type:uuid;index;not null" json:"category_id"`
	Name              string     `gorm:"index;not null;size:255" json:"name"`
	DatabaseName      *string    `gorm:"size:255;index" json:"database_name"`
	Description       *string    `json:"description"`
	Tags              []string   `gorm:"type:jsonb;index:,type:gin;serializer:json" json:"tags"`
	CredentialFields  map[string]EncryptedField `gorm:"type:jsonb;column:credential_fields;serializer:json" json:"-"`
	MetadataJSON      *string    `gorm:"type:jsonb;column:metadata_json" json:"metadata_json"`
	IsDeleted         bool       `gorm:"default:false;not null" json:"is_deleted"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
	CreatedByUserID   uuid.UUID  `gorm:"type:uuid;not null" json:"created_by_user_id"`
	UpdatedAt         time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
	UpdatedByUserID   *uuid.UUID `gorm:"type:uuid" json:"updated_by_user_id"`

	// Relationships
	Category          Category   `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	CreatedBy         User       `gorm:"foreignKey:CreatedByUserID" json:"created_by,omitempty"`
	UpdatedBy         *User      `gorm:"foreignKey:UpdatedByUserID" json:"updated_by,omitempty"`
}

func (c *Credential) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type AuditAction string

const (
	AuditActionCreate AuditAction = "CREATE"
	AuditActionRead   AuditAction = "READ"
	AuditActionUpdate AuditAction = "UPDATE"
	AuditActionDelete AuditAction = "DELETE"
	AuditActionLogin  AuditAction = "LOGIN"
	AuditActionLogout AuditAction = "LOGOUT"
	AuditActionImport AuditAction = "IMPORT"
	AuditActionExport AuditAction = "EXPORT"
)

type AuditStatus string

const (
	AuditStatusSuccess AuditStatus = "SUCCESS"
	AuditStatusFailure AuditStatus = "FAILURE"
)

type AuditLog struct {
	ID              uuid.UUID    `gorm:"type:uuid;primary_key" json:"id"`
	UserID          *uuid.UUID   `gorm:"type:uuid;index" json:"user_id"`
	Action          AuditAction  `gorm:"type:varchar(20);index;not null" json:"action"`
	ResourceType    string       `gorm:"index:idx_resource;not null" json:"resource_type"`
	ResourceID      string       `gorm:"index:idx_resource;not null" json:"resource_id"`
	ChangeSummary   string       `json:"change_summary"`
	OldValue        *string      `gorm:"type:jsonb" json:"old_value"`
	NewValue        *string      `gorm:"type:jsonb" json:"new_value"`
	IPAddress       string       `json:"ip_address"`
	UserAgent       string       `json:"user_agent"`
	Status          AuditStatus  `gorm:"type:varchar(20);not null" json:"status"`
	ErrorMessage    *string      `json:"error_message"`
	CreatedAt       time.Time    `gorm:"autoCreateTime;index" json:"created_at"`

	// Relationships
	User            *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type Session struct {
	ID                uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID            uuid.UUID `gorm:"type:uuid;index:idx_user_expires;not null" json:"user_id"`
	RefreshTokenHash  string    `gorm:"not null" json:"-"`
	IsRevoked         bool      `gorm:"default:false;not null" json:"is_revoked"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	ExpiresAt         time.Time `gorm:"index:idx_user_expires;not null" json:"expires_at"`
	IPAddress         string    `json:"ip_address"`
	UserAgent         string    `json:"user_agent"`

	// Relationships
	User              User      `gorm:"foreignKey:UserID" json:"-"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

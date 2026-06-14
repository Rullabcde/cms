package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/company/cms-backend/internal/auth"
	"github.com/company/cms-backend/internal/config"
	"github.com/company/cms-backend/internal/encryption"
	"github.com/company/cms-backend/internal/handlers"
	"github.com/company/cms-backend/internal/middleware"
	"github.com/company/cms-backend/internal/models"
	"github.com/company/cms-backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	// Connect to database
	db := connectDB(cfg)

	// Auto-migrate
	migrateDB(db)

	// Seed default categories
	seedCategories(db, cfg)

	// Initialize encryption engine
	masterKey, err := base64.StdEncoding.DecodeString(cfg.MasterEncryptionKey)
	if err != nil {
		log.Fatalf("Failed to decode MASTER_ENCRYPTION_KEY (must be base64): %v", err)
	}
	crypto, err := encryption.NewEngine(masterKey)
	if err != nil {
		log.Fatalf("Failed to initialize encryption: %v", err)
	}

	// Initialize services
	auditSvc := services.NewAuditService(db)
	userSvc := services.NewUserService(db, auditSvc)
	whitelistSvc := services.NewWhitelistService(db, auditSvc)
	categorySvc := services.NewCategoryService(db, auditSvc)
	credentialSvc := services.NewCredentialService(db, crypto, auditSvc)
	authSvc := auth.NewService(cfg)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authSvc, userSvc, whitelistSvc, auditSvc, cfg.FrontendURL)
	credentialHandler := handlers.NewCredentialHandler(credentialSvc)
	categoryHandler := handlers.NewCategoryHandler(categorySvc)
	userHandler := handlers.NewUserHandler(userSvc)
	whitelistHandler := handlers.NewWhitelistHandler(whitelistSvc)
	auditLogHandler := handlers.NewAuditLogHandler(auditSvc)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(middleware.RequestLogger())
	app.Use(middleware.CORS(cfg.AllowedOrigins))
	app.Use(middleware.SecurityHeaders())

	// Rate limiters
	generalLimiter := middleware.NewRateLimiter(100, time.Minute)
	loginLimiter := middleware.NewRateLimiter(5, 15*time.Minute)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
		})
	})

	// Auth routes (no auth required)
	app.Get("/auth/login", middleware.RateLimit(loginLimiter), authHandler.Login)
	app.Get("/auth/callback", authHandler.Callback)

	// Auth routes (auth required)
	authGroup := app.Group("/auth")
	authGroup.Use(middleware.Auth(authSvc))
	authGroup.Use(middleware.CSRFProtection())
	authGroup.Post("/refresh", authHandler.Refresh)
	authGroup.Post("/logout", authHandler.Logout)
	authGroup.Get("/me", authHandler.Me)

	// API routes (auth required)
	api := app.Group("/api")
	api.Use(middleware.Auth(authSvc))
	api.Use(middleware.CSRFProtection())
	api.Use(middleware.RateLimit(generalLimiter))

	// Credentials
	api.Get("/credentials", middleware.RequireRole(models.RoleAdmin, models.RoleEditor, models.RoleViewer), credentialHandler.List)
	api.Get("/credentials/:id", middleware.RequireRole(models.RoleAdmin, models.RoleEditor, models.RoleViewer), credentialHandler.Get)
	api.Post("/credentials", middleware.RequireRole(models.RoleAdmin, models.RoleEditor), credentialHandler.Create)
	api.Post("/credentials/import", middleware.RequireRole(models.RoleAdmin, models.RoleEditor), credentialHandler.ImportCSV)
	api.Put("/credentials/:id", middleware.RequireRole(models.RoleAdmin, models.RoleEditor), credentialHandler.Update)
	api.Delete("/credentials/:id", middleware.RequireRole(models.RoleAdmin, models.RoleEditor), credentialHandler.Delete)

	// Search
	api.Get("/search", middleware.RequireRole(models.RoleAdmin, models.RoleEditor, models.RoleViewer), credentialHandler.List)

	// Categories
	api.Get("/categories", middleware.RequireRole(models.RoleAdmin, models.RoleEditor, models.RoleViewer), categoryHandler.List)
	api.Post("/categories", middleware.RequireRole(models.RoleAdmin), categoryHandler.Create)
	api.Put("/categories/:id", middleware.RequireRole(models.RoleAdmin), categoryHandler.Update)
	api.Delete("/categories/:id", middleware.RequireRole(models.RoleAdmin), categoryHandler.Delete)

	// Users
	api.Get("/users", middleware.RequireRole(models.RoleAdmin), userHandler.List)
	api.Put("/users/:id/role", middleware.RequireRole(models.RoleAdmin), userHandler.UpdateRole)
	api.Put("/users/:id/deactivate", middleware.RequireRole(models.RoleAdmin), userHandler.Deactivate)

	// Whitelist
	api.Get("/whitelist", middleware.RequireRole(models.RoleAdmin), whitelistHandler.List)
	api.Post("/whitelist", middleware.RequireRole(models.RoleAdmin), whitelistHandler.Add)
	api.Delete("/whitelist/:id", middleware.RequireRole(models.RoleAdmin), whitelistHandler.Remove)
	api.Post("/whitelist/import", middleware.RequireRole(models.RoleAdmin), whitelistHandler.BulkImport)

	// Audit Logs
	api.Get("/audit-logs", middleware.RequireRole(models.RoleAdmin), auditLogHandler.List)
	api.Get("/audit-logs/export", middleware.RequireRole(models.RoleAdmin), auditLogHandler.Export)

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		fmt.Println("Shutting down server...")
		app.Shutdown()
	}()

	// Start server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	fmt.Printf("CMS Backend starting on %s (env: %s)\n", addr, cfg.Env)
	log.Fatal(app.Listen(addr))
}

func connectDB(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSSLMode,
	)

	gormConfig := &gorm.Config{}
	if cfg.Env == "development" {
		gormConfig.Logger = logger.Default.LogMode(logger.Info)
	} else {
		gormConfig.Logger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db
}

func migrateDB(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.User{},
		&models.WhitelistEmail{},
		&models.Category{},
		&models.Credential{},
		&models.AuditLog{},
		&models.Session{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	fmt.Println("Database migration completed")
}

func ensureSystemUser(db *gorm.DB) uuid.UUID {
	systemEmail := "system@cms.internal"
	var user models.User
	result := db.Where("email = ?", systemEmail).First(&user)
	if result.Error == nil {
		return user.ID
	}
	if result.Error != gorm.ErrRecordNotFound {
		log.Fatalf("Failed to query system user: %v", result.Error)
	}

	// Create the system user
	user = models.User{
		Email:          systemEmail,
		GoogleOAuthSub: "system-service-account",
		Role:           models.RoleAdmin,
		IsActive:       true,
	}
	if err := db.Create(&user).Error; err != nil {
		log.Fatalf("Failed to create system user: %v", err)
	}
	fmt.Println("Created system user for seeding")
	return user.ID
}

func seedCategories(db *gorm.DB, cfg *config.Config) {
	systemUserID := ensureSystemUser(db)

	// Bootstrap the first admin
	if cfg.AdminEmail != "" {
		// Ensure admin email is whitelisted
		var wlCount int64
		db.Model(&models.WhitelistEmail{}).Where("email = ?", cfg.AdminEmail).Count(&wlCount)
		if wlCount == 0 {
			entry := models.WhitelistEmail{
				Email:           cfg.AdminEmail,
				IsActive:        true,
				CreatedByUserID: systemUserID,
			}
			if err := db.Create(&entry).Error; err != nil {
				log.Printf("Failed to whitelist admin email %q: %v", cfg.AdminEmail, err)
			} else {
				fmt.Printf("Whitelisted admin email: %s\n", cfg.AdminEmail)
			}
		}

		// Ensure admin user exists
		var adminCount int64
		db.Model(&models.User{}).Where("email = ?", cfg.AdminEmail).Count(&adminCount)
		if adminCount == 0 {
			admin := models.User{
				Email:          cfg.AdminEmail,
				GoogleOAuthSub: "pending-oauth-login",
				Role:           models.RoleAdmin,
				IsActive:       true,
			}
			if err := db.Create(&admin).Error; err != nil {
				log.Printf("Failed to create admin user %q: %v", cfg.AdminEmail, err)
			} else {
				fmt.Printf("Created admin user: %s\n", cfg.AdminEmail)
			}
		}
	}

	defaultCategories := []models.Category{
		{Name: "MySQL", IsDefault: true},
		{Name: "PostgreSQL", IsDefault: true},
		{Name: "MongoDB", IsDefault: true},
		{Name: "MariaDB", IsDefault: true},
	}

	for _, cat := range defaultCategories {
		var count int64
		db.Model(&models.Category{}).Where("name = ?", cat.Name).Count(&count)
		if count == 0 {
			cat.CreatedByUserID = systemUserID
			if err := db.Create(&cat).Error; err != nil {
				log.Printf("Failed to seed category %q: %v", cat.Name, err)
				continue
			}
			fmt.Printf("Seeded category: %s\n", cat.Name)
		}
	}
}

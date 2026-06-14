.PHONY: help dev-backend dev-frontend dev docker-up docker-down build test

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-backend: ## Start backend dev server
	cd backend && go run ./cmd/server

dev-frontend: ## Start frontend dev server
	cd frontend && npm run dev

docker-up: ## Start all services with Docker Compose
	docker compose up -d

docker-down: ## Stop all Docker services
	docker compose down

docker-build: ## Build Docker images
	docker compose build

docker-logs: ## View Docker logs
	docker compose logs -f

build-backend: ## Build backend binary
	cd backend && CGO_ENABLED=0 go build -ldflags="-w -s" -o ../bin/cms-server ./cmd/server

build-frontend: ## Build frontend
	cd frontend && npm run build

build: build-backend build-frontend ## Build everything

test-backend: ## Run backend tests
	cd backend && go test ./...

test-frontend: ## Run frontend tests
	cd frontend && npm test

test: test-backend ## Run all tests

db-migrate: ## Run database migrations
	cd backend && go run ./cmd/server --migrate-only

generate-key: ## Generate a 32-byte encryption key
	@openssl rand -base64 32

lint: ## Run linters
	cd backend && golangci-lint run ./...
	cd frontend && npm run lint

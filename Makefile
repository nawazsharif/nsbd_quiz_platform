.PHONY: help build up down restart logs clean dev prod test

# Default target
help: ## Show this help message
	@echo "Quiz Platform Docker Commands"
	@echo "============================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Production commands
build: ## Build all Docker images
	docker-compose build --no-cache

up: ## Start production services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

# Development commands
dev-build: ## Build development images
	docker-compose -f docker-compose.dev.yml build --no-cache

dev-up: ## Start development services with hot reload
	docker-compose -f docker-compose.dev.yml up -d

dev-down: ## Stop development services
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## View development logs
	docker-compose -f docker-compose.dev.yml logs -f

# Database commands
db-fresh: ## Fresh database with migrations and seeds (DEVELOPMENT ONLY)
	docker-compose exec backend php artisan migrate:fresh --seed

db-migrate: ## Run database migrations
	docker-compose exec backend php artisan migrate

db-seed: ## Run database seeders
	docker-compose exec backend php artisan db:seed

# Backend commands
backend-shell: ## Access backend container shell
	docker-compose exec backend bash

backend-artisan: ## Run artisan commands (Usage: make backend-artisan ARGS="route:list")
	docker-compose exec backend php artisan $(ARGS)

backend-composer: ## Run composer commands (Usage: make backend-composer ARGS="install")
	docker-compose exec backend composer $(ARGS)

backend-test: ## Run backend tests
	docker-compose exec backend php artisan test

# Frontend commands
frontend-shell: ## Access frontend container shell
	docker-compose exec frontend sh

frontend-npm: ## Run npm commands (Usage: make frontend-npm ARGS="install")
	docker-compose exec frontend npm $(ARGS)

frontend-build: ## Build frontend for production
	docker-compose exec frontend npm run build

# Utility commands
clean: ## Clean up Docker resources
	docker-compose down -v
	docker system prune -f
	docker volume prune -f

clean-all: ## Clean up everything including images
	docker-compose down -v --rmi all
	docker system prune -a -f

status: ## Show status of all services
	docker-compose ps

# Setup commands
setup: ## Initial setup for production
	@echo "Setting up Quiz Platform..."
	@echo "1. Building images..."
	make build
	@echo "2. Starting services..."
	make up
	@echo "3. Waiting for services to be ready..."
	sleep 30
	@echo "4. Running migrations..."
	make db-migrate
	@echo "Setup complete! Visit http://localhost:3000"

setup-dev: ## Initial setup for development
	@echo "Setting up Quiz Platform (Development)..."
	@echo "1. Building development images..."
	make dev-build
	@echo "2. Starting development services..."
	make dev-up
	@echo "3. Waiting for services to be ready..."
	sleep 30
	@echo "4. Running migrations and seeds..."
	make db-fresh
	@echo "Development setup complete! Visit http://localhost:3000"


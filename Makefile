.PHONY: help setup install dev clean db-up db-down pre-commit-install pre-commit-run

# Default target
help: ## Show this help message
	@echo "🍽️  Hungry Helper - Development Commands"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Setup and Installation
setup: ## Complete project setup (run once)
	@echo "🚀 Setting up Hungry Helper..."
	@./scripts/setup.sh

install: ## Install dependencies for both frontend and backend
	@echo "📦 Installing dependencies..."
	@$(MAKE) install-backend install-frontend

install-backend: ## Install backend dependencies
	@echo "🐍 Installing backend dependencies..."
	@cd backend && uv sync

install-frontend: ## Install frontend dependencies
	@echo "🌐 Installing frontend dependencies..."
	@cd frontend && pnpm install

env-setup: ## Set up environment files from examples
	@echo "🔧 Setting up environment files..."
	@[ ! -f .env ] && cp env.example .env || echo ".env already exists"
	@echo "⚠️  Please edit the .env file with your actual values"

# Pre-commit hooks
pre-commit-install: ## Install pre-commit hooks
	@echo "🪝 Installing pre-commit hooks..."
	@cd backend && uv run pre-commit install

pre-commit-run: ## Run pre-commit on all files
	@echo "🪝 Running pre-commit checks..."
	@cd backend && uv run pre-commit run --all-files

# Development
dev: ## Start both backend and frontend in development mode
	@echo "🚀 Starting development servers..."
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Start backend development server
	@echo "🐍 Starting backend server..."
	@cd backend && PYTHONUNBUFFERED=1 uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info

dev-frontend: ## Start frontend development server
	@echo "🌐 Starting frontend server..."
	@cd frontend && pnpm run dev

dev-backend-verbose: ## Start backend with verbose logging
	@echo "🐍 Starting backend server with verbose logging..."
	@cd backend && PYTHONUNBUFFERED=1 uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug --access-log

# Database Operations
db-up: ## Start database with Docker
	@echo "🐳 Starting PostgreSQL database..."
	@docker-compose up -d db

db-down: ## Stop database
	@echo "🛑 Stopping database..."
	@docker-compose down

db-create: ## Create database
	@echo "🗄️  Creating database..."
	@createdb meal_planner || echo "Database may already exist"

db-drop: ## Drop database
	@echo "🗑️  Dropping database..."
	@dropdb meal_planner --if-exists

db-reset: ## Reset database (drop, create, migrate)
	@echo "♻️  Resetting database..."
	@$(MAKE) db-drop db-create db-migrate

db-migrate: ## Run database migrations
	@echo "📊 Running database migrations..."
	@cd backend && uv run alembic upgrade head

db-migration: ## Generate new migration (use MESSAGE="description")
	@echo "📝 Generating new migration..."
	@cd backend && uv run alembic revision --autogenerate -m "$(MESSAGE)"

db-shell: ## Open database shell
	@echo "🐘 Opening database shell..."
	@psql meal_planner

# Quick setup commands
quick-start: env-setup install db-up db-create db-migrate dev ## Complete setup and start (for new developers)

reset-dev: clean db-reset install dev ## Reset everything and restart development

# Utilities
clean: ## Clean up temporary files and caches
	@echo "🧹 Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf backend/dist backend/*.egg-info 2>/dev/null || true
	@rm -rf frontend/dist frontend/build 2>/dev/null || true

doctor: ## Diagnose common setup issues
	@echo "🩺 Running health checks..."
	@command -v uv >/dev/null 2>&1 && echo "✅ uv installed" || echo "❌ uv not found - install from https://docs.astral.sh/uv/"
	@command -v pnpm >/dev/null 2>&1 && echo "✅ pnpm installed" || echo "❌ pnpm not found - run: npm install -g pnpm"
	@command -v psql >/dev/null 2>&1 && echo "✅ PostgreSQL installed" || echo "❌ PostgreSQL not found"
	@command -v docker >/dev/null 2>&1 && echo "✅ Docker installed" || echo "❌ Docker not found"
	@[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing - run: make env-setup"

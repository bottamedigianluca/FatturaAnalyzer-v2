# Makefile per FatturaAnalyzer v2 Backend - Aggiornato per macOS

.PHONY: help install dev test clean setup docker lint format check-deps backup

# Colors for output
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# Detect Python command (python3 su macOS, python su altri sistemi)
PYTHON := $(shell command -v python3 2> /dev/null || command -v python 2> /dev/null || echo "python3")

# Default target
help: ## Show this help message
	@echo "$(BLUE)FatturaAnalyzer v2 Backend$(NC)"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and setup
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt
	@echo "$(GREEN)Dependencies installed successfully$(NC)"

dev-install: ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt
	$(PYTHON) -m pip install pytest pytest-asyncio pytest-cov black isort flake8 mypy
	@echo "$(GREEN)Development dependencies installed$(NC)"

setup: ## Initial setup (create directories, config, database)
	@echo "$(BLUE)Setting up project...$(NC)"
	mkdir -p logs data uploads temp backups static
	$(PYTHON) scripts/setup_db.py
	@if [ ! -f config.ini ]; then \
		echo "$(YELLOW)Creating default config.ini...$(NC)"; \
		$(PYTHON) -c "from utils.config_manager import create_default_config; create_default_config()"; \
	fi
	@echo "$(GREEN)Setup completed$(NC)"

# Development
dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	$(PYTHON) scripts/start_dev.py

dev-watch: ## Start development server with auto-reload
	@echo "$(BLUE)Starting development server with auto-reload...$(NC)"
	$(PYTHON) -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level info

# Testing
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(PYTHON) scripts/test_runner.py --type all

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	$(PYTHON) scripts/test_runner.py --type unit

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	$(PYTHON) scripts/test_runner.py --type integration

test-api: ## Run API tests only
	@echo "$(BLUE)Running API tests...$(NC)"
	$(PYTHON) scripts/test_runner.py --type api

test-fast: ## Run tests excluding slow ones
	@echo "$(BLUE)Running fast tests...$(NC)"
	$(PYTHON) scripts/test_runner.py --type fast

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(PYTHON) scripts/test_runner.py --type all --verbose
	@echo "$(GREEN)Coverage report generated: htmlcov/index.html$(NC)"

# Code quality
lint: ## Run linting checks
	@echo "$(BLUE)Running linting checks...$(NC)"
	$(PYTHON) -m flake8 app/ --max-line-length=120 --exclude=__pycache__
	$(PYTHON) -m mypy app/ --ignore-missing-imports

format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(NC)"
	$(PYTHON) -m black app/ tests/ scripts/ utils/ --line-length=120
	$(PYTHON) -m isort app/ tests/ scripts/ utils/ --profile black

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	$(PYTHON) -m black --check app/ tests/ scripts/ utils/ --line-length=120
	$(PYTHON) -m isort --check-only app/ tests/ scripts/ utils/ --profile black

check-deps: ## Check for dependency updates
	@echo "$(BLUE)Checking for dependency updates...$(NC)"
	$(PYTHON) -m pip list --outdated

# Database operations
db-setup: ## Setup database tables
	@echo "$(BLUE)Setting up database...$(NC)"
	$(PYTHON) scripts/setup_db.py

db-analyze: ## Analyze database structure and content
	@echo "$(BLUE)Analyzing database...$(NC)"
	$(PYTHON) -c "import asyncio; from utils.database_tools import analyze_database; print(asyncio.run(analyze_database()))"

db-vacuum: ## Optimize database with VACUUM
	@echo "$(BLUE)Optimizing database...$(NC)"
	$(PYTHON) -c "import asyncio; from utils.database_tools import vacuum_database; asyncio.run(vacuum_database())"

db-check: ## Check database integrity
	@echo "$(BLUE)Checking database integrity...$(NC)"
	$(PYTHON) -c "import asyncio; from utils.database_tools import integrity_check; asyncio.run(integrity_check())"

db-sample: ## Generate sample data for development
	@echo "$(BLUE)Generating sample data...$(NC)"
	$(PYTHON) scripts/generate_sample_data.py

# Backup operations
backup: ## Create database backup
	@echo "$(BLUE)Creating backup...$(NC)"
	$(PYTHON) scripts/backup_db.py

backup-restore: ## Restore from backup (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: BACKUP_FILE variable required$(NC)"; \
		echo "Usage: make backup-restore BACKUP_FILE=backups/database_backup_20240115_120000.db"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring from backup: $(BACKUP_FILE)$(NC)"
	cp "$(BACKUP_FILE)" data/database.db
	@echo "$(GREEN)Backup restored successfully$(NC)"

# Docker operations
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t fattura-analyzer-backend .

docker-run: ## Run Docker container
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run -p 8000:8000 -v $(PWD)/data:/app/data fattura-analyzer-backend

docker-dev: ## Run Docker with development setup
	@echo "$(BLUE)Running Docker in development mode...$(NC)"
	docker-compose up --build

docker-prod: ## Run Docker in production mode
	@echo "$(BLUE)Running Docker in production mode...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

docker-stop: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	docker-compose down

# Altri comandi con Python command detection...
# [resto del Makefile rimane uguale, sostituendo python con $(PYTHON)]

# Info command aggiornato
info: ## Show project information
	@echo "$(BLUE)FatturaAnalyzer v2 Backend Information$(NC)"
	@echo "Python command: $(PYTHON)"
	@echo "Python version: $(shell $(PYTHON) --version)"
	@echo "FastAPI version: $(shell $(PYTHON) -m pip show fastapi | grep Version | cut -d' ' -f2 || echo 'Not installed')"
	@echo "Database path: $(shell $(PYTHON) -c 'from app.config import settings; print(settings.get_database_path())' 2>/dev/null || echo 'N/A')"
	@echo "Config file: $(shell test -f config.ini && echo '✅ Found' || echo '❌ Not found')"
	@echo "Environment: $(shell $(PYTHON) -c 'import os; print(os.getenv(\"ENVIRONMENT\", \"development\"))' 2>/dev/null || echo 'development')"

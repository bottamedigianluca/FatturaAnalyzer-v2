# Makefile per FatturaAnalyzer v2 Backend

.PHONY: help install dev test clean setup docker lint format check-deps backup

# Colors for output
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

# Default target
help: ## Show this help message
	@echo "$(BLUE)FatturaAnalyzer v2 Backend$(NC)"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and setup
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pip install --upgrade pip
	pip install -r requirements.txt
	@echo "$(GREEN)Dependencies installed successfully$(NC)"

dev-install: ## Install development dependencies
	@echo "$(BLUE)Installing development dependencies...$(NC)"
	pip install --upgrade pip
	pip install -r requirements.txt
	pip install pytest pytest-asyncio pytest-cov black isort flake8 mypy
	@echo "$(GREEN)Development dependencies installed$(NC)"

setup: ## Initial setup (create directories, config, database)
	@echo "$(BLUE)Setting up project...$(NC)"
	mkdir -p logs data uploads temp backups static
	python scripts/setup_db.py
	@if [ ! -f config.ini ]; then \
		echo "$(YELLOW)Creating default config.ini...$(NC)"; \
		python -c "from utils.config_manager import create_default_config; create_default_config()"; \
	fi
	@echo "$(GREEN)Setup completed$(NC)"

# Development
dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	python scripts/start_dev.py

dev-watch: ## Start development server with auto-reload
	@echo "$(BLUE)Starting development server with auto-reload...$(NC)"
	uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level info

# Testing
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	python scripts/test_runner.py --type all

test-unit: ## Run unit tests only
	@echo "$(BLUE)Running unit tests...$(NC)"
	python scripts/test_runner.py --type unit

test-integration: ## Run integration tests only
	@echo "$(BLUE)Running integration tests...$(NC)"
	python scripts/test_runner.py --type integration

test-api: ## Run API tests only
	@echo "$(BLUE)Running API tests...$(NC)"
	python scripts/test_runner.py --type api

test-fast: ## Run tests excluding slow ones
	@echo "$(BLUE)Running fast tests...$(NC)"
	python scripts/test_runner.py --type fast

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	python scripts/test_runner.py --type all --verbose
	@echo "$(GREEN)Coverage report generated: htmlcov/index.html$(NC)"

# Code quality
lint: ## Run linting checks
	@echo "$(BLUE)Running linting checks...$(NC)"
	flake8 app/ --max-line-length=120 --exclude=__pycache__
	mypy app/ --ignore-missing-imports

format: ## Format code with black and isort
	@echo "$(BLUE)Formatting code...$(NC)"
	black app/ tests/ scripts/ utils/ --line-length=120
	isort app/ tests/ scripts/ utils/ --profile black

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	black --check app/ tests/ scripts/ utils/ --line-length=120
	isort --check-only app/ tests/ scripts/ utils/ --profile black

check-deps: ## Check for dependency updates
	@echo "$(BLUE)Checking for dependency updates...$(NC)"
	pip list --outdated

# Database operations
db-setup: ## Setup database tables
	@echo "$(BLUE)Setting up database...$(NC)"
	python scripts/setup_db.py

db-analyze: ## Analyze database structure and content
	@echo "$(BLUE)Analyzing database...$(NC)"
	python -c "import asyncio; from utils.database_tools import analyze_database; print(asyncio.run(analyze_database()))"

db-vacuum: ## Optimize database with VACUUM
	@echo "$(BLUE)Optimizing database...$(NC)"
	python -c "import asyncio; from utils.database_tools import vacuum_database; asyncio.run(vacuum_database())"

db-check: ## Check database integrity
	@echo "$(BLUE)Checking database integrity...$(NC)"
	python -c "import asyncio; from utils.database_tools import integrity_check; asyncio.run(integrity_check())"

db-sample: ## Generate sample data for development
	@echo "$(BLUE)Generating sample data...$(NC)"
	python scripts/generate_sample_data.py

# Backup operations
backup: ## Create database backup
	@echo "$(BLUE)Creating backup...$(NC)"
	python scripts/backup_db.py

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

# Deployment
deploy-check: ## Check deployment readiness
	@echo "$(BLUE)Checking deployment readiness...$(NC)"
	@echo "Checking configuration..."
	python -c "from utils.config_manager import validate_config; result = validate_config(); print('✅ Config valid' if result['valid'] else '❌ Config invalid: ' + str(result['errors']))"
	@echo "Checking dependencies..."
	pip check
	@echo "Running tests..."
	python scripts/test_runner.py --type fast --no-coverage
	@echo "$(GREEN)Deployment check completed$(NC)"

deploy-prod: ## Deploy to production (placeholder)
	@echo "$(YELLOW)Production deployment not configured$(NC)"
	@echo "Configure your production deployment process here"

# Maintenance
clean: ## Clean temporary files and cache
	@echo "$(BLUE)Cleaning temporary files...$(NC)"
	python scripts/cleanup.py
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	rm -rf .pytest_cache htmlcov .coverage 2>/dev/null || true
	@echo "$(GREEN)Cleanup completed$(NC)"

clean-logs: ## Clean log files
	@echo "$(BLUE)Cleaning log files...$(NC)"
	find logs/ -name "*.log" -type f -size +10M -delete 2>/dev/null || true
	@echo "$(GREEN)Log cleanup completed$(NC)"

clean-uploads: ## Clean uploaded files
	@echo "$(BLUE)Cleaning uploaded files...$(NC)"
	rm -rf uploads/* temp/* 2>/dev/null || true
	@echo "$(GREEN)Upload cleanup completed$(NC)"

# Information
info: ## Show project information
	@echo "$(BLUE)FatturaAnalyzer v2 Backend Information$(NC)"
	@echo "Python version: $(shell python --version)"
	@echo "FastAPI version: $(shell pip show fastapi | grep Version | cut -d' ' -f2)"
	@echo "Database path: $(shell python -c 'from app.config import settings; print(settings.get_database_path())')"
	@echo "Config file: $(shell test -f config.ini && echo '✅ Found' || echo '❌ Not found')"
	@echo "Environment: $(shell python -c 'import os; print(os.getenv(\"ENVIRONMENT\", \"development\"))')"

status: ## Show project status
	@echo "$(BLUE)Project Status$(NC)"
	@echo "API Server: $(shell curl -s http://127.0.0.1:8000/health >/dev/null && echo '🟢 Running' || echo '🔴 Not running')"
	@echo "Database: $(shell test -f data/database.db && echo '✅ Found' || echo '❌ Not found')"
	@echo "Last backup: $(shell ls -t backups/*.db 2>/dev/null | head -1 | xargs stat -c %y 2>/dev/null || echo 'No backups found')"

# API operations
api-test: ## Test API connection
	@echo "$(BLUE)Testing API connection...$(NC)"
	python -c "import asyncio; from utils.api_client import test_api_connection; asyncio.run(test_api_connection())"

api-docs: ## Open API documentation
	@echo "$(BLUE)Opening API documentation...$(NC)"
	@echo "API Docs: http://127.0.0.1:8000/api/docs"
	@echo "ReDoc: http://127.0.0.1:8000/api/redoc"

# Security
security-check: ## Run security checks
	@echo "$(BLUE)Running security checks...$(NC)"
	@echo "Checking for known vulnerabilities..."
	pip-audit --desc 2>/dev/null || echo "$(YELLOW)pip-audit not installed, skipping vulnerability check$(NC)"
	@echo "Checking file permissions..."
	@find . -name "*.py" -perm 777 -exec echo "$(YELLOW)Warning: {} has 777 permissions$(NC)" \;

# Performance
benchmark: ## Run performance benchmarks
	@echo "$(BLUE)Running performance benchmarks...$(NC)"
	@echo "$(YELLOW)Benchmark suite not implemented yet$(NC)"

# Documentation
docs-build: ## Build documentation (placeholder)
	@echo "$(BLUE)Building documentation...$(NC)"
	@echo "$(YELLOW)Documentation build not configured$(NC)"

# Aliases for common operations
run: dev ## Alias for dev
start: dev ## Alias for dev
serve: dev ## Alias for dev
check: test lint ## Run tests and linting
build: docker-build ## Alias for docker-build
up: docker-dev ## Alias for docker-dev
down: docker-stop ## Alias for docker-stop

# Advanced operations
profile: ## Run with profiling (development)
	@echo "$(BLUE)Running with profiling...$(NC)"
	python -m cProfile -o profile_output.prof -m uvicorn app.main:app --host 127.0.0.1 --port 8000

monitor: ## Monitor application (placeholder)
	@echo "$(BLUE)Monitoring application...$(NC)"
	@echo "$(YELLOW)Monitoring not configured$(NC)"

# Environment management
env-create: ## Create .env file from template
	@if [ ! -f .env ]; then \
		echo "$(BLUE)Creating .env from template...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN).env file created. Please edit it with your settings.$(NC)"; \
	else \
		echo "$(YELLOW).env file already exists$(NC)"; \
	fi

env-check: ## Check environment configuration
	@echo "$(BLUE)Checking environment configuration...$(NC)"
	@python -c "from app.config import settings; print('✅ Configuration loaded successfully')" 2>/dev/null || echo "❌ Configuration error"

# All-in-one commands
fresh-start: clean setup db-sample dev ## Clean, setup, generate sample data, and start development server

quick-test: format-check lint test-fast ## Quick quality checks and fast tests

full-check: format-check lint test-coverage security-check ## Complete quality and security checks

# Help for specific topics
help-docker: ## Show Docker-specific help
	@echo "$(BLUE)Docker Commands:$(NC)"
	@echo "  $(GREEN)make docker-build$(NC)     - Build Docker image"
	@echo "  $(GREEN)make docker-run$(NC)       - Run container in production mode"
	@echo "  $(GREEN)make docker-dev$(NC)       - Run container in development mode"
	@echo "  $(GREEN)make docker-stop$(NC)      - Stop all containers"

help-test: ## Show testing-specific help
	@echo "$(BLUE)Testing Commands:$(NC)"
	@echo "  $(GREEN)make test$(NC)             - Run all tests"
	@echo "  $(GREEN)make test-unit$(NC)        - Run unit tests only"
	@echo "  $(GREEN)make test-integration$(NC) - Run integration tests only"
	@echo "  $(GREEN)make test-api$(NC)         - Run API tests only"
	@echo "  $(GREEN)make test-fast$(NC)        - Run tests excluding slow ones"
	@echo "  $(GREEN)make test-coverage$(NC)    - Run tests with coverage report"

help-db: ## Show database-specific help
	@echo "$(BLUE)Database Commands:$(NC)"
	@echo "  $(GREEN)make db-setup$(NC)         - Setup database tables"
	@echo "  $(GREEN)make db-analyze$(NC)       - Analyze database structure"
	@echo "  $(GREEN)make db-vacuum$(NC)        - Optimize database"
	@echo "  $(GREEN)make db-check$(NC)         - Check database integrity"
	@echo "  $(GREEN)make db-sample$(NC)        - Generate sample data"
	@echo "  $(GREEN)make backup$(NC)           - Create database backup"

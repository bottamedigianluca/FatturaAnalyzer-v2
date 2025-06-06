# Multi-stage Dockerfile per FatturaAnalyzer v2 Backend
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/opt/poetry/cache \
    POETRY_HOME="/opt/poetry"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libmagic1 \
    libxml2-dev \
    libxslt-dev \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="$POETRY_HOME/bin:$PATH"

# Copy dependency files
WORKDIR /app
COPY pyproject.toml poetry.lock* requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    APP_ENV=production

# Create non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libmagic1 \
    libxml2 \
    libxslt1.1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Set working directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/uploads /app/temp /app/backups /app/static \
    && chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser . .

# Copy configuration files
COPY --chown=appuser:appuser config.ini /app/
COPY --chown=appuser:appuser .env.example /app/.env

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting FatturaAnalyzer v2 Backend..."

# Setup database if it doesn't exist
if [ ! -f "/app/data/fattura_analyzer.db" ]; then
    echo "📊 Setting up database..."
    python -c "
try:
    from utils.database_tools import setup_database
    import asyncio
    asyncio.run(setup_database())
    print('✅ Database setup completed')
except Exception as e:
    print(f'❌ Database setup failed: {e}')
    exit(1)
"
fi

# Check database integrity
echo "🔍 Checking database integrity..."
python -c "
try:
    from utils.database_tools import integrity_check
    import asyncio
    result = asyncio.run(integrity_check())
    if result:
        print('✅ Database integrity check passed')
    else:
        print('⚠️ Database integrity check failed')
except Exception as e:
    print(f'❌ Database check failed: {e}')
"

# Start the application
echo "🌐 Starting FastAPI server..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers ${WORKERS:-1} \
    --log-level ${LOG_LEVEL:-info} \
    --access-log \
    --loop uvloop \
    --http httptools
EOF

RUN chmod +x /app/start.sh

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Expose port
EXPOSE 8000

# Default command
CMD ["/app/start.sh"]

# Labels for metadata
LABEL org.opencontainers.image.title="FatturaAnalyzer v2 Backend"
LABEL org.opencontainers.image.description="FastAPI backend for Italian invoice management and reconciliation"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.vendor="FatturaAnalyzer"
LABEL org.opencontainers.image.licenses="MIT"

# Development stage (optional)
FROM production as development

USER root

# Install development dependencies
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    pytest-cov \
    black \
    isort \
    flake8 \
    mypy \
    ipython \
    jupyter

# Install debugging tools
RUN apt-get update && apt-get install -y \
    vim \
    git \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Copy development configuration
COPY --chown=appuser:appuser .env.development /app/.env

# Development startup script
RUN cat > /app/start-dev.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Starting FatturaAnalyzer v2 Backend (Development Mode)..."

# Install/update dependencies if requirements changed
if [ "/app/requirements.txt" -nt "/tmp/requirements.timestamp" ]; then
    echo "📦 Updating dependencies..."
    pip install -r requirements.txt
    touch /tmp/requirements.timestamp
fi

# Setup database
if [ ! -f "/app/data/fattura_analyzer.db" ]; then
    echo "📊 Setting up development database..."
    python scripts/setup_db.py
    echo "🔬 Generating sample data..."
    python scripts/generate_sample_data.py
fi

# Start with auto-reload
echo "🌐 Starting development server with auto-reload..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --reload \
    --reload-dir /app \
    --log-level debug \
    --access-log
EOF

RUN chmod +x /app/start-dev.sh

USER appuser

# Development command
CMD ["/app/start-dev.sh"]

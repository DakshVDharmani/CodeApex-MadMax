# Multi-stage build for optimized production image

# Base image with CUDA support
FROM nvidia/cuda:11.8-devel-ubuntu20.04 as base

# Stage 1: Build dependencies
FROM base as builder

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=$CUDA_HOME/bin:$PATH

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-dev \
    python3-pip \
    git \
    wget \
    curl \
    build-essential \
    ffmpeg \
    libsndfile1 \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3.9 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install wheel
RUN pip install --upgrade pip setuptools wheel

# Copy requirements and install Python dependencies
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt

# Stage 2: Production image
FROM base as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-dev \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3.9 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy installed packages from builder stage
COPY --from=builder /opt/venv /opt/venv

# Create application directory
WORKDIR /app

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY configs/ ./configs/
COPY vector_db/ ./vector_db/

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install && npm run build

# Set working directory for backend
WORKDIR /app/backend

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose ports
EXPOSE 8000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command
CMD ["python", "main.py"]

# Labels
LABEL maintainer="Misinformation Research AI Team"
LABEL version="1.0.0"
LABEL description="AI-powered misinformation detection for scientific content"

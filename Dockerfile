# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files for dependency installation
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./
RUN npm run build


# Stage 2: Python app
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copy source code
COPY src/ ./src/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./static

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV PYTHONPATH=/app \
    DATABASE_PATH=/app/data/letterboxd.db

EXPOSE 8000

# Run the API server with scheduler
CMD ["python", "-m", "src.main"]

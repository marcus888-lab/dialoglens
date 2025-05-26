FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create a non-root user and model directory
RUN useradd -m -u 1001 agent && \
    mkdir -p /app/.cache && \
    chown -R agent:agent /app

# Switch to non-root user
USER agent

# Download model files during build
RUN python main.py download-files

# Default to main agent
CMD ["python", "main.py", "start"]
# Hugging Face Spaces Dockerfile
# Based on Python 3.11 slim
FROM python:3.11-slim

# Set working directory to /code for Hugging Face Spaces convention
WORKDIR /code

# Install system dependencies (ffmpeg is required for Whisper/Pydub)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    git \
 && rm -rf /var/lib/apt/lists/*

# Set up a new user named "user" with user ID 1000
# (Hugging Face Spaces runs containers as a non-root user)
RUN useradd -m -u 1000 user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Create app directory with user permissions
WORKDIR $HOME/app

# Copy requirements and install them
COPY --chown=user requirements.txt $HOME/app/
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p $HOME/app/uploads && chmod 777 $HOME/app/uploads

# Set Hugging Face cache dir to /tmp (or a writable directory)
ENV HF_HOME=/tmp/.cache/huggingface
ENV TRANSFORMERS_CACHE=/tmp/.cache/huggingface
RUN mkdir -p /tmp/.cache/huggingface && chmod 777 /tmp/.cache/huggingface

# Download NLTK data directly during build to avoid runtime downloads
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

# Copy the rest of the application code
COPY --chown=user . $HOME/app/

# Expose Render standard port
EXPOSE 10000

# Run gunicorn on port 10000
CMD ["gunicorn", "-b", "0.0.0.0:10000", "--timeout", "180", "--workers", "1", "--threads", "4", "app:app"]

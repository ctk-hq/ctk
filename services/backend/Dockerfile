FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    pkg-config \
    curl \
    unzip \
    libfreetype6-dev \
    libleptonica-dev \
    libjpeg-dev \
    zlib1g-dev && \
    rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /tmp/requirements.txt

RUN python -m pip install --upgrade pip wheel setuptools && \
    python -m pip wheel --no-cache-dir --wheel-dir /wheels -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    libfreetype6 \
    libjpeg62-turbo && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
RUN python -m pip install --no-index --no-cache-dir /wheels/* && rm -rf /wheels

# Create user with home directory for boto3/AWS SDK
RUN groupadd -g 1000 appuser && \
    useradd -r -u 1000 -g appuser -d /home/appuser -m -s /bin/bash appuser && \
    chown -R appuser:appuser /app

COPY ./src /app

RUN chmod +x -R /app/scripts || true

RUN mkdir -p /srv/static && chown -R appuser:appuser /srv/static

USER appuser

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9001"]

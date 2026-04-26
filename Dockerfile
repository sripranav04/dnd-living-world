FROM node:20-slim

# Install Python, pip, supervisor and psycopg system deps
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Frontend deps ──────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# ── Backend Python venv + deps ─────────────────────────
COPY backend/requirements.txt ./backend/
RUN python3 -m venv /app/backend/.venv && \
    /app/backend/.venv/bin/pip install --upgrade pip && \
    /app/backend/.venv/bin/pip install -r backend/requirements.txt

# ── Copy all source code ───────────────────────────────
COPY frontend/ ./frontend/
COPY backend/  ./backend/

# ── Ensure dynamic components dir exists and is writable ──
RUN mkdir -p /app/frontend/src/components/dynamic && \
    chmod 777 /app/frontend/src/components/dynamic

# ── Supervisor config ──────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Create supervisor log dir ──────────────────────────
RUN mkdir -p /var/log/supervisor

EXPOSE 5173 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
FROM node:20-slim

# Install Python, supervisor, nginx and system deps
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    nginx \
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

# ── Basic auth credentials ─────────────────────────────
RUN echo 'admin:$apr1$A7JebHEi$115pjAYIy1kznjpE8/ecQ/' > /etc/nginx/.htpasswd

# ── Nginx config ───────────────────────────────────────
COPY nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# ── Supervisor config ──────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Create log dirs ────────────────────────────────────
RUN mkdir -p /var/log/supervisor

# Nginx handles routing on port 80
EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
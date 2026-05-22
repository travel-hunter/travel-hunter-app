FROM node:22-bookworm AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY frontend/ ./
RUN npm run build


FROM python:3.12-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        postgresql \
        postgresql-client \
        supervisor \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN POSTGRES_BIN_DIR="$(find /usr/lib/postgresql -type f -name initdb -printf '%h\n' | sort -V | tail -n 1)" \
    && test -n "$POSTGRES_BIN_DIR" \
    && ln -sf "$POSTGRES_BIN_DIR/initdb" /usr/local/bin/initdb \
    && ln -sf "$POSTGRES_BIN_DIR/pg_ctl" /usr/local/bin/pg_ctl \
    && ln -sf "$POSTGRES_BIN_DIR/postgres" /usr/local/bin/postgres \
    && ln -sf "$POSTGRES_BIN_DIR/psql" /usr/local/bin/psql \
    && ln -sf "$POSTGRES_BIN_DIR/pg_isready" /usr/local/bin/pg_isready

WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN python -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/.venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend/alembic.ini ./
COPY backend/alembic ./alembic
COPY backend/app ./app

RUN rm -rf /var/www/html /var/www/travel-hunter \
    && mkdir -p /var/www/html

COPY --from=frontend-builder /frontend/dist/ /var/www/html/

COPY deploy/container/nginx.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default \
    && ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default \
    && nginx -t

COPY deploy/container/supervisord.conf /etc/supervisor/conf.d/travel-hunter.conf
COPY deploy/container/entrypoint.sh /usr/local/bin/travel-hunter-entrypoint

RUN chmod +x /usr/local/bin/travel-hunter-entrypoint \
    && mkdir -p /var/log/travel-hunter /var/log/postgresql /var/run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql /var/run/postgresql

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/travel-hunter-entrypoint"]
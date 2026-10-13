#!/usr/bin/env bash
# ==============================================================================
# GoTrue SMTP Configuration & Verification Utility (Coolify Supabase Service)
# Service Directory: /data/coolify/services/ip1uwkm88a3e7znzprxeh3fz
# Container: supabase-auth-ip1uwkm88a3e7znzprxeh3fz
#
# Usage:
#   1. Inspect current SMTP status (safe, read-only):
#      ./configure-gotrue-smtp.sh --status
#
#   2. Apply validated SMTP configuration and recreate supabase-auth:
#      SMTP_HOST="smtp.example.com" \
#      SMTP_PORT="587" \
#      SMTP_USER="apikey_or_user" \
#      SMTP_PASS="your_smtp_secret" \
#      SMTP_ADMIN_EMAIL="noreply@yourdomain.com" \
#      SMTP_SENDER_NAME="Dr. Tashfin Clinical Portal" \
#      GOTRUE_SITE_URL="https://portal.yourdomain.com" \
#      ./configure-gotrue-smtp.sh --apply
# ==============================================================================

set -euo pipefail

SERVICE_DIR="/data/coolify/services/ip1uwkm88a3e7znzprxeh3fz"
ENV_FILE="${SERVICE_DIR}/.env"
AUTH_CONTAINER="supabase-auth-ip1uwkm88a3e7znzprxeh3fz"

ACTION="${1:---status}"

if [ "${ACTION}" = "--status" ]; then
    echo "=== GoTrue SMTP Configuration Status ==="
    if ! docker ps --format '{{.Names}}' | grep -q "^${AUTH_CONTAINER}$"; then
        echo "STATUS: ERROR (${AUTH_CONTAINER} is not running)"
        exit 1
    fi

    CURRENT_HOST=$(docker inspect "${AUTH_CONTAINER}" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^GOTRUE_SMTP_HOST=' | cut -d= -f2- || true)
    CURRENT_PORT=$(docker inspect "${AUTH_CONTAINER}" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^GOTRUE_SMTP_PORT=' | cut -d= -f2- || true)
    CURRENT_ADMIN=$(docker inspect "${AUTH_CONTAINER}" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^GOTRUE_SMTP_ADMIN_EMAIL=' | cut -d= -f2- || true)
    CURRENT_SIGNUP=$(docker inspect "${AUTH_CONTAINER}" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^GOTRUE_DISABLE_SIGNUP=' | cut -d= -f2- || true)

    echo "GOTRUE_DISABLE_SIGNUP=${CURRENT_SIGNUP:-false}"
    echo "GOTRUE_SMTP_HOST=${CURRENT_HOST:-<unconfigured>}"
    echo "GOTRUE_SMTP_PORT=${CURRENT_PORT:-587}"
    echo "GOTRUE_SMTP_ADMIN_EMAIL=${CURRENT_ADMIN:-<unconfigured>}"

    if [ -z "${CURRENT_HOST}" ] || [ -z "${CURRENT_ADMIN}" ]; then
        echo "SMTP_READY=false (Use scripts/doctor-account-recovery.mjs --generate-token for out-of-band token recovery until SMTP credentials are supplied)"
    else
        echo "SMTP_READY=true"
    fi
    exit 0
fi

if [ "${ACTION}" = "--apply" ]; then
    : "${SMTP_HOST:?ERROR: SMTP_HOST is required}"
    : "${SMTP_PORT:=587}"
    : "${SMTP_USER:?ERROR: SMTP_USER is required}"
    : "${SMTP_PASS:?ERROR: SMTP_PASS is required}"
    : "${SMTP_ADMIN_EMAIL:?ERROR: SMTP_ADMIN_EMAIL is required}"
    : "${SMTP_SENDER_NAME:=Dr. Tashfin Clinical Portal}"

    echo "Testing TCP connectivity to ${SMTP_HOST}:${SMTP_PORT}..."
    if ! timeout 10 bash -c "</dev/tcp/${SMTP_HOST}/${SMTP_PORT}" 2>/dev/null; then
        echo "ERROR: Unable to reach ${SMTP_HOST}:${SMTP_PORT}. Aborting without modifying GoTrue."
        exit 1
    fi

    cp "${ENV_FILE}" "${ENV_FILE}.bak.$(date -u +%Y%m%d_%H%M%S)"
    chmod 600 "${ENV_FILE}.bak."*

    upsert_env() {
        local key="$1"
        local val="$2"
        if grep -q "^${key}=" "${ENV_FILE}"; then
            sed -i "s|^${key}=.*|${key}=${val}|" "${ENV_FILE}"
        else
            echo "${key}=${val}" >> "${ENV_FILE}"
        fi
    }

    upsert_env "SMTP_HOST" "${SMTP_HOST}"
    upsert_env "SMTP_PORT" "${SMTP_PORT}"
    upsert_env "SMTP_USER" "${SMTP_USER}"
    upsert_env "SMTP_PASS" "${SMTP_PASS}"
    upsert_env "SMTP_ADMIN_EMAIL" "${SMTP_ADMIN_EMAIL}"
    upsert_env "SMTP_SENDER_NAME" "\"${SMTP_SENDER_NAME}\""
    upsert_env "DISABLE_SIGNUP" "true"

    if [ -n "${GOTRUE_SITE_URL:-}" ]; then
        upsert_env "GOTRUE_SITE_URL" "${GOTRUE_SITE_URL}"
    fi

    cd "${SERVICE_DIR}"
    docker compose up -d supabase-auth
    echo "SUCCESS: GoTrue SMTP configuration applied and ${AUTH_CONTAINER} restarted."
    exit 0
fi

echo "Usage: $0 [--status | --apply]"
exit 1

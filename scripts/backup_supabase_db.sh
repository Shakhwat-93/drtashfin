#!/usr/bin/env bash
# ==============================================================================
# Doctor Patient Management System - Automated PostgreSQL Backup Script
# Container: supabase-db-ip1uwkm88a3e7znzprxeh3fz
# Destination: /data/backups/postgres/
# Retention: 14 days
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="supabase-db-ip1uwkm88a3e7znzprxeh3fz"
BACKUP_DIR="/data/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/drtashfin_db_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# 1. Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $1" | tee -a "${LOG_FILE}"
}

log "Starting database backup for container: ${CONTAINER_NAME}"

# 2. Check if postgres container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container ${CONTAINER_NAME} is not running. Backup aborted."
    exit 1
fi

# 3. Perform clean compressed pg_dump
log "Executing pg_dump into ${BACKUP_FILE}..."
if docker exec "${CONTAINER_NAME}" pg_dump -U postgres -d postgres --clean --if-exists | gzip > "${BACKUP_FILE}"; then
    # 4. Verify gzip archive integrity
    if gzip -t "${BACKUP_FILE}"; then
        FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log "SUCCESS: Backup completed and verified. File: ${BACKUP_FILE} (Size: ${FILE_SIZE})"
    else
        log "ERROR: Backup archive failed integrity check (gzip -t)."
        rm -f "${BACKUP_FILE}"
        exit 1
    fi
else
    log "ERROR: pg_dump command failed."
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# 5. Clean up old backups older than 14 days
log "Cleaning up backups older than 14 days..."
find "${BACKUP_DIR}" -type f -name "drtashfin_db_backup_*.sql.gz" -mtime +14 -delete

log "Database backup process completed successfully."

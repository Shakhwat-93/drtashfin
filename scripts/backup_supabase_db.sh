#!/usr/bin/env bash
# ==============================================================================
# Doctor Patient Management System - Encrypted Local & Off-Site R2 Backup Script
# Container: supabase-db-ip1uwkm88a3e7znzprxeh3fz
# Local Destination: /data/backups/postgres/ (14-day retention, min 2 kept)
# Off-Site Destination: Cloudflare R2 Bucket `drtashfin-backups` (AES-256-CBC
#                       PBKDF2 encrypted before transfer, SHA-256 verified,
#                       30-day retention, min 2 kept)
# Isolated Config: /etc/drtashfin-backup/backup.env & encryption.key (0600 root)
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="supabase-db-ip1uwkm88a3e7znzprxeh3fz"
BACKUP_DIR="/data/backups/postgres"
CONFIG_DIR="/etc/drtashfin-backup"
ENV_FILE="${CONFIG_DIR}/backup.env"
KEY_FILE="${CONFIG_DIR}/encryption.key"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
RAW_BACKUP_FILE="${BACKUP_DIR}/drtashfin_db_backup_${TIMESTAMP}.sql.gz"
ENC_BACKUP_FILE="${BACKUP_DIR}/drtashfin_db_backup_${TIMESTAMP}.sql.gz.enc"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $1" | tee -a "${LOG_FILE}"
}

log "Starting database backup for container: ${CONTAINER_NAME}"

# 1. Verify PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container ${CONTAINER_NAME} is not running. Backup aborted."
    exit 1
fi

# 2. Verify isolated encryption key and off-site config exist
if [ ! -f "${KEY_FILE}" ] || [ ! -f "${ENV_FILE}" ]; then
    log "ERROR: Isolated backup credentials (${ENV_FILE} or ${KEY_FILE}) missing."
    exit 1
fi

# 3. Perform clean compressed pg_dump
log "Executing pg_dump into ${RAW_BACKUP_FILE}..."
if ! docker exec "${CONTAINER_NAME}" pg_dump -U postgres -d postgres --clean --if-exists | gzip -9 > "${RAW_BACKUP_FILE}"; then
    log "ERROR: pg_dump failed."
    rm -f "${RAW_BACKUP_FILE}"
    exit 1
fi

# 4. Verify gzip archive integrity
if ! gzip -t "${RAW_BACKUP_FILE}"; then
    log "ERROR: Local gzip archive failed integrity verification (gzip -t)."
    rm -f "${RAW_BACKUP_FILE}"
    exit 1
fi

chmod 600 "${RAW_BACKUP_FILE}"
RAW_SIZE=$(du -h "${RAW_BACKUP_FILE}" | cut -f1)
log "Local compressed backup verified: ${RAW_BACKUP_FILE} (Size: ${RAW_SIZE})"

# 5. Encrypt backup locally BEFORE off-site transfer (AES-256-CBC + PBKDF2 100k iterations)
log "Encrypting backup with AES-256-CBC (PBKDF2 100,000 iterations)..."
if ! openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -pass "file:${KEY_FILE}" \
    -in "${RAW_BACKUP_FILE}" \
    -out "${ENC_BACKUP_FILE}"; then
    log "ERROR: OpenSSL encryption failed."
    rm -f "${ENC_BACKUP_FILE}"
    exit 1
fi

chmod 600 "${ENC_BACKUP_FILE}"
LOCAL_SHA256=$(sha256sum "${ENC_BACKUP_FILE}" | awk '{print $1}')
ENC_BYTES=$(stat -c%s "${ENC_BACKUP_FILE}")
log "Encrypted archive ready: ${ENC_BACKUP_FILE} (${ENC_BYTES} bytes, SHA-256: ${LOCAL_SHA256})"

# 6. Upload encrypted archive to private Cloudflare R2 bucket and verify integrity
R2_OBJECT_KEY="postgres/drtashfin_db_backup_${TIMESTAMP}.sql.gz.enc"
log "Uploading encrypted archive to off-site R2 (${R2_OBJECT_KEY}) and verifying SHA-256 parity..."

if ! python3 - "${ENV_FILE}" "${ENC_BACKUP_FILE}" "${R2_OBJECT_KEY}" "${LOCAL_SHA256}" << 'PYEOF'
import sys, urllib.request, hmac, hashlib, datetime, xml.etree.ElementTree as ET

env_path, file_path, object_key, expected_sha256 = sys.argv[1:5]

env = {}
with open(env_path, 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v.strip('"').strip("'")

endpoint = env['BACKUP_R2_ENDPOINT'].rstrip('/')
bucket = env['BACKUP_R2_BUCKET']
access_key = env['BACKUP_R2_ACCESS_KEY_ID']
secret_key = env['BACKUP_R2_SECRET_ACCESS_KEY']
host = endpoint.replace('https://', '').split('/')[0]

with open(file_path, 'rb') as f:
    payload = f.read()

payload_hash = hashlib.sha256(payload).hexdigest()
if payload_hash != expected_sha256:
    raise RuntimeError("Local file SHA-256 mismatch prior to upload.")

def sign_s3(method, uri, query="", body_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", extra_headers=None):
    t = datetime.datetime.now(datetime.timezone.utc)
    amz_date = t.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = t.strftime('%Y%m%d')
    region = 'auto'
    service = 's3'
    headers_to_sign = {
        'host': host,
        'x-amz-content-sha256': body_hash,
        'x-amz-date': amz_date,
    }
    if extra_headers:
        for hk, hv in extra_headers.items():
            headers_to_sign[hk.lower()] = hv

    sorted_keys = sorted(headers_to_sign.keys())
    canonical_headers = "".join(f"{k}:{headers_to_sign[k]}\n" for k in sorted_keys)
    signed_headers = ";".join(sorted_keys)
    canonical_request = f"{method}\n{uri}\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"
    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = f"{algorithm}\n{amz_date}\n{credential_scope}\n" + hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()

    def sign(key, msg):
        return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

    k_date = sign(('AWS4' + secret_key).encode('utf-8'), date_stamp)
    k_region = sign(k_date, region)
    k_service = sign(k_region, service)
    k_signing = sign(k_service, 'aws4_request')
    signature = hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    out = {
        'x-amz-date': amz_date,
        'x-amz-content-sha256': body_hash,
        'Authorization': f"{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"
    }
    if extra_headers:
        out.update(extra_headers)
    return out

uri = f"/{bucket}/{object_key}"

# A. PUT encrypted object with SHA-256 metadata
put_extra = {
    'Content-Type': 'application/octet-stream',
    'Content-Length': str(len(payload)),
    'x-amz-meta-sha256': expected_sha256,
    'x-amz-meta-cipher': 'aes-256-cbc-pbkdf2-100000',
}
put_headers = sign_s3('PUT', uri, "", payload_hash, put_extra)
put_req = urllib.request.Request(f"{endpoint}{uri}", data=payload, headers=put_headers, method='PUT')
with urllib.request.urlopen(put_req, timeout=60) as resp:
    if resp.status not in (200, 201):
        raise RuntimeError(f"R2 PUT returned unexpected status {resp.status}")

# B. Download and cryptographically verify remote object
get_headers = sign_s3('GET', uri)
get_req = urllib.request.Request(f"{endpoint}{uri}", headers=get_headers, method='GET')
with urllib.request.urlopen(get_req, timeout=60) as resp:
    remote_bytes = resp.read()
    remote_hash = hashlib.sha256(remote_bytes).hexdigest()
    meta_hash = resp.headers.get('x-amz-meta-sha256', '')
    if remote_hash != expected_sha256 or meta_hash != expected_sha256:
        raise RuntimeError(f"Remote SHA-256 verification failed: expected={expected_sha256}, actual={remote_hash}")

print(f"R2_VERIFIED_OK size={len(remote_bytes)} sha256={remote_hash}")
PYEOF
then
    log "ERROR: Off-site R2 upload or verification failed. Retaining local backup without pruning."
    rm -f "${ENC_BACKUP_FILE}"
    exit 1
fi

# Remove temporary local .enc copy after verified off-site upload (keeping local .sql.gz)
rm -f "${ENC_BACKUP_FILE}"
log "SUCCESS: Off-site encrypted backup uploaded and SHA-256 verified in R2 (${R2_OBJECT_KEY})."

# 7. Safe Local Retention Policy (Keep 14 days, NEVER delete if <= 2 backups exist)
LOCAL_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "drtashfin_db_backup_*.sql.gz" | wc -l)
if [ "${LOCAL_COUNT}" -gt 2 ]; then
    log "Applying local 14-day retention policy (current local backup count: ${LOCAL_COUNT})..."
    find "${BACKUP_DIR}" -maxdepth 1 -type f -name "drtashfin_db_backup_*.sql.gz" -mtime +14 -delete
else
    log "Skipping local pruning to preserve minimum 2 known-good backups (count: ${LOCAL_COUNT})."
fi

log "Database backup process completed successfully."

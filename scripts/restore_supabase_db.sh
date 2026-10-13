#!/usr/bin/env bash
# ==============================================================================
# Doctor Patient Management System — Isolated Database Restoration Utility
# Supports:
#   - v2 Authenticated Encryption (`DRTBKP02` AES-256-GCM + 128-bit Auth Tag)
#   - v1 Backward-Compatible Legacy Backups (`Salted__` OpenSSL AES-256-CBC)
#   - Direct download & SHA-256 verification from Cloudflare R2 (`--r2-key`)
#   - Non-destructive restoration into an isolated target database (`--target-db`)
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="supabase-db-ip1uwkm88a3e7znzprxeh3fz"
CONFIG_DIR="/etc/drtashfin-backup"
ENV_FILE="${CONFIG_DIR}/backup.env"
KEY_FILE="${CONFIG_DIR}/encryption.key"
KEYS_DIR="${CONFIG_DIR}/keys"
CRYPTO_SCRIPT="${CONFIG_DIR}/backup_crypto.py"

R2_OBJECT_KEY=""
LOCAL_ENC_FILE=""
TARGET_DB="drtashfin_restore_test_db"
KEEP_TARGET_DB="false"
ALLOW_PROD_OVERWRITE="false"

while [ $# -gt 0 ]; do
    case "$1" in
        --r2-key)
            R2_OBJECT_KEY="$2"
            shift 2
            ;;
        --local-file)
            LOCAL_ENC_FILE="$2"
            shift 2
            ;;
        --target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        --keep-db)
            KEEP_TARGET_DB="true"
            shift 1
            ;;
        --allow-production-overwrite)
            ALLOW_PROD_OVERWRITE="true"
            shift 1
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [ "${TARGET_DB}" = "postgres" ] && [ "${ALLOW_PROD_OVERWRITE}" != "true" ]; then
    echo "SAFETY ABORT: Refusing to restore into live 'postgres' database without --allow-production-overwrite." >&2
    exit 1
fi

if [ -z "${R2_OBJECT_KEY}" ] && [ -z "${LOCAL_ENC_FILE}" ]; then
    echo "ERROR: Specify either --r2-key <postgres/...enc> or --local-file <path.enc>." >&2
    exit 1
fi

WORK_DIR=$(mktemp -d /tmp/drtashfin_restore.XXXXXX)
chmod 700 "${WORK_DIR}"
cleanup() {
    rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

ENC_PATH="${WORK_DIR}/backup.sql.gz.enc"
DEC_PATH="${WORK_DIR}/backup.sql.gz"

# 1. Obtain encrypted archive (from R2 or local path)
if [ -n "${R2_OBJECT_KEY}" ]; then
    echo "[Restore] Downloading encrypted backup from R2: ${R2_OBJECT_KEY}..."
    python3 - "${ENV_FILE}" "${R2_OBJECT_KEY}" "${ENC_PATH}" << 'PYEOF'
import sys, urllib.request, hmac, hashlib, datetime
env_path, object_key, out_path = sys.argv[1:4]
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
t = datetime.datetime.now(datetime.timezone.utc)
amz_date = t.strftime('%Y%m%dT%H%M%SZ')
date_stamp = t.strftime('%Y%m%d')
body_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
uri = f"/{bucket}/{object_key}"
canonical_headers = f"host:{host}\nx-amz-content-sha256:{body_hash}\nx-amz-date:{amz_date}\n"
signed_headers = "host;x-amz-content-sha256;x-amz-date"
canonical_request = f"GET\n{uri}\n\n{canonical_headers}\n{signed_headers}\n{body_hash}"
credential_scope = f"{date_stamp}/auto/s3/aws4_request"
string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n" + hashlib.sha256(canonical_request.encode()).hexdigest()
def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
k_signing = sign(sign(sign(sign(('AWS4' + secret_key).encode(), date_stamp), 'auto'), 's3'), 'aws4_request')
sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
headers = {
    'x-amz-date': amz_date,
    'x-amz-content-sha256': body_hash,
    'Authorization': f"AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={sig}"
}
req = urllib.request.Request(f"{endpoint}{uri}", headers=headers, method='GET')
with urllib.request.urlopen(req, timeout=60) as resp:
    data = resp.read()
    actual_sha = hashlib.sha256(data).hexdigest()
    meta_sha = resp.headers.get('x-amz-meta-sha256', '')
    if meta_sha and actual_sha != meta_sha:
        raise RuntimeError(f"R2 object SHA-256 mismatch: expected {meta_sha}, got {actual_sha}")
    with open(out_path, 'wb') as out_f:
        out_f.write(data)
print(f"[Restore] R2 download verified: {len(data)} bytes, sha256={actual_sha}")
PYEOF
else
    cp "${LOCAL_ENC_FILE}" "${ENC_PATH}"
fi

# 2. Inspect envelope & decrypt (verifies AES-256-GCM tag for v2 or backward-compatible v1)
echo "[Restore] Inspecting envelope and verifying authenticated decryption..."
ENVELOPE_INFO=$(python3 "${CRYPTO_SCRIPT}" inspect "${ENC_PATH}")
echo "[Restore] Envelope: ${ENVELOPE_INFO}"
DECRYPT_INFO=$(python3 "${CRYPTO_SCRIPT}" decrypt "${ENC_PATH}" "${DEC_PATH}" "${KEY_FILE}" "${KEYS_DIR}")
echo "[Restore] Decryption verified: ${DECRYPT_INFO}"

# 3. Verify gzip archive
gzip -t "${DEC_PATH}"

# 4. Recreate isolated target database and restore SQL dump
echo "[Restore] Provisioning isolated database '${TARGET_DB}'..."
docker exec "${CONTAINER_NAME}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${TARGET_DB} WITH (FORCE);" >/dev/null
docker exec "${CONTAINER_NAME}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${TARGET_DB};" >/dev/null

echo "[Restore] Restoring SQL archive into '${TARGET_DB}'..."
zcat "${DEC_PATH}" | docker exec -i "${CONTAINER_NAME}" psql -U postgres -d "${TARGET_DB}" >/dev/null 2>&1

echo "[Restore] Verifying restored table row counts in '${TARGET_DB}'..."
docker exec "${CONTAINER_NAME}" psql -U postgres -d "${TARGET_DB}" -c "
SELECT 'patients' AS table_name, count(*) AS row_count FROM public.patients
UNION ALL SELECT 'consultations', count(*) FROM public.consultations
UNION ALL SELECT 'prescriptions', count(*) FROM public.prescriptions
UNION ALL SELECT 'prescription_items', count(*) FROM public.prescription_items
UNION ALL SELECT 'clinical_documents', count(*) FROM public.clinical_documents
UNION ALL SELECT 'medicines', count(*) FROM public.medicines
UNION ALL SELECT 'authorized_doctors', count(*) FROM public.authorized_doctors;
"

if [ "${KEEP_TARGET_DB}" != "true" ]; then
    echo "[Restore] Cleaning up isolated database '${TARGET_DB}'..."
    docker exec "${CONTAINER_NAME}" psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB} WITH (FORCE);" >/dev/null
    echo "[Restore] Isolated database '${TARGET_DB}' cleaned up."
else
    echo "[Restore] Keeping isolated database '${TARGET_DB}' for inspection (--keep-db)."
fi

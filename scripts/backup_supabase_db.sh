#!/usr/bin/env bash
# ==============================================================================
# Doctor Patient Management System — Authenticated AES-256-GCM Backup & R2 Sync
# Container: supabase-db-ip1uwkm88a3e7znzprxeh3fz
# Local Destination: /data/backups/postgres/ (14-day retention, min 2 kept)
# Off-Site Destination: Cloudflare R2 Bucket `drtashfin-backups`
#   - Envelope Format: DRTBKP02 (AES-256-GCM, PBKDF2-HMAC-SHA256 600,000 iter,
#     unique 256-bit salt, unique 96-bit nonce, 128-bit GCM auth tag over AAD)
#   - Remote Read-Back & SHA-256 Verification
#   - Structured Telemetry & Multi-Channel Failure Alerting
# ==============================================================================

set -euo pipefail

CONTAINER_NAME="supabase-db-ip1uwkm88a3e7znzprxeh3fz"
BACKUP_DIR="/data/backups/postgres"
CONFIG_DIR="/etc/drtashfin-backup"
ENV_FILE="${CONFIG_DIR}/backup.env"
KEY_FILE="${CONFIG_DIR}/encryption.key"
KEYS_DIR="${CONFIG_DIR}/keys"
CRYPTO_SCRIPT="${CONFIG_DIR}/backup_crypto.py"
LOG_FILE="${BACKUP_DIR}/backup.log"
STATUS_FILE="${BACKUP_DIR}/backup_status.json"
HISTORY_FILE="${BACKUP_DIR}/backup_history.jsonl"
ALERTS_FILE="${BACKUP_DIR}/alerts.jsonl"

SOURCE_DB="postgres"
BACKUP_TAG=""
TEST_ALERT_MODE="false"

while [ $# -gt 0 ]; do
    case "$1" in
        --db)
            SOURCE_DB="$2"
            shift 2
            ;;
        --tag)
            BACKUP_TAG="_$2"
            shift 2
            ;;
        --test-alert)
            TEST_ALERT_MODE="true"
            shift 1
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

START_EPOCH_MS=$(python3 -c 'import time; print(int(time.time()*1000))')
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
ISO_NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RAW_BACKUP_FILE="${BACKUP_DIR}/drtashfin_db_backup_${TIMESTAMP}${BACKUP_TAG}.sql.gz"
ENC_BACKUP_FILE="${BACKUP_DIR}/drtashfin_db_backup_${TIMESTAMP}${BACKUP_TAG}.sql.gz.enc"
R2_OBJECT_KEY="postgres/drtashfin_db_backup_${TIMESTAMP}${BACKUP_TAG}.sql.gz.enc"

log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $1" | tee -a "${LOG_FILE}"
}

# Upload a monitoring JSON/JSONL file to R2 (best-effort, non-fatal if network is down)
sync_monitoring_to_r2() {
    local local_path="$1"
    local r2_key="$2"
    local content_type="${3:-application/json}"
    if [ ! -f "${ENV_FILE}" ] || [ ! -f "${local_path}" ]; then
        return 0
    fi
    python3 - "${ENV_FILE}" "${local_path}" "${r2_key}" "${content_type}" << 'PYEOF' || true
import sys, urllib.request, hmac, hashlib, datetime
env_path, file_path, object_key, content_type = sys.argv[1:5]
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
t = datetime.datetime.now(datetime.timezone.utc)
amz_date = t.strftime('%Y%m%dT%H%M%SZ')
date_stamp = t.strftime('%Y%m%d')
uri = f"/{bucket}/{object_key}"
headers_to_sign = {
    'content-length': str(len(payload)),
    'content-type': content_type,
    'host': host,
    'x-amz-content-sha256': payload_hash,
    'x-amz-date': amz_date,
}
sorted_keys = sorted(headers_to_sign.keys())
canonical_headers = "".join(f"{k}:{headers_to_sign[k]}\n" for k in sorted_keys)
signed_headers = ";".join(sorted_keys)
canonical_request = f"PUT\n{uri}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}"
credential_scope = f"{date_stamp}/auto/s3/aws4_request"
string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n" + hashlib.sha256(canonical_request.encode()).hexdigest()
def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
k_signing = sign(sign(sign(sign(('AWS4' + secret_key).encode(), date_stamp), 'auto'), 's3'), 'aws4_request')
sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
req_headers = {
    'Content-Type': content_type,
    'Content-Length': str(len(payload)),
    'x-amz-date': amz_date,
    'x-amz-content-sha256': payload_hash,
    'Authorization': f"AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={sig}"
}
req = urllib.request.Request(f"{endpoint}{uri}", data=payload, headers=req_headers, method='PUT')
with urllib.request.urlopen(req, timeout=20) as resp:
    pass
PYEOF
}

dispatch_alert() {
    local stage="$1"
    local summary="$2"
    local severity="${3:-CRITICAL}"
    local ts
    ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    log "ALERT [${severity}] stage=${stage}: ${summary}"
    logger -p user.crit -t drtashfin-backup "ALERT [${severity}] stage=${stage}: ${summary}" 2>/dev/null || true

    python3 - "${ALERTS_FILE}" "${ENV_FILE}" "${ts}" "${severity}" "${stage}" "${summary}" << 'PYEOF'
import sys, json, urllib.request
alerts_file, env_file, ts, severity, stage, summary = sys.argv[1:7]

channels_delivered = ["local_alerts_ledger", "syslog"]
env = {}
try:
    with open(env_file, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
except Exception:
    pass

webhook_url = env.get("ALERT_WEBHOOK_URL", "")
tg_token = env.get("ALERT_TELEGRAM_BOT_TOKEN", "")
tg_chat = env.get("ALERT_TELEGRAM_CHAT_ID", "")

payload_obj = {
    "timestamp": ts,
    "service": "drtashfin-postgres-backup",
    "severity": severity,
    "stage": stage,
    "summary": summary,
}

if webhook_url:
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload_obj).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            if 200 <= r.status < 300:
                channels_delivered.append("webhook")
    except Exception:
        pass

if tg_token and tg_chat:
    try:
        tg_url = f"https://api.telegram.org/bot{tg_token}/sendMessage"
        tg_body = {
            "chat_id": tg_chat,
            "text": f"[{severity}] Dr. Tashfin Backup Alert\nStage: {stage}\nTime: {ts}\nDetail: {summary}"
        }
        req = urllib.request.Request(
            tg_url,
            data=json.dumps(tg_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            if 200 <= r.status < 300:
                channels_delivered.append("telegram")
    except Exception:
        pass

payload_obj["channels_delivered"] = channels_delivered
with open(alerts_file, "a", encoding="utf-8") as af:
    af.write(json.dumps(payload_obj) + "\n")
PYEOF

    chmod 600 "${ALERTS_FILE}" 2>/dev/null || true
    sync_monitoring_to_r2 "${ALERTS_FILE}" "monitoring/alerts.jsonl" "application/x-ndjson"
}

record_status() {
    local status_val="$1"
    local stage_val="$2"
    local raw_bytes="${3:-0}"
    local enc_bytes="${4:-0}"
    local sha256_val="${5:-}"
    local r2_key_val="${6:-}"
    local err_msg="${7:-}"

    local end_ms
    end_ms=$(python3 -c 'import time; print(int(time.time()*1000))')
    local duration_ms=$((end_ms - START_EPOCH_MS))
    local local_count
    local_count=$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "drtashfin_db_backup_*.sql.gz" | wc -l)

    python3 - "${STATUS_FILE}" "${HISTORY_FILE}" "${TIMESTAMP}" "${status_val}" "${stage_val}" "${SOURCE_DB}" "${raw_bytes}" "${enc_bytes}" "${sha256_val}" "${r2_key_val}" "${local_count}" "${duration_ms}" "${err_msg}" << 'PYEOF'
import sys, json, datetime
(status_file, history_file, run_id, status_val, stage_val, source_db,
 raw_b, enc_b, sha_val, r2_k, loc_cnt, dur_ms, err_m) = sys.argv[1:14]

entry = {
    "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "run_id": run_id,
    "database": source_db,
    "status": status_val,
    "stage": stage_val,
    "cipher": "AES-256-GCM (DRTBKP02 / PBKDF2-HMAC-SHA256 600k)",
    "raw_size_bytes": int(raw_b),
    "encrypted_size_bytes": int(enc_b),
    "sha256": sha_val,
    "r2_object_key": r2_k,
    "local_backup_count": int(loc_cnt),
    "duration_ms": int(dur_ms),
    "error": err_m or None
}

# Only overwrite primary latest_status.json when backing up production 'postgres' DB
if source_db == "postgres":
    with open(status_file, "w", encoding="utf-8") as sf:
        json.dump(entry, sf, indent=2)

with open(history_file, "a", encoding="utf-8") as hf:
    hf.write(json.dumps(entry) + "\n")
PYEOF

    chmod 600 "${STATUS_FILE}" "${HISTORY_FILE}" 2>/dev/null || true
    if [ "${SOURCE_DB}" = "postgres" ] && [ -f "${STATUS_FILE}" ]; then
        sync_monitoring_to_r2 "${STATUS_FILE}" "monitoring/latest_status.json" "application/json"
    fi
}

# Support explicit alert channel test without running a backup
if [ "${TEST_ALERT_MODE}" = "true" ]; then
    dispatch_alert "alert_pipeline_verification" "Synthetic test notification verifying local alert ledger, syslog, and off-site R2 alert synchronization." "TEST"
    echo "ALERT_TEST_DELIVERED_OK"
    exit 0
fi

log "Starting database backup for container=${CONTAINER_NAME} db=${SOURCE_DB}"

# 1. Verify PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    record_status "failure" "container_check" 0 0 "" "" "PostgreSQL container is not running"
    dispatch_alert "container_check" "PostgreSQL container ${CONTAINER_NAME} is not running. Backup aborted."
    exit 1
fi

# 2. Verify isolated encryption key, crypto engine, and off-site config exist
if [ ! -f "${KEY_FILE}" ] || [ ! -f "${ENV_FILE}" ] || [ ! -f "${CRYPTO_SCRIPT}" ]; then
    record_status "failure" "config_check" 0 0 "" "" "Missing encryption key, backup.env, or backup_crypto.py"
    dispatch_alert "config_check" "Missing backup configuration or encryption engine in ${CONFIG_DIR}."
    exit 1
fi

BACKUP_KEY_ID=$(grep '^BACKUP_KEY_ID=' "${ENV_FILE}" | tail -n 1 | cut -d= -f2- | tr -d ' "\\'\''\r' || true)
BACKUP_KEY_ID="${BACKUP_KEY_ID:-k1-primary}"

# 3. Perform clean compressed pg_dump
log "Executing pg_dump (db=${SOURCE_DB}) into ${RAW_BACKUP_FILE}..."
if ! docker exec "${CONTAINER_NAME}" pg_dump -U postgres -d "${SOURCE_DB}" --clean --if-exists | gzip -9 > "${RAW_BACKUP_FILE}"; then
    rm -f "${RAW_BACKUP_FILE}"
    record_status "failure" "pg_dump" 0 0 "" "" "pg_dump execution failed"
    dispatch_alert "pg_dump" "pg_dump failed for database ${SOURCE_DB}. Existing backups preserved without pruning."
    exit 1
fi

# 4. Verify gzip archive integrity and non-trivial size
if ! gzip -t "${RAW_BACKUP_FILE}"; then
    rm -f "${RAW_BACKUP_FILE}"
    record_status "failure" "gzip_verify" 0 0 "" "" "gzip integrity check failed"
    dispatch_alert "gzip_verify" "Local gzip archive failed integrity verification (gzip -t)."
    exit 1
fi

chmod 600 "${RAW_BACKUP_FILE}"
RAW_BYTES=$(stat -c%s "${RAW_BACKUP_FILE}")
RAW_SIZE_HUMAN=$(du -h "${RAW_BACKUP_FILE}" | cut -f1)
if [ "${RAW_BYTES}" -lt 1024 ]; then
    rm -f "${RAW_BACKUP_FILE}"
    record_status "failure" "size_check" "${RAW_BYTES}" 0 "" "" "Backup archive unexpectedly small (<1KB)"
    dispatch_alert "size_check" "pg_dump archive was unexpectedly small (${RAW_BYTES} bytes)."
    exit 1
fi
log "Local compressed backup verified: ${RAW_BACKUP_FILE} (Size: ${RAW_SIZE_HUMAN}, ${RAW_BYTES} bytes)"

# 5. Encrypt backup with Authenticated Encryption (AES-256-GCM / DRTBKP02 / PBKDF2 600k)
log "Encrypting backup with AES-256-GCM (DRTBKP02 envelope, PBKDF2-HMAC-SHA256 600,000 iterations, kid=${BACKUP_KEY_ID})..."
if ! ENC_META=$(python3 "${CRYPTO_SCRIPT}" encrypt "${RAW_BACKUP_FILE}" "${ENC_BACKUP_FILE}" "${KEY_FILE}" "${BACKUP_KEY_ID}"); then
    rm -f "${ENC_BACKUP_FILE}"
    record_status "failure" "aes_gcm_encrypt" "${RAW_BYTES}" 0 "" "" "AES-256-GCM encryption failed"
    dispatch_alert "aes_gcm_encrypt" "AES-256-GCM backup encryption failed."
    exit 1
fi

# 5b. Verify GCM authentication tag and round-trip decryption before upload
if ! python3 "${CRYPTO_SCRIPT}" verify "${ENC_BACKUP_FILE}" "${KEY_FILE}" "${KEYS_DIR}" >/dev/null; then
    rm -f "${ENC_BACKUP_FILE}"
    record_status "failure" "aes_gcm_self_verify" "${RAW_BYTES}" 0 "" "" "Local AES-256-GCM tag verification failed"
    dispatch_alert "aes_gcm_self_verify" "Local AES-256-GCM authentication tag self-verification failed prior to upload."
    exit 1
fi

LOCAL_SHA256=$(sha256sum "${ENC_BACKUP_FILE}" | awk '{print $1}')
ENC_BYTES=$(stat -c%s "${ENC_BACKUP_FILE}")
log "Authenticated encrypted archive verified: ${ENC_BACKUP_FILE} (${ENC_BYTES} bytes, SHA-256: ${LOCAL_SHA256})"

# 6. Upload encrypted archive to private Cloudflare R2 bucket and verify remote SHA-256 parity
log "Uploading encrypted archive to off-site R2 (${R2_OBJECT_KEY}) and verifying SHA-256 parity..."

if ! python3 - "${ENV_FILE}" "${ENC_BACKUP_FILE}" "${R2_OBJECT_KEY}" "${LOCAL_SHA256}" "${BACKUP_KEY_ID}" << 'PYEOF'
import sys, urllib.request, urllib.parse, hmac, hashlib, datetime, xml.etree.ElementTree as ET

env_path, file_path, object_key, expected_sha256, kid = sys.argv[1:6]

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

# A. PUT encrypted object with SHA-256 and v2 cipher metadata
put_extra = {
    'Content-Type': 'application/octet-stream',
    'Content-Length': str(len(payload)),
    'x-amz-meta-sha256': expected_sha256,
    'x-amz-meta-cipher': 'aes-256-gcm-pbkdf2-600000-v2',
    'x-amz-meta-kid': kid,
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
    rm -f "${ENC_BACKUP_FILE}"
    record_status "failure" "r2_upload_verify" "${RAW_BYTES}" "${ENC_BYTES}" "${LOCAL_SHA256}" "${R2_OBJECT_KEY}" "Off-site R2 upload or SHA-256 verification failed"
    dispatch_alert "r2_upload_verify" "Off-site R2 upload or SHA-256 verification failed for ${R2_OBJECT_KEY}. Local backups retained without pruning."
    exit 1
fi

rm -f "${ENC_BACKUP_FILE}"
log "SUCCESS: Off-site AES-256-GCM encrypted backup uploaded and SHA-256 verified in R2 (${R2_OBJECT_KEY})."

# 7. Safe Local Retention Policy (Keep 14 days, NEVER delete if <= 2 backups exist)
if [ "${SOURCE_DB}" = "postgres" ]; then
    LOCAL_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "drtashfin_db_backup_*.sql.gz" | wc -l)
    if [ "${LOCAL_COUNT}" -gt 2 ]; then
        log "Applying local 14-day retention policy (current local backup count: ${LOCAL_COUNT}, min 2 preserved)..."
        find "${BACKUP_DIR}" -maxdepth 1 -type f -name "drtashfin_db_backup_*.sql.gz" -mtime +14 -delete
    else
        log "Skipping local pruning to preserve minimum 2 known-good backups (count: ${LOCAL_COUNT})."
    fi
fi

record_status "success" "completed" "${RAW_BYTES}" "${ENC_BYTES}" "${LOCAL_SHA256}" "${R2_OBJECT_KEY}" ""
log "Database backup process completed successfully."

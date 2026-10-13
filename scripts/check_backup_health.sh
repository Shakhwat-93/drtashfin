#!/usr/bin/env bash
# ==============================================================================
# Doctor Patient Management System — Daily Backup Health & Dead-Man's Switch
# Schedule: 0 3 * * * /root/check_backup_health.sh
# Verifies:
#   1. Latest backup status is 'success' and occurred within the last 26 hours.
#   2. Minimum 2 known-good local backups exist in /data/backups/postgres/.
#   3. Minimum 2 known-good encrypted backups exist in R2 (`drtashfin-backups`),
#      and the latest R2 backup object responds 200 OK with valid SHA-256 header.
#   4. Dispatches an alert if any check fails.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/data/backups/postgres"
CONFIG_DIR="/etc/drtashfin-backup"
ENV_FILE="${CONFIG_DIR}/backup.env"
STATUS_FILE="${BACKUP_DIR}/backup_status.json"
ALERTS_FILE="${BACKUP_DIR}/alerts.jsonl"
LOG_FILE="${BACKUP_DIR}/backup.log"

MAX_AGE_HOURS="${1:-26}"

log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%SZ")] [WATCHDOG] $1" | tee -a "${LOG_FILE}"
}

trigger_watchdog_alert() {
    local reason="$1"
    log "ALERT: ${reason}"
    logger -p user.crit -t drtashfin-backup-watchdog "ALERT: ${reason}" 2>/dev/null || true
    python3 - "${ALERTS_FILE}" "${reason}" << 'PYEOF'
import sys, json, datetime
alerts_file, reason = sys.argv[1:3]
entry = {
    "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "service": "drtashfin-backup-watchdog",
    "severity": "CRITICAL",
    "stage": "scheduled_health_check",
    "summary": reason,
    "channels_delivered": ["local_alerts_ledger", "syslog"]
}
with open(alerts_file, "a", encoding="utf-8") as af:
    af.write(json.dumps(entry) + "\n")
PYEOF
}

if ! CHECK_RESULT=$(python3 - "${STATUS_FILE}" "${BACKUP_DIR}" "${ENV_FILE}" "${MAX_AGE_HOURS}" << 'PYEOF'
import sys, os, json, glob, datetime, urllib.request, hmac, hashlib, xml.etree.ElementTree as ET

status_file, backup_dir, env_file, max_age_hours = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])

if not os.path.isfile(status_file):
    raise RuntimeError("Missing backup_status.json telemetry file.")

with open(status_file, "r", encoding="utf-8") as sf:
    status = json.load(sf)

if status.get("status") != "success":
    raise RuntimeError(f"Last backup run status is '{status.get('status')}' at stage '{status.get('stage')}'.")

ts_str = status.get("timestamp", "")
last_dt = datetime.datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
now_dt = datetime.datetime.now(datetime.timezone.utc)
age_hours = (now_dt - last_dt).total_seconds() / 3600.0
if age_hours > max_age_hours:
    raise RuntimeError(f"Last successful backup is stale ({age_hours:.1f}h old > {max_age_hours}h threshold).")

local_files = sorted(glob.glob(os.path.join(backup_dir, "drtashfin_db_backup_*.sql.gz")))
if len(local_files) < 2:
    raise RuntimeError(f"Fewer than 2 local known-good backups found (count={len(local_files)}).")

# Verify R2 object count & latest object availability + checksum metadata
env = {}
with open(env_file, "r") as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            env[k] = v.strip('"').strip("'")

endpoint = env["BACKUP_R2_ENDPOINT"].rstrip("/")
bucket = env["BACKUP_R2_BUCKET"]
access_key = env["BACKUP_R2_ACCESS_KEY_ID"]
secret_key = env["BACKUP_R2_SECRET_ACCESS_KEY"]
host = endpoint.replace("https://", "").split("/")[0]
body_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

def s3_req(method, uri, query=""):
    t = datetime.datetime.now(datetime.timezone.utc)
    amz_date = t.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = t.strftime("%Y%m%d")
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{body_hash}\nx-amz-date:{amz_date}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = f"{method}\n{uri}\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"
    string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n" + hashlib.sha256(canonical_request.encode()).hexdigest()
    def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
    k_signing = sign(sign(sign(sign(("AWS4" + secret_key).encode(), date_stamp), "auto"), "s3"), "aws4_request")
    sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
    headers = {
        "x-amz-date": amz_date,
        "x-amz-content-sha256": body_hash,
        "Authorization": f"AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={sig}",
    }
    url = f"{endpoint}{uri}" + (f"?{query}" if query else "")
    return urllib.request.Request(url, headers=headers, method=method)

# 1. List R2 objects under postgres/
list_req = s3_req("GET", f"/{bucket}", "list-type=2&prefix=postgres%2F")
with urllib.request.urlopen(list_req, timeout=30) as resp:
    xml_data = resp.read().decode()
root = ET.fromstring(xml_data)
ns = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}
r2_keys = [c.find("s3:Key", ns).text for c in root.findall("s3:Contents", ns)]
if len(r2_keys) < 2:
    raise RuntimeError(f"Fewer than 2 off-site R2 backups found (count={len(r2_keys)}).")

# 2. Verify latest recorded R2 object via HEAD request
latest_key = status.get("r2_object_key")
expected_sha = status.get("sha256")
if not latest_key or latest_key not in r2_keys:
    raise RuntimeError(f"Latest backup object '{latest_key}' not found in R2 bucket listing.")

head_req = s3_req("HEAD", f"/{bucket}/{latest_key}")
with urllib.request.urlopen(head_req, timeout=30) as resp:
    meta_sha = resp.headers.get("x-amz-meta-sha256", "")
    if meta_sha != expected_sha:
        raise RuntimeError(f"Remote R2 HEAD sha256 mismatch: expected {expected_sha}, got {meta_sha}")

print(json.dumps({
    "watchdog": "HEALTHY",
    "last_backup_age_hours": round(age_hours, 2),
    "local_backups_count": len(local_files),
    "r2_backups_count": len(r2_keys),
    "latest_r2_object": latest_key,
    "sha256_verified": expected_sha
}))
PYEOF
2>&1); then
    trigger_watchdog_alert "Backup health check failed: ${CHECK_RESULT}"
    exit 1
fi

log "Backup health check passed: ${CHECK_RESULT}"
echo "${CHECK_RESULT}"

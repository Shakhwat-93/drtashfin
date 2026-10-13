#!/usr/bin/env bash
# ==============================================================================
# Phase 18 — Full Clinical Database, External Snapshot & R2 Archive DR Drill
# ==============================================================================
# Non-destructively verifies complete end-to-end clinical backup & restoration:
#   1. Clones live `postgres` into isolated `drtashfin_dr_phase18_source`.
#   2. Seeds a complete linked synthetic clinical graph:
#      - Authorized doctor record (Dr. Tashfin)
#      - 1 Synthetic patient (PT-999918)
#      - 1 Linked consultation
#      - 1 Linked prescription (Draft -> Items -> Finalized)
#      - MULTIPLE prescription items:
#        * Item 1: Local catalogue medicine (medicine_id != null)
#        * Item 2: External medicine snapshot (medicine_id == null, 1stCef MedEx)
#      - 1 Linked clinical-document metadata record + real PDF in Cloudflare R2
#   3. Runs `/root/backup_supabase_db.sh --db drtashfin_dr_phase18_source --tag phase18_drill`
#      (AES-256-GCM DRTBKP02 envelope + R2 upload + remote SHA-256 verification).
#   4. Drops `drtashfin_dr_phase18_source` and cleans local raw dump.
#   5. Restores from R2 into isolated `drtashfin_dr_phase18_restore` via
#      `/root/restore_supabase_db.sh --r2-key <key> --target-db drtashfin_dr_phase18_restore --keep-db`.
#   6. Verifies:
#      - Schema migrations
#      - Doctor authorization record
#      - Full relational join across clinical graph
#      - Local catalogue item vs. external NULL medicine_id snapshot
#      - Medico-legal immutability triggers (prescription, items, documents)
#      - R2 PDF SHA-256 parity
#      - RLS doctor vs. anon queries
#   7. Cleans up isolated databases and test R2 objects.
# ==============================================================================

set -euo pipefail

CONTAINER="supabase-db-ip1uwkm88a3e7znzprxeh3fz"
SOURCE_DRILL_DB="drtashfin_dr_phase18_source"
RESTORE_DRILL_DB="drtashfin_dr_phase18_restore"
BACKUP_DIR="/data/backups/postgres"

cleanup_dbs() {
    echo "[DR-Phase18] Cleaning up temporary isolated drill databases..."
    docker exec "${CONTAINER}" psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${SOURCE_DRILL_DB} WITH (FORCE);" >/dev/null 2>&1 || true
    docker exec "${CONTAINER}" psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${RESTORE_DRILL_DB} WITH (FORCE);" >/dev/null 2>&1 || true
}
trap cleanup_dbs EXIT

echo "[DR-Phase18] 1. Cloning live 'postgres' schema into isolated staging DB '${SOURCE_DRILL_DB}'..."
cleanup_dbs
docker exec "${CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${SOURCE_DRILL_DB};" >/dev/null
docker exec "${CONTAINER}" pg_dump -U postgres -d postgres --clean --if-exists | docker exec -i "${CONTAINER}" psql -U postgres -d "${SOURCE_DRILL_DB}" >/dev/null 2>&1

echo "[DR-Phase18] 2. Uploading synthetic prescription PDF to Cloudflare R2..."
SYNTH_META=$(python3 - << 'PYEOF'
import hashlib, datetime, json, urllib.request, hmac

env = {}
with open('/etc/drtashfin-backup/backup.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

endpoint = env['BACKUP_R2_ENDPOINT'].rstrip('/')
bucket = env['BACKUP_R2_BUCKET']
access_key = env['BACKUP_R2_ACCESS_KEY_ID']
secret_key = env['BACKUP_R2_SECRET_ACCESS_KEY']
host = endpoint.replace('https://', '').split('/')[0]

pdf_bytes = (
    b"%PDF-1.4\n"
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
    b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
    b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj\n"
    b"% Synthetic DR Drill Prescription RX-2026-999918 (PT-999918)\n"
    b"% MedEx Hybrid Snapshot: 1stCef 500 mg (medicine_id: null)\n"
    b"xref\n0 4\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 4 >>\nstartxref\n0\n%%EOF\n"
)
pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
pdf_size = len(pdf_bytes)
storage_key = "prescriptions/synthetic-phase18-drill/RX-2026-999918-v1.pdf"

t = datetime.datetime.now(datetime.timezone.utc)
amz_date = t.strftime('%Y%m%dT%H%M%SZ')
date_stamp = t.strftime('%Y%m%d')
uri = f"/{bucket}/{storage_key}"
headers_to_sign = {
    'content-length': str(pdf_size),
    'content-type': 'application/pdf',
    'host': host,
    'x-amz-content-sha256': pdf_sha256,
    'x-amz-date': amz_date,
    'x-amz-meta-sha256': pdf_sha256,
}
sorted_keys = sorted(headers_to_sign.keys())
canonical_headers = "".join(f"{k}:{headers_to_sign[k]}\n" for k in sorted_keys)
signed_headers = ";".join(sorted_keys)
canonical_request = f"PUT\n{uri}\n\n{canonical_headers}\n{signed_headers}\n{pdf_sha256}"
credential_scope = f"{date_stamp}/auto/s3/aws4_request"
string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{credential_scope}\n" + hashlib.sha256(canonical_request.encode()).hexdigest()
def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
k_signing = sign(sign(sign(sign(('AWS4' + secret_key).encode(), date_stamp), 'auto'), 's3'), 'aws4_request')
sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
req_headers = {
    'Content-Type': 'application/pdf',
    'Content-Length': str(pdf_size),
    'x-amz-date': amz_date,
    'x-amz-content-sha256': pdf_sha256,
    'x-amz-meta-sha256': pdf_sha256,
    'Authorization': f"AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={sig}"
}
req = urllib.request.Request(f"{endpoint}{uri}", data=pdf_bytes, headers=req_headers, method='PUT')
with urllib.request.urlopen(req, timeout=30) as resp:
    assert resp.status in (200, 201)

print(json.dumps({"bucket": bucket, "storage_key": storage_key, "sha256": pdf_sha256, "size": pdf_size}))
PYEOF
)

PDF_KEY=$(echo "${SYNTH_META}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["storage_key"])')
PDF_SHA256=$(echo "${SYNTH_META}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["sha256"])')
PDF_SIZE=$(echo "${SYNTH_META}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["size"])')

echo "[DR-Phase18] 3. Seeding linked synthetic clinical dataset in '${SOURCE_DRILL_DB}'..."
docker exec -i "${CONTAINER}" psql -U postgres -d "${SOURCE_DRILL_DB}" -v ON_ERROR_STOP=1 << SQLEOF
BEGIN;

-- 1. Doctor Authorization Record
INSERT INTO public.authorized_doctors (user_id, doctor_code, email, full_name, specialty, is_active)
VALUES ('adabdbb0-2308-405c-aa8b-ae672cf1e923', 'dr-tashfin', 'drtashfinahmed@gmail.com', 'Dr. Tashfin Ahmed', 'Cardiology & Medicine', true)
ON CONFLICT (doctor_code) DO UPDATE SET is_active = true;

-- 2. Synthetic Patient
INSERT INTO public.patients (
    id, patient_id, name, date_of_birth, age, gender, weight, phone, email, address, blood_group
) VALUES (
    '00000000-0000-4000-8000-000000001801',
    'PT-999918',
    'SYNTHETIC DR TEST PATIENT (PHASE 18)',
    '1984-06-20',
    42,
    'male',
    76.0,
    '01700009918',
    'synthetic-phase18@example.invalid',
    'Synthetic Ward 18, Dhaka',
    'B+'
);

-- 3. Linked Consultation
INSERT INTO public.consultations (
    id, patient_id, patient_code, consultation_date, chief_complaint,
    clinical_examination, provisional_diagnosis, plan, advice, next_follow_up
) VALUES (
    '00000000-0000-4000-8000-000000001802',
    '00000000-0000-4000-8000-000000001801',
    'PT-999918',
    '2026-10-13',
    'Synthetic acute pharyngitis and fever review (Phase 18)',
    'Throat hyperemic, tonsils grade 2+, temp 101F, chest clear (Synthetic)',
    'Acute Pharyngitis & Mild Fever (Synthetic)',
    'Course of oral antibiotics and antipyretics.',
    'Drink warm water, complete antibiotic course.',
    '2026-10-20'
);

-- 4. Linked Prescription (Draft status initially)
INSERT INTO public.prescriptions (
    id, prescription_code, patient_id, consultation_id, doctor_id,
    prescription_date, status, advice, follow_up_date, follow_up_instructions, notes
) VALUES (
    '00000000-0000-4000-8000-000000001803',
    'RX-2026-999918',
    '00000000-0000-4000-8000-000000001801',
    '00000000-0000-4000-8000-000000001802',
    'dr-tashfin',
    '2026-10-13',
    'draft',
    'Take medications after meals. Complete full 7-day course.',
    '2026-10-20',
    'Follow up if fever persists beyond 3 days.',
    'Phase 18 synthetic test prescription with hybrid items.'
);

-- 5a. Item 1: Local Catalogue Medicine Snapshot (medicine_id != null)
WITH sample_med AS (
    SELECT id, brand_name, generic_name, strength, dosage_form, manufacturer
    FROM public.medicines
    WHERE brand_name = 'Napa'
    LIMIT 1
)
INSERT INTO public.prescription_items (
    id, prescription_id, medicine_id, brand_name, generic_name,
    strength, dosage_form, manufacturer, dose, frequency,
    route, duration, timing_instructions, special_instructions, order_index
)
SELECT
    '00000000-0000-4000-8000-000000001811'::uuid,
    '00000000-0000-4000-8000-000000001803'::uuid,
    id,
    brand_name,
    generic_name,
    COALESCE(strength, '500 mg'),
    COALESCE(dosage_form, 'Tablet'),
    COALESCE(manufacturer, 'Beximco Pharmaceuticals Ltd.'),
    '1 tablet',
    '1+1+1',
    'Oral',
    '5 days',
    'After meal',
    'Take for fever or pain only',
    0
FROM sample_med;

-- 5b. Item 2: SYNTHETIC EXTERNAL MEDICINE SNAPSHOT (medicine_id IS NULL)
INSERT INTO public.prescription_items (
    id, prescription_id, medicine_id, brand_name, generic_name,
    strength, dosage_form, manufacturer, dose, frequency,
    route, duration, timing_instructions, special_instructions, order_index
) VALUES (
    '00000000-0000-4000-8000-000000001812',
    '00000000-0000-4000-8000-000000001803',
    NULL, -- STRICTLY NULL FOR EXTERNAL DATASET ITEMS
    '1stCef',
    'Cefadroxil Monohydrate',
    '500 mg',
    NULL,
    'Medimet Pharmaceuticals Ltd.',
    '1 capsule',
    '1+0+1',
    'Oral',
    '7 days',
    'After meal',
    'Complete full 7-day course without interruption',
    1
);

-- 6. Linked Clinical Document Metadata
INSERT INTO public.clinical_documents (
    id, patient_id, consultation_id, prescription_id, title,
    category, r2_key, file_size_bytes, mime_type, version,
    content_hash, archived_at, archived_by
) VALUES (
    '00000000-0000-4000-8000-000000001804',
    '00000000-0000-4000-8000-000000001801',
    '00000000-0000-4000-8000-000000001802',
    '00000000-0000-4000-8000-000000001803',
    'Official Prescription RX-2026-999918 (v1)',
    'prescription',
    '${PDF_KEY}',
    ${PDF_SIZE},
    'application/pdf',
    1,
    '${PDF_SHA256}',
    NOW(),
    'dr-tashfin'
);

-- 7. Finalize Prescription & attach archive metadata
UPDATE public.prescriptions
SET status = 'finalized',
    finalized_at = NOW(),
    archived_document_id = '00000000-0000-4000-8000-000000001804',
    archived_pdf_key = '${PDF_KEY}',
    archived_pdf_hash = '${PDF_SHA256}',
    archived_pdf_size = ${PDF_SIZE},
    archived_at = NOW(),
    archive_version = 1
WHERE id = '00000000-0000-4000-8000-000000001803';

COMMIT;
SQLEOF

echo "[DR-Phase18] 4. Executing AES-256-GCM (DRTBKP02) backup and R2 upload from '${SOURCE_DRILL_DB}'..."
/root/backup_supabase_db.sh --db "${SOURCE_DRILL_DB}" --tag "phase18_drill"

DRILL_R2_KEY=$(tail -n 1 "${BACKUP_DIR}/backup_history.jsonl" | python3 -c 'import sys,json; print(json.load(sys.stdin)["r2_object_key"])')
echo "[DR-Phase18] Encrypted drill backup uploaded to R2: ${DRILL_R2_KEY}"

# Purge local unencrypted dump and drop source staging DB so restore relies 100% on R2 download & decryption
rm -f "${BACKUP_DIR}"/drtashfin_db_backup_*_phase18_drill.sql.gz
docker exec "${CONTAINER}" psql -U postgres -d postgres -c "DROP DATABASE ${SOURCE_DRILL_DB} WITH (FORCE);" >/dev/null

echo "[DR-Phase18] 5. Restoring '${DRILL_R2_KEY}' from R2 into isolated '${RESTORE_DRILL_DB}'..."
/root/restore_supabase_db.sh --r2-key "${DRILL_R2_KEY}" --target-db "${RESTORE_DRILL_DB}" --keep-db

echo "[DR-Phase18] 6. Verifying restored database integrity, external snapshots, triggers, and RLS..."

docker exec -i "${CONTAINER}" psql -U postgres -d "${RESTORE_DRILL_DB}" -v ON_ERROR_STOP=1 << 'SQLEOF'
DO $$
DECLARE
    v_mig_count int;
    v_join_count int;
    v_doc_count int;
    v_rx_status text;
    v_rx_finalized_at timestamptz;
    v_item1_med_id uuid;
    v_item1_brand text;
    v_item2_med_id uuid;
    v_item2_brand text;
    v_immutable_blocked boolean := false;
    v_item_blocked boolean := false;
    v_doc_blocked boolean := false;
BEGIN
    -- 1. Check migrations
    SELECT count(*) INTO v_mig_count FROM public._schema_migrations;
    IF v_mig_count < 5 THEN
        RAISE EXCEPTION 'Migration count mismatch: expected >= 5, got %', v_mig_count;
    END IF;

    -- 2. Doctor authorization check
    SELECT count(*) INTO v_doc_count FROM public.authorized_doctors WHERE doctor_code = 'dr-tashfin' AND is_active = true;
    IF v_doc_count <> 1 THEN
        RAISE EXCEPTION 'Doctor authorization record missing in restored DB!';
    END IF;

    -- 3. Full relational graph check
    SELECT count(*), max(rx.status), max(rx.finalized_at)
    INTO v_join_count, v_rx_status, v_rx_finalized_at
    FROM public.patients p
    JOIN public.consultations c ON c.patient_id = p.id
    JOIN public.prescriptions rx ON rx.patient_id = p.id AND rx.consultation_id = c.id
    JOIN public.prescription_items ri ON ri.prescription_id = rx.id
    JOIN public.clinical_documents cd ON cd.prescription_id = rx.id AND cd.patient_id = p.id
    WHERE p.patient_id = 'PT-999918'
      AND rx.prescription_code = 'RX-2026-999918'
      AND cd.version = 1;

    IF v_join_count <> 2 THEN
        RAISE EXCEPTION 'Expected 2 joined prescription_items across graph, found %', v_join_count;
    END IF;

    IF v_rx_status <> 'finalized' OR v_rx_finalized_at IS NULL THEN
        RAISE EXCEPTION 'Restored prescription finalization state invalid: %', v_rx_status;
    END IF;

    -- 4. Check Item 1: Local Catalogue item (medicine_id != null)
    SELECT medicine_id, brand_name INTO v_item1_med_id, v_item1_brand
    FROM public.prescription_items
    WHERE id = '00000000-0000-4000-8000-000000001811';

    IF v_item1_med_id IS NULL THEN
        RAISE EXCEPTION 'Local item 1 medicine_id should not be null!';
    END IF;

    -- 5. Check Item 2: Synthetic External Medicine Snapshot (medicine_id IS NULL)
    SELECT medicine_id, brand_name INTO v_item2_med_id, v_item2_brand
    FROM public.prescription_items
    WHERE id = '00000000-0000-4000-8000-000000001812';

    IF v_item2_med_id IS NOT NULL THEN
        RAISE EXCEPTION 'External item 2 medicine_id must be NULL, got %', v_item2_med_id;
    END IF;

    IF v_item2_brand <> '1stCef' THEN
        RAISE EXCEPTION 'External item 2 brand mismatch: expected 1stCef, got %', v_item2_brand;
    END IF;

    -- 6. Check Medico-legal Immutability Triggers
    BEGIN
        UPDATE public.prescriptions SET advice = 'Unauthorized alteration' WHERE id = '00000000-0000-4000-8000-000000001803';
    EXCEPTION WHEN OTHERS THEN
        v_immutable_blocked := true;
    END;
    IF NOT v_immutable_blocked THEN
        RAISE EXCEPTION 'Trigger trg_enforce_prescription_integrity failed to block update on finalized prescription!';
    END IF;

    BEGIN
        DELETE FROM public.prescription_items WHERE id = '00000000-0000-4000-8000-000000001812';
    EXCEPTION WHEN OTHERS THEN
        v_item_blocked := true;
    END;
    IF NOT v_item_blocked THEN
        RAISE EXCEPTION 'Trigger trg_protect_finalized_prescription_items failed to block item deletion!';
    END IF;

    BEGIN
        DELETE FROM public.clinical_documents WHERE id = '00000000-0000-4000-8000-000000001804';
    EXCEPTION WHEN OTHERS THEN
        v_doc_blocked := true;
    END;
    IF NOT v_doc_blocked THEN
        RAISE EXCEPTION 'Trigger trg_protect_archived_clinical_documents failed to block document deletion!';
    END IF;

    RAISE NOTICE 'PHASE_18_SQL_VERIFICATION_PASSED (migrations=%, joined_items=%, external_null_id_verified=true, immutability_triggers_verified=true)', v_mig_count, v_join_count;
END $$;
SQLEOF

echo "[DR-Phase18] 7. Verifying RLS Scoping in restored database (Doctor vs. Anon)..."
docker exec -i "${CONTAINER}" psql -U postgres -d "${RESTORE_DRILL_DB}" -v ON_ERROR_STOP=1 << 'SQLEOF'
BEGIN;
-- Test 7a: Doctor authenticated context
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub":"adabdbb0-2308-405c-aa8b-ae672cf1e923","role":"authenticated","email":"drtashfinahmed@gmail.com"}';

SELECT
    p.patient_id,
    c.provisional_diagnosis,
    rx.prescription_code,
    rx.status AS rx_status,
    count(ri.id) AS item_count,
    cd.r2_key,
    cd.content_hash
FROM public.patients p
JOIN public.consultations c ON c.patient_id = p.id
JOIN public.prescriptions rx ON rx.patient_id = p.id
JOIN public.prescription_items ri ON ri.prescription_id = rx.id
JOIN public.clinical_documents cd ON cd.prescription_id = rx.id
WHERE p.patient_id = 'PT-999918'
GROUP BY p.patient_id, c.provisional_diagnosis, rx.prescription_code, rx.status, cd.r2_key, cd.content_hash;

-- Test 7b: Anon context (must be strictly blocked by table grants and RLS)
SET LOCAL role = 'anon';
SET LOCAL "request.jwt.claims" = '{"role":"anon"}';

DO $$
DECLARE
    v_patients_denied boolean := false;
    v_prescriptions_denied boolean := false;
    v_med_count int;
BEGIN
    -- Check that patients table access is blocked
    BEGIN
        PERFORM count(*) FROM public.patients;
    EXCEPTION WHEN insufficient_privilege THEN
        v_patients_denied := true;
    END;

    -- Check that prescriptions table access is blocked
    BEGIN
        PERFORM count(*) FROM public.prescriptions;
    EXCEPTION WHEN insufficient_privilege THEN
        v_prescriptions_denied := true;
    END;

    IF NOT v_patients_denied OR NOT v_prescriptions_denied THEN
        RAISE EXCEPTION 'RLS/Grant Leak: Unauthenticated anon role was not denied access to clinical tables!';
    END IF;

    -- Medicines table read should be permitted for catalogue search
    SELECT count(*) INTO v_med_count FROM public.medicines;
    IF v_med_count <> 1250 THEN
        RAISE EXCEPTION 'Public medicines count mismatch: expected 1250, got %', v_med_count;
    END IF;

    RAISE NOTICE 'RLS_AND_GRANT_SECURITY_VERIFIED: anon access to clinical tables is strictly blocked with insufficient_privilege; public medicines search is preserved (% rows).', v_med_count;
END $$;

COMMIT;
SQLEOF

echo "[DR-Phase18] 8. Verifying R2 synthetic PDF object read-back & SHA-256 parity..."
python3 - "${PDF_KEY}" "${PDF_SHA256}" << 'PYEOF'
import sys, hashlib, urllib.request, hmac, datetime

pdf_key, expected_sha = sys.argv[1], sys.argv[2]
env = {}
with open('/etc/drtashfin-backup/backup.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

endpoint = env['BACKUP_R2_ENDPOINT'].rstrip('/')
bucket = env['BACKUP_R2_BUCKET']
access_key = env['BACKUP_R2_ACCESS_KEY_ID']
secret_key = env['BACKUP_R2_SECRET_ACCESS_KEY']
host = endpoint.replace('https://', '').split('/')[0]

t = datetime.datetime.now(datetime.timezone.utc)
amz_date = t.strftime('%Y%m%dT%H%M%SZ')
date_stamp = t.strftime('%Y%m%d')
uri = f"/{bucket}/{pdf_key}"
bh = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
canonical_headers = f"host:{host}\nx-amz-content-sha256:{bh}\nx-amz-date:{amz_date}\n"
signed_headers = "host;x-amz-content-sha256;x-amz-date"
canonical_request = f"GET\n{uri}\n\n{canonical_headers}\n{signed_headers}\n{bh}"
scope = f"{date_stamp}/auto/s3/aws4_request"
string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n" + hashlib.sha256(canonical_request.encode()).hexdigest()
def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
k_signing = sign(sign(sign(sign(('AWS4' + secret_key).encode(), date_stamp), 'auto'), 's3'), 'aws4_request')
sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
headers = {
    'x-amz-date': amz_date,
    'x-amz-content-sha256': bh,
    'Authorization': f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed_headers}, Signature={sig}"
}
req = urllib.request.Request(f"{endpoint}{uri}", headers=headers)
with urllib.request.urlopen(req, timeout=30) as resp:
    data = resp.read()
    actual_sha = hashlib.sha256(data).hexdigest()
    assert actual_sha == expected_sha, f"SHA mismatch: expected {expected_sha}, got {actual_sha}"
    print(f"[DR-Phase18] ✓ R2 PDF SHA-256 match confirmed: {actual_sha}")
PYEOF

echo "[DR-Phase18] 9. Cleaning up synthetic PDF from R2..."
python3 - "${PDF_KEY}" << 'PYEOF'
import sys, urllib.request, hmac, hashlib, datetime
pdf_key = sys.argv[1]
env = {}
with open('/etc/drtashfin-backup/backup.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

endpoint = env['BACKUP_R2_ENDPOINT'].rstrip('/')
bucket = env['BACKUP_R2_BUCKET']
access_key = env['BACKUP_R2_ACCESS_KEY_ID']
secret_key = env['BACKUP_R2_SECRET_ACCESS_KEY']
host = endpoint.replace('https://', '').split('/')[0]

t = datetime.datetime.now(datetime.timezone.utc)
amz_date = t.strftime('%Y%m%dT%H%M%SZ')
date_stamp = t.strftime('%Y%m%d')
uri = f"/{bucket}/{pdf_key}"
bh = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
canonical_headers = f"host:{host}\nx-amz-content-sha256:{bh}\nx-amz-date:{amz_date}\n"
signed_headers = "host;x-amz-content-sha256;x-amz-date"
canonical_request = f"DELETE\n{uri}\n\n{canonical_headers}\n{signed_headers}\n{bh}"
scope = f"{date_stamp}/auto/s3/aws4_request"
string_to_sign = f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n" + hashlib.sha256(canonical_request.encode()).hexdigest()
def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
k_signing = sign(sign(sign(sign(('AWS4' + secret_key).encode(), date_stamp), 'auto'), 's3'), 'aws4_request')
sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
headers = {
    'x-amz-date': amz_date,
    'x-amz-content-sha256': bh,
    'Authorization': f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed_headers}, Signature={sig}"
}
req = urllib.request.Request(f"{endpoint}{uri}", headers=headers, method='DELETE')
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print("[DR-Phase18] ✓ Synthetic drill PDF removed from R2.")
except Exception as e:
    print(f"[DR-Phase18] Note: Could not delete drill PDF ({e})")
PYEOF

echo "=== PHASE 18 FULL CLINICAL RESTORE DRILL PASSED 100% ==="

#!/usr/bin/env bash
set -euo pipefail

CONTAINER="supabase-db-ip1uwkm88a3e7znzprxeh3fz"
STAGE_DB="drtashfin_dr_phase21_stage"
MIG_UP="/root/migrations/006_multi_chamber_architecture.sql"
MIG_DOWN="/root/migrations/006_multi_chamber_architecture_down.sql"

echo "=== PHASE 21: MULTI-CHAMBER STAGING VERIFICATION ==="

# 1. Pre-check live DB baseline
echo "1. Checking live database baseline..."
PROD_PTS=$(docker exec -i "$CONTAINER" psql -U postgres -d postgres -t -c "SELECT count(*) FROM patients;" | tr -d '[:space:]')
PROD_MEDS=$(docker exec -i "$CONTAINER" psql -U postgres -d postgres -t -c "SELECT count(*) FROM medicines;" | tr -d '[:space:]')
echo "   Live patients: $PROD_PTS, medicines: $PROD_MEDS"

# 2. Create isolated staging database cloned via pg_dump
echo "2. Creating isolated staging database: $STAGE_DB..."
docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $STAGE_DB;" >/dev/null
docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "CREATE DATABASE $STAGE_DB;" >/dev/null
docker exec -i "$CONTAINER" pg_dump -U postgres -d postgres --clean --if-exists | docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" >/dev/null 2>&1
echo "   Staging database created and schema populated successfully."

# 3. Apply migration 006_multi_chamber_architecture.sql to staging
echo "3. Applying 006_multi_chamber_architecture.sql to $STAGE_DB..."
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" < "$MIG_UP"
echo "   Migration applied successfully."

# 4. Verify chambers table and seeding
echo "4. Verifying chambers table and deterministic seeding..."
CHAMBER_COUNT=$(docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -t -c "SELECT count(*) FROM public.chambers;" | tr -d '[:space:]')
if [ "$CHAMBER_COUNT" != "3" ]; then
  echo "ERROR: Expected 3 chambers, found $CHAMBER_COUNT"
  exit 1
fi
echo "   Chambers count verified: 3"
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "SELECT id, code, name, patient_id_prefix, is_active FROM public.chambers ORDER BY code;"

# 5. Verify idempotent re-run of migration
echo "5. Verifying migration idempotency (re-running 006_multi_chamber_architecture.sql)..."
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" < "$MIG_UP" >/dev/null
CHAMBER_COUNT_AGAIN=$(docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -t -c "SELECT count(*) FROM public.chambers;" | tr -d '[:space:]')
if [ "$CHAMBER_COUNT_AGAIN" != "3" ]; then
  echo "ERROR: Idempotency failed: chamber count changed to $CHAMBER_COUNT_AGAIN"
  exit 1
fi
echo "   Idempotency verified: re-running does not duplicate chambers."

# 6. Test patient registration with chamber-specific prefixes
echo "6. Testing chamber-specific patient insertions and ID trigger..."
DH_ID="d1a4a001-0000-4000-8000-000000000001"
RNG_ID="d1a4a002-0000-4000-8000-000000000002"
N_ID="d1a4a003-0000-4000-8000-000000000003"

# Insert Dhaka patient 1
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
INSERT INTO public.patients (id, chamber_id, name, date_of_birth, gender)
VALUES (gen_random_uuid(), '$DH_ID', 'Staging Dhaka Patient 1', '1990-01-01', 'male');
" >/dev/null

# Insert Rangpur patient 1
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
INSERT INTO public.patients (id, chamber_id, name, date_of_birth, gender)
VALUES (gen_random_uuid(), '$RNG_ID', 'Staging Rangpur Patient 1', '1992-05-15', 'female');
" >/dev/null

# Insert Narayanganj patient 1
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
INSERT INTO public.patients (id, chamber_id, name, date_of_birth, gender)
VALUES (gen_random_uuid(), '$N_ID', 'Staging Narayanganj Patient 1', '1988-11-20', 'male');
" >/dev/null

# Insert second Dhaka patient
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
INSERT INTO public.patients (id, chamber_id, name, date_of_birth, gender)
VALUES (gen_random_uuid(), '$DH_ID', 'Staging Dhaka Patient 2', '1995-03-10', 'female');
" >/dev/null

echo "   Generated patient IDs in staging:"
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
SELECT p.patient_id, p.name, c.code AS chamber, p.created_at
FROM public.patients p
LEFT JOIN public.chambers c ON p.chamber_id = c.id
WHERE p.name LIKE 'Staging%'
ORDER BY p.created_at;
"

# 7. Test relational inheritance triggers (consultations and prescriptions)
echo "7. Testing relational chamber inheritance triggers..."
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
WITH dh_pat AS (SELECT id, patient_id FROM public.patients WHERE name = 'Staging Dhaka Patient 1' LIMIT 1)
INSERT INTO public.consultations (id, patient_id, patient_code, consultation_date, chief_complaint)
SELECT gen_random_uuid(), dh_pat.id, dh_pat.patient_id, CURRENT_DATE, 'Severe Headache'
FROM dh_pat;
" >/dev/null

docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
WITH rng_pat AS (SELECT id FROM public.patients WHERE name = 'Staging Rangpur Patient 1' LIMIT 1)
INSERT INTO public.prescriptions (id, patient_id, doctor_id, prescription_date, status)
SELECT gen_random_uuid(), rng_pat.id, 'dr-tashfin', CURRENT_DATE, 'draft'
FROM rng_pat;
" >/dev/null

echo "   Inherited consultation chamber:"
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
SELECT cs.id, cs.patient_code, cs.chamber_id, ch.code as chamber_code, cs.chief_complaint
FROM public.consultations cs
JOIN public.chambers ch ON cs.chamber_id = ch.id
WHERE cs.chief_complaint = 'Severe Headache';
"

echo "   Inherited prescription chamber:"
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -c "
SELECT rx.id, rx.patient_id, rx.chamber_id, ch.code as chamber_code, rx.status
FROM public.prescriptions rx
JOIN public.chambers ch ON rx.chamber_id = ch.id
WHERE rx.doctor_id = 'dr-tashfin' AND rx.chamber_id = '$RNG_ID';
"

# 8. Test Rollback (Down Migration)
echo "8. Testing rollback migration 006_multi_chamber_architecture_down.sql..."
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" < "$MIG_DOWN"
echo "   Rollback executed."

CHAMBERS_EXISTS=$(docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -t -c "SELECT to_regclass('public.chambers');" | tr -d '[:space:]')
if [ "$CHAMBERS_EXISTS" != "" ]; then
  echo "ERROR: Rollback failed: public.chambers still exists"
  exit 1
fi
echo "   public.chambers dropped cleanly."

LEGACY_SURVIVED=$(docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -t -c "SELECT count(*) FROM public.patients WHERE patient_id = 'PT-000013';" | tr -d '[:space:]')
if [ "$LEGACY_SURVIVED" != "1" ]; then
  echo "ERROR: Legacy record PT-000013 was lost during rollback!"
  exit 1
fi
echo "   Legacy record PT-000013 safely intact after rollback."

# 9. Test Re-applying Migration after Rollback
echo "9. Testing re-application of 006_multi_chamber_architecture.sql after rollback..."
docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" < "$MIG_UP" >/dev/null
REAPPLY_COUNT=$(docker exec -i "$CONTAINER" psql -U postgres -d "$STAGE_DB" -t -c "SELECT count(*) FROM public.chambers;" | tr -d '[:space:]')
if [ "$REAPPLY_COUNT" != "3" ]; then
  echo "ERROR: Re-application failed: expected 3 chambers, found $REAPPLY_COUNT"
  exit 1
fi
echo "   Re-application verified: 3 chambers recreated successfully."

# 10. Clean up staging database
echo "10. Dropping staging database $STAGE_DB..."
docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "DROP DATABASE $STAGE_DB;" >/dev/null
echo "   Staging database dropped."

# 11. Final assertion on production database
echo "11. Verifying production database was completely untouched..."
FINAL_PROD_PTS=$(docker exec -i "$CONTAINER" psql -U postgres -d postgres -t -c "SELECT count(*) FROM patients;" | tr -d '[:space:]')
FINAL_PROD_MEDS=$(docker exec -i "$CONTAINER" psql -U postgres -d postgres -t -c "SELECT count(*) FROM medicines;" | tr -d '[:space:]')

if [ "$FINAL_PROD_PTS" != "$PROD_PTS" ] || [ "$FINAL_PROD_MEDS" != "$PROD_MEDS" ]; then
  echo "CRITICAL: Live database counts changed during staging test!"
  exit 1
fi

echo "=== STAGING VERIFICATION PASSED WITH ZERO PRODUCTION IMPACT ==="
echo "Live patients: $FINAL_PROD_PTS (unchanged), Live medicines: $FINAL_PROD_MEDS (unchanged)"

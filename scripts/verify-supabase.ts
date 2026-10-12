import {
  getPatientRepository,
  getConsultationRepository,
  setRepositoryProvider,
} from '../src/lib/data';
import { SupabasePatientRepository } from '../src/lib/data/repositories/supabase-patient-repository';
import { SupabaseConsultationRepository } from '../src/lib/data/repositories/supabase-consultation-repository';

async function runSyntheticVerification() {
  console.log('--- STARTING SYNTHETIC SUPABASE REPOSITORY VERIFICATION ---');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 1. Force Supabase provider
  setRepositoryProvider('supabase');
  const patientRepo = getPatientRepository();
  const consultRepo = getConsultationRepository();

  if (!(patientRepo instanceof SupabasePatientRepository)) {
    throw new Error('Expected SupabasePatientRepository but got ' + patientRepo.constructor.name);
  }
  if (!(consultRepo instanceof SupabaseConsultationRepository)) {
    throw new Error('Expected SupabaseConsultationRepository but got ' + consultRepo.constructor.name);
  }
  console.log('✓ Repositories instantiated as Supabase implementations');

  let testPatientId: string | null = null;
  let testPatientCode: string | null = null;
  let testConsultationId: string | null = null;

  try {
    // 2. Create synthetic test patient
    console.log('\n[Step 1] Creating synthetic patient in live Supabase...');
    const createdPatient = await patientRepo.createPatient({
      name: 'TEST-SYNTHETIC-AUDIT Patient',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      phone: '+8801700000000',
      bloodGroup: 'O+',
      email: 'test-audit@synthetic.local',
      address: 'House 1, Road 2, Dhaka',
      weight: 70,
    });

    testPatientId = createdPatient.id;
    testPatientCode = createdPatient.patientId;
    console.log(`✓ Patient created with UUID: ${testPatientId}, Code: ${testPatientCode}`);

    if (!testPatientCode || !testPatientCode.startsWith('PT-')) {
      throw new Error(`Invalid patientCode generated: ${testPatientCode}`);
    }

    // 3. Retrieve patient by UUID and by Patient Code
    console.log('\n[Step 2] Retrieving patient by UUID and Code...');
    const fetchedByUuid = await patientRepo.getPatientById(testPatientId);
    if (!fetchedByUuid || fetchedByUuid.name !== 'TEST-SYNTHETIC-AUDIT Patient') {
      throw new Error('Failed to retrieve patient by UUID');
    }
    console.log('✓ Successfully retrieved by UUID');

    const fetchedByCode = await patientRepo.getPatientByIdentifier(testPatientCode);
    if (!fetchedByCode || fetchedByCode.id !== testPatientId) {
      throw new Error('Failed to retrieve patient by human code PT-XXXXXX');
    }
    console.log(`✓ Successfully retrieved by code: ${testPatientCode}`);

    // Search patient
    const searchRes = await patientRepo.getPatients({ search: 'TEST-SYNTHETIC-AUDIT' });
    if (!searchRes.items.some(p => p.id === testPatientId)) {
      throw new Error('Search did not return synthetic patient');
    }
    console.log(`✓ Search matched patient (total results: ${searchRes.total})`);

    // 4. Create linked synthetic consultation
    console.log('\n[Step 3] Creating linked consultation...');
    const createdConsultation = await consultRepo.createConsultation({
      patientId: testPatientCode,
      consultationDate: '2026-10-12',
      chiefComplaint: 'Recurrent headache for 3 days, mild nausea',
      birthHistory: 'Full term normal delivery, cried immediately after birth',
      familyHistory: 'Non-contributory',
      consanguinity: 'no',
      drugHistory: 'None',
      clinicalExamination: 'Alert, oriented, vitals stable, neurological exam normal',
      provisionalDiagnosis: 'Tension-type headache',
      differentialDiagnosis: 'Migraine without aura',
      plan: 'Hydration, regular sleep schedule, symptomatic analgesia',
      advice: 'Avoid screen time in dark, return if symptoms worsen',
      nextFollowUp: '2026-10-26',
    });

    testConsultationId = createdConsultation.id;
    console.log(`✓ Consultation created with ID: ${testConsultationId}`);

    // 5. Query consultation history
    console.log('\n[Step 4] Querying consultation history...');
    const consultByCode = await consultRepo.getConsultationsByPatient(testPatientCode);
    if (consultByCode.length !== 1 || consultByCode[0].id !== testConsultationId) {
      throw new Error('Failed to query consultation history by patient Code');
    }
    console.log(`✓ Retrieved ${consultByCode.length} consultation(s) by patient Code`);

    const consultByUuid = await consultRepo.getConsultationsByPatient(testPatientId);
    if (consultByUuid.length !== 1 || consultByUuid[0].id !== testConsultationId) {
      throw new Error('Failed to query consultation history by patient UUID');
    }
    console.log(`✓ Retrieved ${consultByUuid.length} consultation(s) by patient UUID`);

    // Verify clinical values persistence
    const fetchedConsult = await consultRepo.getConsultationById(testConsultationId);
    if (!fetchedConsult || fetchedConsult.provisionalDiagnosis !== 'Tension-type headache') {
      throw new Error('Consultation diagnosis data mismatch');
    }
    if (fetchedConsult.chiefComplaint !== 'Recurrent headache for 3 days, mild nausea') {
      throw new Error('Consultation chief complaint mismatch');
    }
    console.log('✓ Consultation clinical fields verified: provisionalDiagnosis, chiefComplaint');

    // 6. Update patient record
    console.log('\n[Step 5] Updating patient demographic record...');
    const updatedPatient = await patientRepo.updatePatient(testPatientId, {
      address: 'Updated Road 5, Dhaka',
    });
    if (updatedPatient.address !== 'Updated Road 5, Dhaka') {
      throw new Error('Failed to update patient address');
    }
    console.log('✓ Successfully updated patient record in live Supabase');

    // 7. Test error handling / edge cases
    console.log('\n[Step 6] Verifying edge cases & error handling...');
    const nonExistentConsult = await consultRepo.getConsultationById('00000000-0000-0000-0000-000000000000');
    if (nonExistentConsult !== null) {
      throw new Error('Expected null for non-existent consultation');
    }
    console.log('✓ Non-existent consultation query returned null as expected');

    const nonExistentPatient = await patientRepo.getPatientById('00000000-0000-0000-0000-000000000000');
    if (nonExistentPatient !== null) {
      throw new Error('Expected null for non-existent patient ID');
    }
    console.log('✓ Non-existent patient correctly returned null');

    console.log('\n======================================================');
    console.log('ALL SYNTHETIC PERSISTENCE TESTS PASSED 100%!');
    console.log('======================================================');
  } finally {
    // 8. Cleanup test data
    console.log('\n[Step 7] Safely cleaning up synthetic test records...');
    if (testConsultationId) {
      const { supabase } = await import('../src/lib/supabase/client');
      await supabase.from('consultations').delete().eq('id', testConsultationId);
      console.log(`✓ Synthetic consultation ${testConsultationId} deleted`);
    }
    if (testPatientId) {
      await patientRepo.deletePatient(testPatientId);
      console.log(`✓ Synthetic patient ${testPatientId} deleted`);
    }

    // Verify cleanup
    if (testPatientId) {
      const remaining = await patientRepo.getPatientById(testPatientId);
      if (remaining) {
        console.warn('⚠️ Patient still existed after deletion!');
      } else {
        console.log('✓ Confirmed patient no longer exists in Supabase');
      }
    }
  }
}

runSyntheticVerification()
  .then(() => {
    console.log('\n🎉 VERIFICATION SUCCESSFUL!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
  });

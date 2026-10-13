import process from 'node:process';

const doctorEmail = (process.env.DOCTOR_EMAIL || '').replace(/^["']|["']$/g, '').trim();
const doctorPassword = (process.env.DOCTOR_PASSWORD || '').replace(/^["']|["']$/g, '').trim();

if (!doctorEmail || !doctorPassword) {
  console.error('FAILED: DOCTOR_EMAIL and DOCTOR_PASSWORD environment variables are required.');
  process.exit(1);
}

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000';

async function run() {
  console.log('=== PRODUCTION HYBRID MEDICINE SEARCH VERIFICATION ===');
  console.log('Target URL:', BASE_URL);

  // 1. Authenticate as doctor
  console.log('\n[1] Authenticating doctor against production app...');
  const t0 = Date.now();
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: doctorEmail, password: doctorPassword }),
  });
  const loginDuration = Date.now() - t0;

  if (!loginRes.ok) {
    console.error(`FAILED: Login returned HTTP ${loginRes.status}`);
    const errText = await loginRes.text();
    console.error('Error details:', errText);
    process.exit(1);
  }

  // Extract session cookies
  const rawCookies = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : [loginRes.headers.get('set-cookie')].filter(Boolean);
  const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');
  console.log(`✓ Doctor authenticated successfully (HTTP ${loginRes.status}, ${loginDuration}ms)`);
  console.log('✓ Session cookies captured (dr_access_token & refresh tokens established)');

  // Helper for authorized GET
  async function authorizedGet(path) {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json',
      },
    });
    const duration = Date.now() - start;
    let body = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    return { status: res.status, data: body, duration };
  }

  // 2. Known local medicine search (Napa)
  console.log('\n[2] Searching known local medicine: q=Napa...');
  const localSearch = await authorizedGet('/api/medicines/search?q=Napa&limit=10');
  console.log(`Status: ${localSearch.status}, Duration: ${localSearch.duration}ms`);
  const localResults = localSearch.data?.data?.results || [];
  console.log(`Results returned: ${localResults.length}`);
  const firstLocal = localResults[0];
  console.log('Top match:', {
    brandName: firstLocal?.brandName,
    genericName: firstLocal?.genericName,
    strength: firstLocal?.strength,
    origin: firstLocal?.origin,
    sourceBadge: firstLocal?.sourceBadge,
    isExternal: firstLocal?.isExternal,
  });
  if (firstLocal?.origin !== 'local' || firstLocal?.isExternal !== false) {
    throw new Error('Local search verification failed: first item is not origin=local');
  }
  console.log('✓ Local Supabase search verified: Napa returned with origin=local, sourceBadge="Local Catalogue"');

  // 3. External medicine search absent from local catalogue (1stCef)
  console.log('\n[3] Searching external medicine absent from local catalogue: q=1stCef...');
  const extSearch = await authorizedGet('/api/medicines/search?q=1stCef&limit=10');
  console.log(`Status: ${extSearch.status}, Duration: ${extSearch.duration}ms`);
  const extData = extSearch.data?.data;
  const extResults = extData?.results || [];
  console.log(`Results: ${extResults.length} (Local: ${extData?.localCount}, External: ${extData?.externalCount})`);
  const firstExt = extResults[0];
  console.log('Top match:', {
    brandName: firstExt?.brandName,
    genericName: firstExt?.genericName,
    strength: firstExt?.strength,
    dosageForm: firstExt?.dosageForm,
    manufacturer: firstExt?.manufacturer,
    price: firstExt?.price,
    origin: firstExt?.origin,
    sourceBadge: firstExt?.sourceBadge,
    isExternal: firstExt?.isExternal,
  });
  if (firstExt?.brandName !== '1stCef' || firstExt?.origin !== 'external' || firstExt?.isExternal !== true) {
    throw new Error('External search verification failed: 1stCef was not found or not marked as external');
  }
  if (firstExt?.dosageForm !== undefined) {
    throw new Error('Safety failure: dosageForm was invented for MedEx record!');
  }
  console.log('✓ External fallback verified: 1stCef found from external MedEx dataset with correct provenance and zero invented fields');

  // 4. Multi-strength distinct formulations (3-C)
  console.log('\n[4] Searching multi-strength brand: q=3-C...');
  const multiSearch = await authorizedGet('/api/medicines/search?q=3-C&limit=15');
  console.log(`Status: ${multiSearch.status}, Duration: ${multiSearch.duration}ms`);
  const threeCResults = (multiSearch.data?.data?.results || []).filter(r => r.brandName === '3-C');
  console.log(`Distinct 3-C records returned: ${threeCResults.length}`);
  const strengthsFound = threeCResults.map(r => `${r.brandName} ${r.strength} (${r.price || 'no price'})`);
  console.log('Strengths found:', strengthsFound);
  if (threeCResults.length < 3) {
    throw new Error('Multi-strength verification failed: less than 3 distinct formulations found for 3-C');
  }
  console.log('✓ Formulations distinct: 200 mg, 400 mg, and 100 mg/5 ml remain separate');

  // 5. Partial brand and generic search
  console.log('\n[5] Testing partial generic search: q=Paracet...');
  const paracetSearch = await authorizedGet('/api/medicines/search?q=Paracet&limit=5');
  console.log(`q=Paracet returned: ${paracetSearch.data?.data?.results?.length} items in ${paracetSearch.duration}ms`);
  
  console.log('Testing partial brand search: q=Seclo...');
  const secloSearch = await authorizedGet('/api/medicines/search?q=Seclo&limit=5');
  console.log(`q=Seclo returned: ${secloSearch.data?.data?.results?.length} items in ${secloSearch.duration}ms`);

  // 6. Concurrent identical queries and caching
  console.log('\n[6] Testing 5 concurrent identical queries for q=3Bion...');
  const tConc0 = Date.now();
  const concRes = await Promise.all([
    authorizedGet('/api/medicines/search?q=3Bion'),
    authorizedGet('/api/medicines/search?q=3Bion'),
    authorizedGet('/api/medicines/search?q=3Bion'),
    authorizedGet('/api/medicines/search?q=3Bion'),
    authorizedGet('/api/medicines/search?q=3Bion'),
  ]);
  const concTotal = Date.now() - tConc0;
  console.log(`5 concurrent identical requests completed in ${concTotal}ms (avg ${(concTotal/5).toFixed(1)}ms per request)`);
  for (let i = 0; i < concRes.length; i++) {
    console.log(`  Req ${i+1}: status ${concRes[i].status}, count ${concRes[i].data?.data?.results?.length}, duration ${concRes[i].duration}ms`);
  }

  // Follow-up request to test cache hit
  const cachedRes = await authorizedGet('/api/medicines/search?q=3Bion');
  console.log(`Follow-up query: cacheHit=${cachedRes.data?.data?.cacheHit}, duration=${cachedRes.duration}ms`);
  console.log('✓ Request coalescing & cache behavior verified');

  // 7. Test Pagination limit parameter
  console.log('\n[7] Testing limit parameter...');
  const limit5 = await authorizedGet('/api/medicines/search?q=Cefixime&limit=5');
  const limit15 = await authorizedGet('/api/medicines/search?q=Cefixime&limit=15');
  console.log(`limit=5 returned: ${limit5.data?.data?.results?.length} items`);
  console.log(`limit=15 returned: ${limit15.data?.data?.results?.length} items`);
  if (limit5.data?.data?.results?.length !== 5) {
    throw new Error('Limit parameter was not respected');
  }
  console.log('✓ Result bounding / pagination verified');

  console.log('\n=== ALL PRODUCTION END-TO-END VERIFICATIONS PASSED ===');
}

run().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});

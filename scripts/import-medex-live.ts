import { SupabaseMedicineRepository } from "../src/lib/data/repositories/supabase-medicine-repository";
import { createServerAdminClient } from "../src/lib/supabase/server";
import { CreateMedicineDTO } from "../src/types/medicine";

interface ScrapedCard {
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
  sourceId: string;
  sourceUrl: string;
}

function parseMedexHtml(html: string): ScrapedCard[] {
  const medicines: ScrapedCard[] = [];
  const cardRegex = /<a\s+href="(https:\/\/medex\.com\.bd\/brands\/(\d+)\/[^"]+)"\s+class="brand-card">([\s\S]*?)<\/a>/g;

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const sourceUrl = match[1];
    const sourceId = `medex-${match[2]}`;
    const cardContent = match[3];

    // 1. Dosage form (from img alt or title in dosage-icon)
    const formMatch =
      cardContent.match(/class=['"]dosage-icon['"][^>]*(?:alt|title)=['"]([^'"]+)['"]/i) ||
      cardContent.match(/(?:alt|title)=['"]([^'"]+)['"][^>]*class=['"]dosage-icon['"]/i);
    const dosageForm = formMatch ? formMatch[1].trim() : "Tablet";

    // 2. Brand name
    const nameMatch = cardContent.match(/class="brand-card__name">([^<]+)<\/span>/i);
    const brandName = nameMatch ? nameMatch[1].trim() : "";

    // 3. Strength
    const strengthMatch = cardContent.match(/class="brand-card__strength">([^<]+)<\/div>/i);
    const strength = strengthMatch ? strengthMatch[1].trim() : "";

    // 4. Generic
    const genericMatch = cardContent.match(/class="brand-card__generic">([^<]+)<\/div>/i);
    const genericName = genericMatch
      ? genericMatch[1].replace(/&amp;/g, "&").trim()
      : "";

    // 5. Manufacturer
    const compMatch = cardContent.match(/class="brand-card__company">([^<]+)<\/div>/i);
    const manufacturer = compMatch
      ? compMatch[1].replace(/&amp;/g, "&").trim()
      : "";

    if (brandName && genericName) {
      medicines.push({
        brandName,
        genericName,
        strength,
        dosageForm,
        manufacturer,
        sourceId,
        sourceUrl,
      });
    }
  }

  return medicines;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchMedexPage(page: number): Promise<ScrapedCard[]> {
  const url = `https://medex.com.bd/brands?page=${page}&ccd=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page ${page}: HTTP ${res.status}`);
  }

  const html = await res.text();
  return parseMedexHtml(html);
}

async function runLiveImport(startPage = 1, endPage = 20) {
  console.log(`=== LIVE MEDEX BANGLADESH MEDICINE CRAWLER & IMPORTER ===`);
  console.log(`Pages range: ${startPage} to ${endPage}`);

  const adminClient = createServerAdminClient();
  const repo = new SupabaseMedicineRepository(adminClient);

  const initialCount = await repo.getTotalMedicineCount();
  console.log(`Current Supabase medicines count: ${initialCount}`);

  let totalScraped = 0;
  const allDtos: CreateMedicineDTO[] = [];

  for (let p = startPage; p <= endPage; p++) {
    process.stdout.write(`Fetching page ${p}... `);
    try {
      const cards = await fetchMedexPage(p);
      process.stdout.write(`found ${cards.length} items.\n`);

      for (const c of cards) {
        allDtos.push({
          brandName: c.brandName,
          genericName: c.genericName,
          strength: c.strength,
          dosageForm: c.dosageForm,
          manufacturer: c.manufacturer,
          medicineType: "allopathic",
          source: "medex",
          sourceId: c.sourceId,
          sourceUrl: c.sourceUrl,
          status: "active",
        });
      }

      totalScraped += cards.length;
      // Polite delay between requests
      await sleep(1000);
    } catch (err: unknown) {
      console.error(`Error on page ${p}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nTotal scraped across ${endPage - startPage + 1} pages: ${totalScraped}`);

  if (allDtos.length > 0) {
    console.log(`Upserting ${allDtos.length} records into Supabase...`);
    const result = await repo.upsertMedicines(allDtos);
    console.log(`✓ Processed batch upsert: ${result.inserted} items`);
  }

  const newTotal = await repo.getTotalMedicineCount();
  console.log(`\n🎉 New total medicines in database: ${newTotal} (added ~${newTotal - initialCount})`);
}

// CLI arguments support: npx tsx scripts/import-medex-live.ts <startPage> <endPage>
const cliStart = process.argv[2] ? parseInt(process.argv[2], 10) : 21;
const cliEnd = process.argv[3] ? parseInt(process.argv[3], 10) : 40;

runLiveImport(cliStart, cliEnd)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error during import:", err);
    process.exit(1);
  });

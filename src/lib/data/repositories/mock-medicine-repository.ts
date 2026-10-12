import { IMedicineRepository } from "./medicine-repository.interface";
import {
  Medicine,
  MedicineSearchParams,
  CreateMedicineDTO,
  UpdateMedicineDTO,
} from "@/types/medicine";

export const INITIAL_MOCK_MEDICINES: Medicine[] = [
  {
    id: "med-001",
    brandName: "Napa",
    genericName: "Paracetamol",
    strength: "500 mg",
    dosageForm: "Tablet",
    manufacturer: "Beximco Pharmaceuticals Ltd.",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-101",
    sourceUrl: "https://medex.com.bd/brands/101/napa-500mg",
    status: "active",
    searchTerms: "napa paracetamol 500 mg tablet beximco pharmaceuticals ltd.",
    indications: "Fever, headache, toothache, earache, body ache, myalgia, dysmenorrhea.",
    dosageDescription: "Adult: 1-2 tablets every 4-6 hours (max 4g daily).",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-001-s",
    brandName: "Napa Syrup",
    genericName: "Paracetamol",
    strength: "120 mg/5 ml",
    dosageForm: "Syrup",
    manufacturer: "Beximco Pharmaceuticals Ltd.",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-101-s",
    sourceUrl: "https://medex.com.bd/brands/101/napa-syrup",
    status: "active",
    searchTerms: "napa syrup paracetamol 120 mg/5 ml syrup beximco pharmaceuticals ltd.",
    indications: "Fever, post-immunization pyrexia in infants and children.",
    dosageDescription: "Children: 10-15 mg/kg body weight per dose.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-002",
    brandName: "Napa Extra",
    genericName: "Paracetamol + Caffeine",
    strength: "500 mg + 65 mg",
    dosageForm: "Tablet",
    manufacturer: "Beximco Pharmaceuticals Ltd.",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-102",
    sourceUrl: "https://medex.com.bd/brands/102/napa-extra",
    status: "active",
    searchTerms: "napa extra paracetamol + caffeine 500 mg + 65 mg tablet beximco pharmaceuticals ltd.",
    indications: "Severe headache, migraine, toothache, musculoskeletal pain.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-003",
    brandName: "Ace",
    genericName: "Paracetamol",
    strength: "500 mg",
    dosageForm: "Tablet",
    manufacturer: "Square Pharmaceuticals PLC",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-103",
    sourceUrl: "https://medex.com.bd/brands/103/ace-500mg",
    status: "active",
    searchTerms: "ace paracetamol 500 mg tablet square pharmaceuticals plc",
    indications: "Fever, mild to moderate pain.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-004",
    brandName: "Seclo 20",
    genericName: "Omeprazole",
    strength: "20 mg",
    dosageForm: "Capsule",
    manufacturer: "Square Pharmaceuticals PLC",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-201",
    sourceUrl: "https://medex.com.bd/brands/201/seclo-20mg",
    status: "active",
    searchTerms: "seclo 20 omeprazole 20 mg capsule square pharmaceuticals plc",
    indications: "Gastroesophageal reflux disease (GERD), gastric and duodenal ulcer, Zollinger-Ellison syndrome.",
    dosageDescription: "20 mg once daily before breakfast.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-005",
    brandName: "Losectil 20",
    genericName: "Omeprazole",
    strength: "20 mg",
    dosageForm: "Capsule",
    manufacturer: "Eskayef Pharmaceuticals Ltd.",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-202",
    sourceUrl: "https://medex.com.bd/brands/202/losectil-20mg",
    status: "active",
    searchTerms: "losectil 20 omeprazole 20 mg capsule eskayef pharmaceuticals ltd.",
    indications: "Acid peptic disorders, reflux esophagitis.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-006",
    brandName: "Maxpro 20",
    genericName: "Esomeprazole",
    strength: "20 mg",
    dosageForm: "Tablet",
    manufacturer: "Renata PLC",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-203",
    sourceUrl: "https://medex.com.bd/brands/203/maxpro-20mg",
    status: "active",
    searchTerms: "maxpro 20 esomeprazole 20 mg tablet renata plc",
    indications: "GERD, erosive esophagitis, H. pylori eradication combination.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-007",
    brandName: "Zimax 500",
    genericName: "Azithromycin",
    strength: "500 mg",
    dosageForm: "Tablet",
    manufacturer: "Incepta Pharmaceuticals Ltd.",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-301",
    sourceUrl: "https://medex.com.bd/brands/301/zimax-500mg",
    status: "active",
    searchTerms: "zimax 500 azithromycin 500 mg tablet incepta pharmaceuticals ltd.",
    indications: "Community-acquired pneumonia, acute otitis media, pharyngitis, skin infections.",
    dosageDescription: "500 mg once daily for 3 days or 500 mg day 1 followed by 250 mg days 2-5.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-008",
    brandName: "Monas 10",
    genericName: "Montelukast",
    strength: "10 mg",
    dosageForm: "Tablet",
    manufacturer: "Acme Laboratories Ltd.",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-401",
    sourceUrl: "https://medex.com.bd/brands/401/monas-10mg",
    status: "active",
    searchTerms: "monas 10 montelukast 10 mg tablet acme laboratories ltd.",
    indications: "Prophylaxis and chronic treatment of bronchial asthma, allergic rhinitis.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-009",
    brandName: "Fexo 120",
    genericName: "Fexofenadine",
    strength: "120 mg",
    dosageForm: "Tablet",
    manufacturer: "Square Pharmaceuticals PLC",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-402",
    sourceUrl: "https://medex.com.bd/brands/402/fexo-120mg",
    status: "active",
    searchTerms: "fexo 120 fexofenadine 120 mg tablet square pharmaceuticals plc",
    indications: "Seasonal allergic rhinitis, chronic idiopathic urticaria.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "med-010",
    brandName: "Camlosart 5/50",
    genericName: "Amlodipine + Losartan Potassium",
    strength: "5 mg + 50 mg",
    dosageForm: "Tablet",
    manufacturer: "Square Pharmaceuticals PLC",
    medicineType: "allopathic",
    source: "medex",
    sourceId: "medex-501",
    sourceUrl: "https://medex.com.bd/brands/501/camlosart",
    status: "active",
    searchTerms: "camlosart 5/50 amlodipine + losartan potassium 5 mg + 50 mg tablet square pharmaceuticals plc",
    indications: "Mild to moderate essential hypertension.",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
];

export class MockMedicineRepository implements IMedicineRepository {
  private medicines: Medicine[];

  constructor(initialData: Medicine[] = INITIAL_MOCK_MEDICINES) {
    this.medicines = [...initialData];
  }

  public async searchMedicines(
    params: MedicineSearchParams = {}
  ): Promise<Medicine[]> {
    let result = [...this.medicines];

    if (params.query && params.query.trim() !== "") {
      const q = params.query.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.brandName.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
          (m.strength && m.strength.toLowerCase().includes(q)) ||
          m.searchTerms.includes(q)
      );
    }

    if (params.dosageForm && params.dosageForm.trim() !== "") {
      const df = params.dosageForm.toLowerCase();
      result = result.filter(
        (m) => m.dosageForm && m.dosageForm.toLowerCase().includes(df)
      );
    }

    if (params.manufacturer && params.manufacturer.trim() !== "") {
      const man = params.manufacturer.toLowerCase();
      result = result.filter(
        (m) => m.manufacturer && m.manufacturer.toLowerCase().includes(man)
      );
    }

    if (params.medicineType) {
      result = result.filter((m) => m.medicineType === params.medicineType);
    }

    result.sort((a, b) => a.brandName.localeCompare(b.brandName));

    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const offset = Math.max(params.offset || 0, 0);

    return result.slice(offset, offset + limit);
  }

  public async getMedicineById(id: string): Promise<Medicine | null> {
    const med = this.medicines.find((m) => m.id === id);
    return med ? { ...med } : null;
  }

  public async getMedicineBySourceId(sourceId: string): Promise<Medicine | null> {
    const med = this.medicines.find((m) => m.sourceId === sourceId);
    return med ? { ...med } : null;
  }

  public async createMedicine(data: CreateMedicineDTO): Promise<Medicine> {
    const now = new Date().toISOString();
    const searchTerms = [
      data.brandName,
      data.genericName,
      data.strength || "",
      data.dosageForm || "",
      data.manufacturer || "",
    ]
      .join(" ")
      .toLowerCase();

    const created: Medicine = {
      id: data.id || `med-mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      brandName: data.brandName,
      genericName: data.genericName,
      strength: data.strength,
      dosageForm: data.dosageForm,
      manufacturer: data.manufacturer,
      medicineType: data.medicineType || "allopathic",
      packageContainer: data.packageContainer,
      packSizeInfo: data.packSizeInfo,
      source: data.source || "medex",
      sourceId: data.sourceId,
      sourceUrl: data.sourceUrl,
      status: data.status || "active",
      searchTerms,
      indications: data.indications,
      dosageDescription: data.dosageDescription,
      sideEffects: data.sideEffects,
      contraindications: data.contraindications,
      createdAt: now,
      updatedAt: now,
    };

    this.medicines.push(created);
    return { ...created };
  }

  public async updateMedicine(
    id: string,
    data: UpdateMedicineDTO
  ): Promise<Medicine> {
    const idx = this.medicines.findIndex((m) => m.id === id);
    if (idx === -1) {
      throw new Error(`Medicine with id ${id} not found.`);
    }

    const current = this.medicines[idx];
    const updated: Medicine = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.medicines[idx] = updated;
    return { ...updated };
  }

  public async upsertMedicines(
    data: CreateMedicineDTO[]
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const item of data) {
      const existing = item.sourceId
        ? this.medicines.find((m) => m.sourceId === item.sourceId)
        : null;

      if (existing) {
        await this.updateMedicine(existing.id, item);
        updated++;
      } else {
        await this.createMedicine(item);
        inserted++;
      }
    }

    return { inserted, updated };
  }

  public async getDosageForms(): Promise<string[]> {
    const forms = new Set<string>();
    for (const m of this.medicines) {
      if (m.dosageForm) forms.add(m.dosageForm);
    }
    return Array.from(forms).sort();
  }

  public async getTotalMedicineCount(): Promise<number> {
    return this.medicines.length;
  }
}

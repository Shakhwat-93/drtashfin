/**
 * Authoritative Doctor Profile Configuration
 * Official Clinician Details for Dr. Mohammad Rubaiath Tashfin
 * and Isolated Demo Profile for Showcasing / Client Demos
 */

export interface DoctorProfileConfig {
  fullName: string;
  bengaliName: string;
  qualifications: string;
  primaryDesignation: string;
  fellowship: string;
  additionalTraining: string;
  workplace: string;
  doctorCode: string;
  email: string;
  monogram?: string;
  isDemo?: boolean;
}

export const OFFICIAL_DOCTOR_PROFILE: DoctorProfileConfig = {
  fullName: "Dr. Mohammad Rubaiath Tashfin",
  bengaliName: "ডাঃ মোহাম্মদ রুবাইয়াত তাসফিন",
  qualifications: "M.B.B.S., M.S. (Ortho-Surgery)",
  primaryDesignation: "Paediatric Orthopaedic Surgeon",
  fellowship: "Clinical Fellow — Paediatric Orthopaedic Surgery, India",
  additionalTraining: "Special Trained in Brachial Plexus Birth Palsy, India",
  workplace: "Rangpur Medical College & Hospital, Rangpur, Bangladesh",
  doctorCode: "dr-tashfin",
  email: "drtashfinahmed@gmail.com",
  monogram: "RT",
  isDemo: false,
};

export const DEMO_DOCTOR_PROFILE: DoctorProfileConfig = {
  fullName: "Prof. Dr. K. R. Rahman",
  bengaliName: "প্রফেসর ডাঃ কে. আর. রহমান",
  qualifications: "M.B.B.S., F.C.P.S., M.S. (Surgery)",
  primaryDesignation: "Senior Consultant Physician & Surgeon",
  fellowship: "Clinical Fellow — Advanced General & Laparoscopic Surgery",
  additionalTraining: "Fellow, International College of Surgeons (FICS)",
  workplace: "Metropolitan Specialized Hospital & Research Institute, Dhaka",
  doctorCode: "demo-clinician",
  email: "demo@drtashfin.online",
  monogram: "KR",
  isDemo: true,
};

export function getDoctorProfile(isDemo?: boolean): DoctorProfileConfig {
  return isDemo ? DEMO_DOCTOR_PROFILE : OFFICIAL_DOCTOR_PROFILE;
}

export function getDoctorMonogram(name?: string, fallback = "DR"): string {
  if (!name || !name.trim()) return fallback;
  const cleaned = name
    .replace(/^(prof\.|dr\.|md\.|prof|dr|md)\s+/i, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

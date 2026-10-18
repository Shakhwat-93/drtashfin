/**
 * Authoritative Doctor Profile Configuration
 * Official Clinician Details for Dr. Mohammad Rubaiath Tashfin
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
};

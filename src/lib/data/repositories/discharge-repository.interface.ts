import {
  PatientDischarge,
  CreateDischargeDTO,
  UpdateDischargeDTO,
  AmendDischargeDTO,
  DischargeFilterParams,
} from "@/types/discharge";

export interface IDischargeRepository {
  /**
   * Retrieves discharge records filtered by patient, consultation, or status.
   * Chronologically ordered with newest dischargeDate first.
   */
  getDischarges(params?: DischargeFilterParams): Promise<PatientDischarge[]>;

  /**
   * Retrieves a single discharge report by its unique UUID.
   */
  getDischargeById(id: string): Promise<PatientDischarge | null>;

  /**
   * Creates a new discharge record (draft or immediate finalized).
   * Optionally schedules integrated follow-up if requested.
   */
  createDischarge(dto: CreateDischargeDTO): Promise<PatientDischarge>;

  /**
   * Updates an existing draft discharge record.
   * Throws DataError if the record is already finalized.
   */
  updateDischarge(
    id: string,
    dto: UpdateDischargeDTO
  ): Promise<PatientDischarge>;

  /**
   * Explicitly finalizes a draft discharge report, locking it for audit integrity.
   */
  finalizeDischarge(
    id: string,
    finalizedBy?: string
  ): Promise<PatientDischarge>;

  /**
   * Appends an auditable amendment or clinical correction to a finalized discharge report.
   */
  amendDischarge(
    id: string,
    dto: AmendDischargeDTO
  ): Promise<PatientDischarge>;

  /**
   * Deletes a draft discharge record.
   * Locked finalized reports cannot be deleted.
   */
  deleteDraftDischarge(id: string): Promise<boolean>;
}

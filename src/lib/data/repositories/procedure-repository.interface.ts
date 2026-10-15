import {
  PatientProcedure,
  CreateProcedureDTO,
  UpdateProcedureDTO,
  ProcedureFilterParams,
} from "@/types/procedure";

export interface IProcedureRepository {
  /**
   * Retrieves procedure and operation records filtered by patient, consultation, or category.
   * Chronologically ordered with newest procedureDate first.
   */
  getProcedures(params?: ProcedureFilterParams): Promise<PatientProcedure[]>;

  /**
   * Retrieves a single procedure by its unique UUID identifier.
   */
  getProcedureById(id: string): Promise<PatientProcedure | null>;

  /**
   * Records a new surgical or medical procedure.
   */
  createProcedure(dto: CreateProcedureDTO): Promise<PatientProcedure>;

  /**
   * Updates an existing procedure reference.
   */
  updateProcedure(
    id: string,
    dto: UpdateProcedureDTO
  ): Promise<PatientProcedure>;

  /**
   * Deletes a procedure record from the clinical database.
   * NOTE: Does not touch or delete any Google Drive files.
   */
  deleteProcedure(id: string): Promise<boolean>;
}

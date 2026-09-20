/**
 * Domain & Data Layer Error Types.
 * Sanitizes technical exceptions so UI layers receive predictable, user-safe messages.
 */

export class DataError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "DATA_ERROR") {
    super(message);
    this.name = "DataError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PatientNotFoundError extends DataError {
  constructor(identifier: string) {
    super(`Patient with identifier "${identifier}" was not found.`, "PATIENT_NOT_FOUND");
    this.name = "PatientNotFoundError";
  }
}

export class DuplicatePatientIdError extends DataError {
  constructor(patientId: string) {
    super(`A patient with ID "${patientId}" already exists.`, "DUPLICATE_PATIENT_ID");
    this.name = "DuplicatePatientIdError";
  }
}

export class ValidationError extends DataError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class StorageError extends DataError {
  constructor(message: string = "An error occurred while interacting with local data storage.") {
    super(message, "STORAGE_ERROR");
    this.name = "StorageError";
  }
}

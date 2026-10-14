export const REGISTRATION_FIELDS = [
  "traineeCode",
  "fullName",
  "email",
  "jobRole",
  "restaurantBrand",
  "branchLocation",
  "cohortBatch",
  "hireDate",
] as const;

export type RegistrationField = (typeof REGISTRATION_FIELDS)[number];
export type RegistrationInput = Record<RegistrationField, string> & {
  planVersionId?: string;
};
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

// Shared validation for individual registration and a future CSV importer.
export function validateRegistration(input: RegistrationInput) {
  const values = Object.fromEntries(
    REGISTRATION_FIELDS.map((field) => [field, (input[field] || "").trim()])
  ) as RegistrationInput;
  if (input.planVersionId) {
    values.planVersionId = input.planVersionId.trim();
  }

  values.traineeCode = values.traineeCode.toUpperCase();
  values.email = values.email.toLowerCase();
  const errors: RegistrationErrors = {};

  for (const field of REGISTRATION_FIELDS) {
    if (!values[field]) {
      errors[field] = "This field is required.";
    } else if (values[field].length > (field === "email" ? 254 : 150)) {
      errors[field] = "This value is too long.";
    }
  }

  if (values.traineeCode && !/^[A-Z0-9][A-Z0-9-]{2,49}$/.test(values.traineeCode)) {
    errors.traineeCode = "Use 3–50 letters, numbers, or hyphens.";
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  const date = new Date(`${values.hireDate}T00:00:00.000Z`);
  if (
    values.hireDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(values.hireDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== values.hireDate)
  ) {
    errors.hireDate = "Enter a valid hire date.";
  }

  return { values, errors, valid: Object.keys(errors).length === 0 };
}

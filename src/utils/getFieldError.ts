export interface FormFieldError {
  type?: string;
  message?: string;
}

export const getFieldError = (error: unknown): FormFieldError | undefined => {
  if (!error || typeof error !== "object") return undefined;
  if ("message" in error) return error as FormFieldError;
  return undefined;
};

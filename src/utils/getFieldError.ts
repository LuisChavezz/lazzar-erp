import { FieldError } from "react-hook-form";

export const getFieldError = (error: unknown): FieldError | undefined => {
  if (!error || typeof error !== "object") return undefined;
  if ("message" in error) return error as FieldError;
  return undefined;
};

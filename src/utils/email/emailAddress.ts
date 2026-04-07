/**
 * Utilidades puras para normalizar y validar direcciones de correo.
 * Se usan desde el parser HTTP, el servicio de envio y la resolucion de destinatarios.
 */

/** Error tipado para distinguir problemas de entrada de errores internos. */
export class EmailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailValidationError";
  }
}

/** Narrowing helper para mapear errores de validacion en capas superiores. */
export const isEmailValidationError = (value: unknown): value is EmailValidationError =>
  value instanceof EmailValidationError;

/** Validacion simple de formato de email suficiente para reglas de entrada del flujo actual. */
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Elimina espacios y convierte valores vacios en `undefined`. */
export const normalizeEmail = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
};

export const getFirstValidEmail = (candidates: Array<string | null | undefined>) =>
  candidates
/**
 * Recorre candidatos en orden y devuelve el primer email valido.
 * Esta funcion encapsula la politica de fallback reutilizada por el servicio.
 */
    .map((candidate) => normalizeEmail(candidate))
    .find((candidate): candidate is string => typeof candidate === "string" && isValidEmail(candidate));

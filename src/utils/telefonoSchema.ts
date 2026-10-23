import { z } from "zod";

/** `max_length` de los teléfonos en el backend (cliente, dirección, cotización y pedido). */
export const TELEFONO_MAX_LENGTH = 20;

/** Mismo texto que el backend, para que el error no cambie según quién lo detecte. */
export const TELEFONO_MESSAGE = "El teléfono solo admite dígitos, espacios, +, guiones y paréntesis.";

// Regla del backend (EC-570): solo dígitos, `+`, espacios, guiones y paréntesis,
// con al menos un dígito ("---" o "()" no son teléfonos).
const TELEFONO_REGEX = /^(?=.*[0-9])[0-9+() -]+$/;

/**
 * Teléfono sin letras. Vacío pasa: si el campo es obligatorio lo dice cada
 * formulario (p. ej. `z.string().min(1, "Requerido").pipe(telefonoSchema)`).
 * El formato se revisa antes que la longitud, en el mismo orden que el backend.
 *
 * Compartido por clientes y sus direcciones de envío; los teléfonos de la
 * cotización siguen la misma regla.
 */
export const telefonoSchema = z
  .string()
  .refine((value) => value === "" || TELEFONO_REGEX.test(value), TELEFONO_MESSAGE)
  .max(TELEFONO_MAX_LENGTH, `El teléfono no puede exceder ${TELEFONO_MAX_LENGTH} caracteres`);

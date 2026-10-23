import type { InputHTMLAttributes } from "react";

/**
 * Código postal con la regla del backend (EC-570): exactamente 5 dígitos, como
 * TEXTO para que `01234` conserve su cero. El cliente extranjero (RFC genérico
 * `XEXX010101000`) queda exento: su CP no es mexicano.
 *
 * Compartido por el alta/edición de clientes y sus direcciones de envío; el CP
 * de envío de cotizaciones y pedidos sigue la misma regla.
 */

/** RFC genérico de extranjero, el único que exime el CP de los 5 dígitos. */
export const RFC_GENERICO_EXTRANJERO = "XEXX010101000";

export const CODIGO_POSTAL_LENGTH = 5;

/** `max_length` del campo en el modelo: el tope de un CP extranjero. */
export const CODIGO_POSTAL_EXTRANJERO_MAX_LENGTH = 10;

/** Mismo texto que el backend, para que el error no cambie según quién lo detecte. */
export const CODIGO_POSTAL_MESSAGE = "El código postal debe tener exactamente 5 dígitos.";

// `[0-9]` y no `\d`, igual que el backend.
const CODIGO_POSTAL_REGEX = /^[0-9]{5}$/;

export const isRfcExtranjero = (rfc: string | null | undefined): boolean =>
  (rfc ?? "").trim().toUpperCase() === RFC_GENERICO_EXTRANJERO;

/**
 * Error del CP para el RFC del cliente, o `null`. Vacío pasa: si el campo es
 * obligatorio lo dice el esquema de cada formulario.
 */
export const getCodigoPostalError = (
  codigoPostal: string,
  rfc: string | null | undefined
): string | null =>
  codigoPostal === "" || isRfcExtranjero(rfc) || CODIGO_POSTAL_REGEX.test(codigoPostal)
    ? null
    : CODIGO_POSTAL_MESSAGE;

/**
 * Atributos del input de CP: teclado numérico y 5 caracteres, salvo para el
 * extranjero, que captura texto libre hasta el tope del modelo.
 */
export const getCodigoPostalInputProps = (
  rfc: string | null | undefined
): Pick<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "maxLength"> =>
  isRfcExtranjero(rfc)
    ? { maxLength: CODIGO_POSTAL_EXTRANJERO_MAX_LENGTH }
    : { inputMode: "numeric", maxLength: CODIGO_POSTAL_LENGTH };

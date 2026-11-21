/**
 * Textos del botón "Verificar RFC" (`GET /terceros/clientes/verificar-rfc/`).
 * Una sola fuente para los formularios de clientes y de proveedores (EC-535).
 *
 * El backend dice exactamente qué revisó: formato y dígito verificador solo si
 * la empresa usa Facturama; si no, únicamente la longitud. Ninguno consulta el
 * estatus del RFC en el SAT, así que los mensajes no prometen más que eso.
 */

export const RFC_VERIFIED_MESSAGE = "Formato y dígito verificador correctos.";

export const RFC_ACCEPTED_WITHOUT_FORMAT_MESSAGE =
  "RFC aceptado. Tu empresa no valida formato ni dígito verificador.";

/** El backend rechazó el RFC (`valido: false`) sin decir por qué. */
export const RFC_INVALID_MESSAGE = "El RFC no es válido.";

/** La petición falló: reintentar puede funcionar. */
export const RFC_VERIFY_FAILED_MESSAGE = "No se pudo validar el RFC en este momento. Intenta nuevamente.";

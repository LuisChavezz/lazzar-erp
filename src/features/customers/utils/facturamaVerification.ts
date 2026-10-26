import type { Customer, FacturamaFaltante } from "../interfaces/customer.interface";

/**
 * Textos del estado de un cliente en Facturama (#659). Una sola fuente para el
 * listado, el detalle, el toast del guardado y el aviso del formulario, para
 * que la redacción no se separe.
 */

const FACTURAMA_FALTANTE_LABELS: Record<FacturamaFaltante, string> = {
  correo: "correo",
  rfc: "RFC",
  razon_social: "razón social",
  sat_regimen_fiscal: "régimen fiscal",
  sat_uso_cfdi: "uso de CFDI",
  codigo_postal: "código postal",
};

const FACTURAMA_SIN_VERIFICAR_LABEL = "Sin verificar en Facturama";
const FACTURAMA_PENDIENTE_LABEL = "Pendiente de subir a Facturama";
const FACTURAMA_PENDIENTE_HINT = "guarda el cliente de nuevo";
const FACTURAMA_ALTA_SIN_CONFIRMAR = "Cliente guardado, pero no se pudo confirmar su alta en Facturama.";

/**
 * "correo, código postal". Un campo que el backend agregue después y no esté en
 * el mapa se muestra con su nombre crudo en vez de perderse.
 */
const formatFacturamaFaltantes = (faltantes: readonly string[]): string =>
  faltantes
    .map((campo) => FACTURAMA_FALTANTE_LABELS[campo as FacturamaFaltante] ?? campo)
    .join(", ");

/**
 * Aviso del cliente (texto completo, para el tooltip y el chip), o `null` si no
 * hay nada que avisar (verificado, o su empresa no usa Facturama). Un `false`
 * sin faltantes es un cliente completo que nunca se subió: guardarlo de nuevo
 * lo sube.
 */
export const getFacturamaVerificationNotice = (
  customer: Pick<Customer, "facturama_verificado" | "facturama_faltantes">
): string | null => {
  if (customer.facturama_verificado !== false) {
    return null;
  }
  const faltantes = customer.facturama_faltantes ?? [];
  if (faltantes.length === 0) {
    return `${FACTURAMA_PENDIENTE_LABEL}; ${FACTURAMA_PENDIENTE_HINT}`;
  }
  return `${FACTURAMA_SIN_VERIFICAR_LABEL}. Falta: ${formatFacturamaFaltantes(faltantes)}`;
};

/** Aviso del formulario: guardar sí se puede, pero así no se sube a Facturama. */
export const getFacturamaFormWarning = (faltantes: readonly FacturamaFaltante[]): string =>
  `Sin ${formatFacturamaFaltantes(faltantes)}, el cliente se guarda pero no se sube a Facturama hasta que lo completes.`;

/**
 * Toast del guardado cuando el cliente que devolvió el backend no quedó en
 * Facturama; `null` si sí quedó o su empresa no lo usa (va el toast de éxito).
 */
export const getFacturamaSaveWarning = (
  customer: Pick<Customer, "facturama_verificado" | "facturama_faltantes">
): string | null => {
  if (customer.facturama_verificado !== false) {
    return null;
  }
  // Recién guardado y sin faltantes solo pasa si el alta en Facturama respondió
  // sin `Id`: puede que ya exista allá, y volver a guardar lo daría de alta otra
  // vez (duplicado). Por eso aquí no se pide guardar de nuevo.
  if ((customer.facturama_faltantes ?? []).length === 0) {
    return FACTURAMA_ALTA_SIN_CONFIRMAR;
  }
  return `Cliente guardado. ${getFacturamaVerificationNotice(customer)}`;
};

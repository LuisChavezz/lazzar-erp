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

export const FACTURAMA_SIN_VERIFICAR_LABEL = "Sin verificar en Facturama";
export const FACTURAMA_PENDIENTE_LABEL = "Pendiente de subir a Facturama";
const FACTURAMA_PENDIENTE_HINT = "guarda el cliente de nuevo";

/**
 * "correo, código postal". Un campo que el backend agregue después y no esté en
 * el mapa se muestra con su nombre crudo en vez de perderse.
 */
export const formatFacturamaFaltantes = (faltantes: readonly string[]): string =>
  faltantes
    .map((campo) => FACTURAMA_FALTANTE_LABELS[campo as FacturamaFaltante] ?? campo)
    .join(", ");

export interface FacturamaVerificationNotice {
  /** "Sin verificar en Facturama" o "Pendiente de subir a Facturama". */
  label: string;
  /** "Falta: correo" o "guarda el cliente de nuevo". */
  detail: string;
  /** Texto completo, para el tooltip y el chip. */
  text: string;
}

/**
 * Aviso del cliente, o `null` si no hay nada que avisar (verificado, o su
 * empresa no usa Facturama). Un `false` sin faltantes es un cliente completo
 * que nunca se subió: guardarlo de nuevo lo sube.
 */
export const getFacturamaVerificationNotice = (
  customer: Pick<Customer, "facturama_verificado" | "facturama_faltantes">
): FacturamaVerificationNotice | null => {
  if (customer.facturama_verificado !== false) {
    return null;
  }
  const faltantes = customer.facturama_faltantes ?? [];
  if (faltantes.length === 0) {
    return {
      label: FACTURAMA_PENDIENTE_LABEL,
      detail: FACTURAMA_PENDIENTE_HINT,
      text: `${FACTURAMA_PENDIENTE_LABEL}; ${FACTURAMA_PENDIENTE_HINT}`,
    };
  }
  const detail = `Falta: ${formatFacturamaFaltantes(faltantes)}`;
  return { label: FACTURAMA_SIN_VERIFICAR_LABEL, detail, text: `${FACTURAMA_SIN_VERIFICAR_LABEL}. ${detail}` };
};

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
  const faltantes = customer.facturama_faltantes ?? [];
  return faltantes.length === 0
    ? `Cliente guardado, pero no se subió a Facturama; ${FACTURAMA_PENDIENTE_HINT}`
    : `Cliente guardado, pero no se subió a Facturama: falta ${formatFacturamaFaltantes(faltantes)}`;
};

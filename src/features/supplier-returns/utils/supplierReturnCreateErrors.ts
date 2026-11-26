import { handleDrfWriteError, isForbiddenError } from "@/src/utils/drfWriteErrors";

/** Campos del `400` del alta que el diálogo pinta junto a su control. */
export const SUPPLIER_RETURN_FORM_FIELDS = ["motivo", "detalles", "calidad_inspeccion"] as const;
export type SupplierReturnFormField = (typeof SUPPLIER_RETURN_FORM_FIELDS)[number];

export const SUPPLIER_RETURN_CREATE_FALLBACK_ERROR = "No se pudo registrar la devolución. Intenta de nuevo.";

/** Qué hacer con un fallo de `POST /compras/devoluciones-proveedor/`. */
export interface SupplierReturnCreateErrorRoute {
  /** Mensajes del backend que van bajo su control, en el orden en que llegan. */
  fieldErrors: [SupplierReturnFormField, string][];
  /** Texto del toast, o `null` si todo quedó bajo los controles. */
  toast: string | null;
  /**
   * Releer lo pendiente: `detalles` (nada pendiente, cantidad mayor a la
   * pendiente) y `calidad_inspeccion` (anulada o no encontrada) dicen que otra
   * sesión ya devolvió o revirtió.
   */
  refreshPending: boolean;
}

/**
 * Reparte el error del alta (`handleDrfWriteError`). Un `400` de `motivo`,
 * `detalles` o `calidad_inspeccion` va bajo su control, sin toast; un mensaje
 * que no cabe en un campo (p. ej. `folio`: la serie no pudo generar el folio)
 * o el de objeto (`detail`) sale en toast. Un `403` (sin `C-WMS-RECEPCIONES`)
 * siempre sale en toast con su motivo, y red o 5xx con el respaldo.
 */
export const routeSupplierReturnCreateError = (error: unknown): SupplierReturnCreateErrorRoute => {
  const fieldErrors: [SupplierReturnFormField, string][] = [];
  const message = handleDrfWriteError(
    error,
    SUPPLIER_RETURN_CREATE_FALLBACK_ERROR,
    SUPPLIER_RETURN_FORM_FIELDS,
    (field, text) => fieldErrors.push([field, text]),
  );
  const showToast =
    fieldErrors.length === 0 || isForbiddenError(error) || message !== SUPPLIER_RETURN_CREATE_FALLBACK_ERROR;
  return {
    fieldErrors,
    toast: showToast ? message : null,
    refreshPending: fieldErrors.some(([field]) => field === "detalles" || field === "calidad_inspeccion"),
  };
};

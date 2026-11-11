/**
 * Modelo PURO de la plantilla base de documentos PDF (EC-855): tipos y reglas
 * que comparten `DocumentPdfLayout` (react-pdf), el botón "Descargar PDF" y el
 * nombre del archivo. No importa `@react-pdf/renderer`, así que se puede usar
 * desde componentes de pantalla y desde pruebas unitarias sin arrastrar la
 * librería.
 */

/**
 * Códigos fijos de tipo de documento. Son el prefijo del nombre del archivo
 * (`<TIPO>-<folio>.pdf`) y la llave con la que cada documento se identifica
 * ante la plantilla. Lista cerrada: un documento nuevo agrega aquí su código.
 */
export const DOCUMENT_PDF_TYPES = [
  "PED", // Pedido
  "OC", // Orden de compra
  "RC", // Recepción
  "OP", // Orden de producción
  "OB", // Orden de bordado
  "OR", // Orden de reflejante
  "OCM", // Orden de corte de manga
  "PCK", // Picking
  "PAK", // Packing
  "TR", // Transferencia entre almacenes
  "FAC", // Factura de cliente
  "FP", // Factura de proveedor
  "NC", // Nota de crédito
  "COB", // Cobro
  "PAG", // Pago a proveedor
  "POL", // Póliza
] as const;

export type DocumentPdfType = (typeof DOCUMENT_PDF_TYPES)[number];

/** Empresa del encabezado: la ACTIVA de la sesión (`useSessionCompanyDetails`). */
export interface PdfCompany {
  name: string;
  rfc: string | null;
}

/**
 * Identidad de un documento: lo que necesitan la plantilla (folio y marca de
 * cancelado), el nombre del archivo y el botón. Cada documento la arma desde
 * su detalle; el estado de cancelación sale SIEMPRE de ese detalle.
 */
export interface DocumentPdfDescriptor {
  type: DocumentPdfType;
  id: number;
  /** `null`/vacío mientras el backend no asigna folio: se usa el id. */
  folio: string | null | undefined;
  cancelled: boolean;
  /** Motivo de la cancelación, si el documento lo tiene. */
  cancellationReason?: string | null;
}

/** Leyenda fija de un documento cancelado: banner, pie y marca de agua. */
export const DOCUMENT_PDF_CANCELLED_MARK = "CANCELADO";

/** Folio a mostrar dentro del PDF: el folio, o `#id` si aún no tiene. */
export const documentPdfFolioLabel = (folio: string | null | undefined, id: number): string =>
  folio?.trim() || `#${id}`;

/** Motivo de cancelación a imprimir: solo si el documento está cancelado y lo trae. */
export const documentPdfCancellationReason = (
  descriptor: Pick<DocumentPdfDescriptor, "cancelled" | "cancellationReason">,
): string | null => (descriptor.cancelled ? descriptor.cancellationReason?.trim() || null : null);

// ── Columnas de la tabla de renglones ─────────────────────────────────────────

/**
 * Definición declarativa de una columna. `field` liga la columna a una clave
 * del renglón: la columna se OMITE por completo si ningún renglón trae esa
 * clave. Es la regla de los importes ocultos: el backend ELIMINA la clave (no
 * la manda en `null`) cuando el rol no puede verla, y el PDF no pinta una
 * columna de guiones ni recalcula nada. Sin `field`, la columna siempre se
 * muestra (descripción, cantidades…).
 */
export interface PdfColumnVisibility<Row> {
  field?: keyof Row & string;
}

/**
 * ¿La clave viene en ALGÚN renglón? `some` y no el primero: un renglón suelto
 * sin el dato no debe esconder la columna para todos los demás (mismo
 * criterio que `hasLineAmounts` en la pantalla de la OC). Una clave presente
 * con valor `null` cuenta como presente: es un dato vacío, no uno oculto.
 */
export const rowsHaveField = <Row>(rows: readonly Row[], field: keyof Row & string): boolean =>
  rows.some((row) => row != null && (row as Record<string, unknown>)[field] !== undefined);

/** Columnas que se pintan: las que no dependen de una clave o cuya clave viene. */
export const visiblePdfColumns = <Row, Column extends PdfColumnVisibility<Row>>(
  columns: readonly Column[],
  rows: readonly Row[],
): Column[] => columns.filter((column) => !column.field || rowsHaveField(rows, column.field));

// ── Bloque de totales ─────────────────────────────────────────────────────────

/**
 * Renglón del bloque de totales. `value` `undefined` = la clave no vino en la
 * respuesta (o el documento decidió no mostrarlo): el renglón se omite. El
 * valor ya llega formateado por el documento.
 */
export interface PdfTotalRow {
  label: string;
  value: string | undefined;
  /** Renglón final destacado (TOTAL). */
  emphasis?: boolean;
}

/** Renglones de totales que se pintan; si no queda ninguno, el bloque se omite. */
export const visiblePdfTotals = (rows: readonly PdfTotalRow[]): PdfTotalRow[] =>
  rows.filter((row) => row.value !== undefined);

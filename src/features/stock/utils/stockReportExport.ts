import { isAxiosError } from "axios";
import { forbiddenDetailMessage, isForbiddenError } from "@/src/utils/drfWriteErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { firstNonBlankRejectionMessage } from "@/src/utils/firstDrfMessage";
import type { StockMovementReportType } from "../interfaces/stock-movement-report.interface";

/**
 * Exportación de los reportes de existencias y de movimientos por periodo
 * (EC-819): el backend genera el archivo (`.../exportar/?formato=pdf|xlsx`,
 * EC-814) y el front solo lo descarga. Aquí viven las piezas puras: el formato,
 * el nombre del archivo y el mensaje de error.
 */

/** Valores de `?formato=` que acepta `exportar/` (cualquier otro es 400). */
export type StockReportExportFormat = "pdf" | "xlsx";

/** Nombre del formato para el usuario: el XLSX se presenta como "Excel". */
export const STOCK_REPORT_EXPORT_FORMAT_LABEL: Record<StockReportExportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel",
};

/**
 * Espejo del `slugify` de Django, que el backend aplica a cada pieza del nombre:
 * sin acentos, en minúsculas, solo letras, dígitos, `_` y `-`, y los espacios o
 * guiones seguidos como un solo `-`. Así "ALM-00" queda "alm-00" y "ENTRADA",
 * "entrada", igual que en el `Content-Disposition` del backend.
 */
export const slugifyFileNamePart = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[-\s]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

/**
 * Pieza del almacén en el nombre: su código, o `almacen-{id}` si no se conoce
 * (el mismo respaldo del backend); `todos` sin filtro de almacén.
 */
const almacenFileNamePart = (almacenId: number | null | undefined, codigo: string | null | undefined) => {
  if (almacenId === null || almacenId === undefined) return "todos";
  const slug = codigo ? slugifyFileNamePart(codigo) : "";
  return slug || `almacen-${almacenId}`;
};

const rangoFileNamePart = (fechaInicio: string, fechaFinal: string) => `${fechaInicio}-a-${fechaFinal}`;

/**
 * CORS no expone `Content-Disposition`, así que el navegador no puede leer el
 * nombre que manda el backend; este lo replica:
 * `reporte-existencias-{código}-{fecha_inicio}-a-{fecha_final}.{pdf|xlsx}`.
 */
export const stockReportFileName = ({
  almacenId,
  codigo,
  fechaInicio,
  fechaFinal,
  formato,
}: {
  almacenId: number;
  codigo: string | null | undefined;
  fechaInicio: string;
  fechaFinal: string;
  formato: StockReportExportFormat;
}): string =>
  `reporte-existencias-${almacenFileNamePart(almacenId, codigo)}-${rangoFileNamePart(fechaInicio, fechaFinal)}.${formato}`;

/**
 * Igual que `stockReportFileName`, con el nombre del backend para movimientos:
 * `reporte-movimientos-{tipo}-{código|todos}-{fecha_inicio}-a-{fecha_final}.{pdf|xlsx}`.
 */
export const stockMovementReportFileName = ({
  tipoMovimiento,
  almacenId,
  codigo,
  fechaInicio,
  fechaFinal,
  formato,
}: {
  tipoMovimiento: StockMovementReportType;
  almacenId: number | null | undefined;
  codigo: string | null | undefined;
  fechaInicio: string;
  fechaFinal: string;
  formato: StockReportExportFormat;
}): string =>
  `reporte-movimientos-${slugifyFileNamePart(tipoMovimiento)}-${almacenFileNamePart(almacenId, codigo)}-${rangoFileNamePart(fechaInicio, fechaFinal)}.${formato}`;

/**
 * Claves de los 400 de `exportar/`, en el orden en que se muestran: las
 * generales de DRF primero y luego cada parámetro que valida el backend
 * (`formato`, fechas, `almacen` en existencias, `tipo_movimiento` en
 * movimientos). Cualquier otra clave cae en `firstDrfFieldMessage`.
 */
const EXPORT_REJECTION_KEYS = [
  "detail",
  "non_field_errors",
  "formato",
  "fecha_inicio",
  "fecha_final",
  "almacen",
  "tipo_movimiento",
] as const;

/**
 * Mensaje del fallo de una exportación, con el cuerpo ya decodificado por
 * `readBlobErrorBody` (la petición pide `blob`, así que el JSON del error llega
 * como Blob). `extractErrorMessage` solo lee `{ error }` y estos errores son de
 * campo DRF (`{"almacen": "..."}`), así que sin esta función el usuario vería el
 * genérico en lugar del motivo del backend.
 */
export const stockReportExportErrorMessage = (
  error: unknown,
  formato: StockReportExportFormat,
): string => {
  const fallback = `No se pudo descargar el reporte en ${STOCK_REPORT_EXPORT_FORMAT_LABEL[formato]}.`;
  if (!isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  if (!error.response) {
    return "No se pudo conectar con el servidor para generar el reporte. Revisa tu conexión e intenta de nuevo.";
  }
  if (isForbiddenError(error)) {
    return forbiddenDetailMessage(error) ?? "No tienes permiso para descargar este reporte.";
  }
  const status = error.response.status;
  if (status >= 500) {
    return "El servidor no pudo generar el reporte. Intenta de nuevo en unos momentos.";
  }
  const data = error.response.data;
  // Sin cuerpo legible (p. ej. una página HTML que `readBlobErrorBody` descartó).
  if (data === undefined || data === null || data === "") return fallback;
  return (
    firstNonBlankRejectionMessage(data, EXPORT_REJECTION_KEYS) ??
    firstDrfFieldMessage(error) ??
    extractErrorMessage(error, fallback)
  );
};

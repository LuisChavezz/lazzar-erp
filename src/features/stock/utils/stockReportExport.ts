import { isAxiosError } from "axios";
import { forbiddenDetailMessage, isForbiddenError } from "@/src/utils/drfWriteErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
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
 * Nombre de respaldo cuando el navegador no puede leer el `Content-Disposition`
 * del backend (hoy CORS no lo expone, EC-824); replica el del backend:
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
 * Archivo que entrega `exportar/`: el cuerpo y, si el navegador la puede leer,
 * la cabecera `Content-Disposition` con el nombre que puso el backend.
 */
export interface ReportFile {
  blob: Blob;
  contentDisposition: string | undefined;
}

/** Último segmento de una ruta, sin `.`/`..` ni vacíos: el nombre nunca trae carpetas. */
const safeFileName = (name: string): string | undefined => {
  const base = name.split(/[\\/]/).pop()?.trim() ?? "";
  return base && base !== "." && base !== ".." ? base : undefined;
};

/**
 * Nombre del archivo según `Content-Disposition`: primero `filename*=` (RFC
 * 5987, `UTF-8''` con codificación por porcentaje) y luego `filename=` (con o
 * sin comillas). `undefined` si la cabecera falta (hoy CORS no la expone,
 * EC-824) o no trae un nombre legible: quien llama usa entonces su propio
 * nombre (`stockReportFileName` / `stockMovementReportFileName`).
 */
export const fileNameFromContentDisposition = (header: string | null | undefined): string | undefined => {
  if (!header) return undefined;
  const extended = /filename\*\s*=\s*([\w-]*)'[^']*'([^;]+)/i.exec(header);
  if (extended && /^utf-8$/i.test(extended[1])) {
    try {
      const name = safeFileName(decodeURIComponent(extended[2].trim().replace(/^"(.*)"$/, "$1")));
      if (name) return name;
    } catch {
      // Codificación por porcentaje inválida: se intenta con `filename=`.
    }
  }
  const plain = /(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;]*))/i.exec(header);
  if (!plain) return undefined;
  const raw = plain[1] !== undefined ? plain[1].replace(/\\(.)/g, "$1") : plain[2];
  return safeFileName(raw);
};

/**
 * Mensaje del fallo de una exportación, con el cuerpo ya decodificado por
 * `readBlobErrorBody` (la petición pide `blob`, así que el JSON del error llega
 * como Blob). Los rechazos del backend son errores de campo DRF
 * (`{"almacen": "..."}`), que `extractErrorMessage` no lee, así que primero va
 * `firstDrfFieldMessage`. El 403 sigue la regla del proyecto
 * (`forbiddenDetailMessage`: `detail`, nunca una llave de campo). En un 5xx se
 * muestra el motivo del cuerpo si lo trae (`detail`/`error`) y, si no, un
 * aviso del servidor; sin cuerpo legible (HTML que `readBlobErrorBody`
 * descartó), el respaldo de la operación.
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
  const statusFallback =
    error.response.status >= 500
      ? "El servidor no pudo generar el reporte. Intenta de nuevo en unos momentos."
      : fallback;
  return firstDrfFieldMessage(error) ?? extractErrorMessage(error, statusFallback);
};

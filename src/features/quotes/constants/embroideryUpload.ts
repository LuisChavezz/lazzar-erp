/**
 * embroideryUpload.ts
 * Constantes compartidas por el cliente (`EmbroideryImageSelector`) y el Route
 * Handler `/api/embroidery-images/upload`.
 *
 * Vive en `constants/` y NO importa `server-only` a propósito: ambos lados
 * deben leer exactamente los mismos valores. Si el límite de tamaño o el
 * allowlist de rutas se declararan por separado, se desincronizarían en cuanto
 * uno de los dos cambiara.
 */
import type { EmbroiderySpecBooleanField } from "../types";

/**
 * Límite de tamaño por archivo de arte.
 *
 * Vercel corta el cuerpo de una Function en 4.5 MB (413
 * `FUNCTION_PAYLOAD_TOO_LARGE`), y ese tope aplica al cuerpo multipart
 * COMPLETO —boundaries, cabeceras de cada parte y el campo `currentPath`
 * también cuentan—, no solo a los bytes del archivo. Se fija en 4 MB para
 * dejar ~0.5 MB de holgura al sobrecosto del multipart.
 */
export const MAX_EMBROIDERY_IMAGE_BYTES = 4 * 1024 * 1024;

/** Etiqueta legible del límite, para los mensajes de error de la UI. */
export const MAX_EMBROIDERY_IMAGE_LABEL = "4 MB";

/** Ruta destino cuando la especificación no tiene ningún servicio marcado. */
export const DEFAULT_UPLOAD_PATH = "Bordados/Pendientes de aprobar";

/** Rutas destino en el servidor de archivos, por tipo de servicio. */
export const SERVICE_UPLOAD_PATHS: Record<EmbroiderySpecBooleanField, string> = {
  nuevoPonchado: "Ponchados/Pendientes de aprobar",
  serigrafia: "Serigrafia/Pendientes de aprobar",
  sublimado: "Sublimado/Pendientes de aprobar",
  dtf: "DTF/Pendientes de aprobar",
  revelado: "Revelado/Pendientes de aprobar",
};

/**
 * Allowlist de rutas de subida.
 *
 * El Route Handler valida `currentPath` contra este conjunto en vez de
 * reenviar lo que mande el cliente: ese valor llega hasta multer como ruta de
 * ESCRITURA dentro del recurso compartido, así que un valor arbitrario
 * equivaldría a elegir dónde escribir en el servidor de archivos.
 */
export const ALLOWED_UPLOAD_PATHS: readonly string[] = [
  DEFAULT_UPLOAD_PATH,
  ...Object.values(SERVICE_UPLOAD_PATHS),
];

export const isAllowedUploadPath = (value: string): boolean =>
  ALLOWED_UPLOAD_PATHS.includes(value);

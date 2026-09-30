import { isAxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import { isWholeArrayDrfError } from "@/src/utils/isWholeArrayDrfError";
import type { CreateQualityInspectionPayload } from "../interfaces/quality-inspection.interface";

/** Campos de renglón a los que se puede atribuir un error del backend. */
export type QualityLineErrorField =
  | "cantidad_aprobada"
  | "cantidad_rechazada"
  | "resultado"
  | "motivo_rechazo"
  | "suma";

export interface ParsedQualityInspectionError {
  /** Mensaje para el toast, según `drfActionErrorMessage`. */
  message: string;
  /** Errores por renglón, indexados por `recepcion_detalle`. */
  lineErrors: Record<number, Partial<Record<QualityLineErrorField, string>>>;
  inspectorError?: string;
  /**
   * La recepción ya no se puede inspeccionar (otra persona la inspeccionó o
   * dejó de estar `EN_CALIDAD`): el formulario ya no tiene arreglo.
   */
  stale: boolean;
}

/** 404: la recepción (o el endpoint) ya no existe. */
const RECEPTION_GONE_MESSAGE = "La recepción ya no está disponible para inspeccionar.";

const LINE_FIELDS: QualityLineErrorField[] = [
  "cantidad_aprobada",
  "cantidad_rechazada",
  "resultado",
  "motivo_rechazo",
];

/**
 * Reparte un error del POST de Calidad. El backend responde con dos formas:
 *
 * - Serializer (`CalidadInspeccionInputSerializer`): `detalle` es una lista
 *   ALINEADA POR ÍNDICE con el `detalle` enviado (`{}` para renglones válidos),
 *   p. ej. `{"detalle": [{}, {"resultado": ["..."]}]}`.
 * - Reglas de negocio de la vista: `ValidationError({"detalle": "..."})`, que
 *   llega como un string plano sobre el envío entero. Los mensajes por
 *   renglón nombran su PK ("El renglón 120 inspecciona más de lo recibido."),
 *   así que se atribuyen a ese renglón cuando el PK está en el envío.
 */
export function parseQualityInspectionError(
  error: unknown,
  payload: CreateQualityInspectionPayload,
  fallback: string,
): ParsedQualityInspectionError {
  const parsed: ParsedQualityInspectionError = {
    // Convención del proyecto: 400/403 muestran el mensaje del backend tal
    // cual, 409 su `detail` y cualquier otra cosa (red, 5xx, cuerpo HTML de un
    // 500 de Django) cae al respaldo en español. Un 400 INDEXADO por renglón
    // no trae mensaje de primer nivel y cae al respaldo: sus mensajes se
    // pintan bajo cada renglón (`lineErrors`).
    message: drfActionErrorMessage(error, fallback, RECEPTION_GONE_MESSAGE),
    lineErrors: {},
    stale: false,
  };

  if (!isAxiosError(error) || error.response?.status !== 400) {
    return parsed;
  }
  const data = error.response.data;
  if (!data || typeof data !== "object") {
    return parsed;
  }
  const record = data as Record<string, unknown>;

  parsed.inspectorError = firstDrfMessage(record.inspector);

  // Las reglas de negocio llegan como string PLANO (`{"detalle": "..."}`, sin
  // lista): DRF solo envuelve en lista los strings de primer nivel, no los
  // valores de un dict. Se normaliza para tratarlas igual que una lista.
  const detalle = typeof record.detalle === "string" ? [record.detalle] : record.detalle;
  if (Array.isArray(detalle)) {
    if (isWholeArrayDrfError(detalle)) {
      const message = firstDrfMessage(detalle);
      const lineId = Number(/renglón (\d+)/i.exec(message ?? "")?.[1]);
      if (message && payload.detalle.some((line) => line.recepcion_detalle === lineId)) {
        parsed.lineErrors[lineId] = { suma: message };
      }
      if (message && /ya tiene renglones inspeccionados/i.test(message)) {
        parsed.stale = true;
      }
    } else {
      detalle.forEach((entry, index) => {
        const line = payload.detalle[index];
        if (!line || !entry || typeof entry !== "object") return;
        const entryRecord = entry as Record<string, unknown>;
        const lineErrors: Partial<Record<QualityLineErrorField, string>> = {};
        for (const field of LINE_FIELDS) {
          const message = firstDrfMessage(entryRecord[field]);
          if (message) lineErrors[field] = message;
        }
        // Un error de `recepcion_detalle` no tiene input propio: va al renglón.
        const idMessage = firstDrfMessage(entryRecord.recepcion_detalle);
        if (idMessage) lineErrors.suma = idMessage;
        if (Object.keys(lineErrors).length > 0) {
          parsed.lineErrors[line.recepcion_detalle] = lineErrors;
        }
      });
    }
  }

  // `estatus`: la recepción dejó de estar EN_CALIDAD entre la carga y el envío.
  if (firstDrfMessage(record.estatus) || firstDrfMessage(record.recepcion)) {
    parsed.stale = true;
  }

  return parsed;
}

import type { AxiosError } from "axios";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

/** Campos del encabezado del alta que se pintan bajo su propio control. */
export type SalidaMaquilaFormField = "centro_confeccion" | "fecha_compromiso" | "observaciones";

const FORM_FIELDS: readonly string[] = ["centro_confeccion", "fecha_compromiso", "observaciones"];

export const SALIDA_MAQUILA_FORBIDDEN_TEXT = "No tienes permiso de Producción para esta acción.";

/** Error del alta repartido donde se muestra. */
export interface SalidaMaquilaCreateError {
  /** Bajo el control de su campo (maquilero, compromiso, observaciones). */
  fields: Partial<Record<SalidaMaquilaFormField, string>>;
  /** En el renglón: clave = `detalleId` del renglón enviado. */
  lines: Record<number, string>;
  /** En el aviso del formulario: origen, tope, precio, folio, permisos… */
  messages: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Reparte un error del `POST /produccion/salidas-maquila/` en sus tres formas
 * (EC-911):
 * - por campo como lista (`{"centro_confeccion": ["…"]}`) o como string plano
 *   (`{"detalles": "La salida excede… quedan 5.00."}`, `{"precio_unitario": "…"}`);
 * - por renglón, anidado por índice (`{"detalles": {"0": {"or_detalle": [...]}}}`)
 *   o como lista alineada con `{}` en los válidos.
 *
 * `sentIds` son los renglones EN EL ORDEN en que viajaron en `detalles`: el
 * índice del error se traduce al renglón del borrador. Un índice que no cae en
 * ninguno sale en el aviso como "Renglón N".
 */
export const parseSalidaMaquilaCreateError = (
  error: unknown,
  sentIds: readonly number[],
  fallback: string,
): SalidaMaquilaCreateError => {
  const result: SalidaMaquilaCreateError = { fields: {}, lines: {}, messages: [] };
  const response = (error as AxiosError)?.response;
  if (response?.status === 403) {
    result.messages.push(SALIDA_MAQUILA_FORBIDDEN_TEXT);
    return result;
  }

  const data = response?.data;
  if (isRecord(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (key === "detalles" && (isRecord(value) || (Array.isArray(value) && value.some(isRecord)))) {
        const entries: [number, unknown][] = Array.isArray(value)
          ? value.map((entry, index) => [index, entry])
          : Object.entries(value).map(([index, entry]) => [Number(index), entry]);
        for (const [index, entry] of entries) {
          const message = firstNestedFieldMessage(entry);
          if (!message) continue;
          const id = Number.isInteger(index) ? sentIds[index] : undefined;
          if (id === undefined) result.messages.push(`Renglón ${index + 1}: ${message}`);
          else result.lines[id] = message;
        }
        continue;
      }
      const message = firstNestedFieldMessage(value);
      if (!message) continue;
      if (FORM_FIELDS.includes(key)) result.fields[key as SalidaMaquilaFormField] = message;
      else result.messages.push(message);
    }
  }

  const hasLines = Object.keys(result.lines).length > 0;
  if (hasLines && result.messages.length === 0) result.messages.push("Revisa los renglones marcados.");
  if (!hasLines && result.messages.length === 0 && Object.keys(result.fields).length === 0) {
    result.messages.push(extractErrorMessage(error, fallback));
  }
  return result;
};

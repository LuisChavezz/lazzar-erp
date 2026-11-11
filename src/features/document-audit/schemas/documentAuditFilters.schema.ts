import { z } from "zod";
import { isCompleteDateEntry } from "@/src/utils/formatDate";
import { ACCIONES_BITACORA, TIPOS_DOCUMENTO } from "../constants/documentAuditValues";

/**
 * Mayor id que el backend compara sin error: `sucursal_id` y `origen_id` son
 * `IntegerField` (32 bits). Por encima no hay nada que encontrar.
 */
export const MAX_AUDIT_ID = 2_147_483_647;

/** El `folio` de la bitácora tiene `max_length=60`: un texto más largo no coincide con nada. */
export const MAX_AUDIT_FOLIO_LENGTH = 60;

/**
 * Reglas de los filtros, en UN solo lugar: las usan este esquema y los códecs
 * de la URL (`documentAuditTable`). Si se separaran, la URL podría aceptar un
 * valor que el esquema rechaza y la lista dejaría de consultar sin avisar.
 */

/** ¿Id que el backend sabe comparar? Entero positivo de 32 bits. */
export const isValidAuditId = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0 && value <= MAX_AUDIT_ID;

/**
 * Folio tal como se manda al backend y se guarda en la URL: recortado, no
 * vacío y dentro del `max_length` del campo; `null` si no es filtrable.
 */
export const normalizeAuditFolio = (raw: string): string | null => {
  const folio = raw.trim();
  return folio !== "" && folio.length <= MAX_AUDIT_FOLIO_LENGTH ? folio : null;
};

const auditId = z.number().refine(isValidAuditId, { message: "Id no válido." });

const dateKey = z
  .string()
  .refine((value) => isCompleteDateEntry(value), { message: "Fecha no válida." });

/**
 * Filtros de `GET /auditoria/documentos/`, validados ANTES de llegar al backend.
 *
 * El endpoint no valida sus parámetros: un `usuario`, `sucursal` u `origen_id`
 * no numérico o una fecha imposible responden 500, y `tipo`/`accion` fuera de
 * su lista devuelven vacío sin avisar. Por eso cada valor se restringe a lo que
 * el backend sabe responder (ids enteros positivos, días reales
 * `YYYY-MM-DD`, `tipo` y `accion` de su enum) y un rango invertido se rechaza.
 * `ordering` y `search` no existen aquí a propósito: el `OrderingFilter` global
 * rompería el cursor y `search` no hace nada.
 */
export const documentAuditFiltersSchema = z
  .object({
    tipo: z.enum(TIPOS_DOCUMENTO).optional(),
    accion: z.enum(ACCIONES_BITACORA).optional(),
    usuario: auditId.optional(),
    sucursal: auditId.optional(),
    fecha_desde: dateKey.optional(),
    fecha_hasta: dateKey.optional(),
    // Vacío o solo espacios = sin filtro; cualquier otro texto debe ser un folio filtrable.
    folio: z
      .string()
      .refine((value) => value.trim() === "" || normalizeAuditFolio(value) !== null, {
        message: "Folio no válido.",
      })
      .transform((value) => normalizeAuditFolio(value) ?? undefined)
      .optional(),
  })
  .strict()
  .refine(
    (filters) =>
      filters.fecha_desde === undefined ||
      filters.fecha_hasta === undefined ||
      filters.fecha_desde <= filters.fecha_hasta,
    { message: "La fecha inicial no puede ser posterior a la final.", path: ["fecha_hasta"] },
  );

export type DocumentAuditFilters = z.input<typeof documentAuditFiltersSchema>;

/**
 * Filtros → parámetros del endpoint, sin los vacíos. `null` si algún valor no
 * pasa la validación: quien consulta no debe mandar nada en ese caso.
 */
export const toDocumentAuditParams = (
  filters: DocumentAuditFilters,
): Record<string, string> | null => {
  const parsed = documentAuditFiltersSchema.safeParse(filters);
  if (!parsed.success) return null;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined || value === "") continue;
    params[key] = String(value);
  }
  return params;
};

/** ¿`linea-tiempo` aceptaría este documento? Exige `tipo` y `documento_id` numérico (400 si no). */
export const isValidTimelineTarget = (tipo: string, documentoId: number): boolean =>
  tipo.trim() !== "" && Number.isSafeInteger(documentoId) && documentoId > 0;

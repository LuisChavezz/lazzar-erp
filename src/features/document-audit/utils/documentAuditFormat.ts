import { formatShortDate } from "@/src/utils/formatDate";
import { getMexicoTimeHHMM, MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";

/**
 * Cambio de estatus como texto: "anterior → nuevo". Las etiquetas del backend
 * no son uniformes entre tipos (ver `BitacoraDocumento`), así que se muestran
 * tal cual, sin badge. Una alta solo trae el nuevo; una baja o restauración
 * repite el mismo en ambos lados: en esos casos va un solo estatus. `null` si
 * el evento no trae ninguno (p. ej. un ajuste de inventario).
 */
export const formatStatusChange = (anterior: string, nuevo: string): string | null => {
  const before = anterior.trim();
  const after = nuevo.trim();
  if (!before && !after) return null;
  if (!before || before === after) return after || before;
  if (!after) return before;
  return `${before} → ${after}`;
};

/** Fecha y hora del evento en la zona de México: "11 nov 2026 · 08:03". */
export const formatAuditDateTime = (createdAt: string): string => {
  const date = formatShortDate(createdAt, { timeZone: MEXICO_TIME_ZONE });
  if (date === "—") return "—";
  return `${date} · ${getMexicoTimeHHMM(createdAt)}`;
};

/** Autor del evento; sin usuario de petición, el cambio lo hizo un proceso interno. */
export const formatAuditUser = (usuarioNombre: string | null): string =>
  usuarioNombre && usuarioNombre.trim() !== "" ? usuarioNombre : "Sistema";

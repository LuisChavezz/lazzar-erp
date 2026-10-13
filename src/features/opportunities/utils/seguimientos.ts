import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";

const timestamp = (value: string | null): number => {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
};

/** Del más nuevo al más viejo; con la misma fecha, el de id mayor primero. */
const byNewest = (a: OpportunitySeguimiento, b: OpportunitySeguimiento): number =>
  timestamp(b.created_at) - timestamp(a.created_at) || b.id - a.id;

/**
 * Orden del historial: primero lo PENDIENTE, por fecha de recordatorio (lo más
 * próximo —o más vencido— arriba, y al final lo que no tiene fecha); después lo
 * COMPLETADO, del más nuevo al más viejo.
 *
 * `fecha_recordatorio` es `YYYY-MM-DD`, así que se compara como texto.
 */
export const groupSeguimientos = (
  seguimientos: OpportunitySeguimiento[]
): { pendientes: OpportunitySeguimiento[]; completados: OpportunitySeguimiento[] } => {
  const pendientes = seguimientos
    .filter((seguimiento) => !seguimiento.completado)
    .sort((a, b) => {
      if (a.fecha_recordatorio && b.fecha_recordatorio) {
        return a.fecha_recordatorio.localeCompare(b.fecha_recordatorio) || byNewest(a, b);
      }
      if (a.fecha_recordatorio) return -1;
      if (b.fecha_recordatorio) return 1;
      return byNewest(a, b);
    });
  const completados = seguimientos.filter((seguimiento) => seguimiento.completado).sort(byNewest);
  return { pendientes, completados };
};

export type RecordatorioStatus = "vencido" | "hoy" | "futuro";

/**
 * Una fecha de recordatorio frente a HOY (`today`: el día del backend como
 * `YYYY-MM-DD`, ver `useBackendToday`). Solo tiene sentido para un seguimiento
 * pendiente.
 */
export const getRecordatorioStatus = (fecha: string, today: string): RecordatorioStatus => {
  if (fecha < today) return "vencido";
  return fecha === today ? "hoy" : "futuro";
};

/**
 * Inicio de un texto libre, en un solo renglón (los saltos de línea se
 * aplanan) y con elipsis si se recorta. Corta por CARACTERES completos
 * (`Array.from`), no por unidades UTF-16: un `slice` directo puede partir un
 * emoji a la mitad. Un texto ausente (`null`) cuenta como vacío.
 */
export const previewText = (text: string | null | undefined, maxLength: number): string => {
  const characters = Array.from((text ?? "").replace(/\s+/g, " ").trim());
  if (characters.length <= maxLength) return characters.join("");
  return `${characters.slice(0, maxLength).join("").trimEnd()}…`;
};

/**
 * Nombre que distingue a un seguimiento de los demás de su tipo: el tipo y el
 * inicio de su detalle ("Llamada: Quedó en confirmar tallas…"). Para los
 * nombres accesibles de sus controles.
 */
export const getSeguimientoName = (seguimiento: OpportunitySeguimiento): string => {
  const preview = previewText(seguimiento.detalle, 40);
  return preview ? `${seguimiento.tipo}: ${preview}` : seguimiento.tipo;
};

/**
 * Cómo nombrar al autor: "Tú" si es el usuario de la sesión; si no, su nombre
 * cuando el backend lo manda (`vendedor_nombre` es opcional y puede venir
 * vacío); si no hay nombre, `null` y el autor no se muestra. No se consulta el
 * catálogo de usuarios para resolverlo.
 */
export const getSeguimientoAuthorLabel = (
  seguimiento: OpportunitySeguimiento,
  currentUserId: string | undefined
): string | null => {
  if (isSeguimientoAuthor(seguimiento, currentUserId)) return "Tú";
  return seguimiento.vendedor_nombre?.trim() || null;
};

/** `session.user.id` es el id del usuario del backend, como texto. */
export const isSeguimientoAuthor = (
  seguimiento: OpportunitySeguimiento,
  currentUserId: string | undefined
): boolean =>
  seguimiento.vendedor !== null &&
  currentUserId !== undefined &&
  String(seguimiento.vendedor) === currentUserId;

import { parsePositiveId } from "./parsePositiveId";

/**
 * Qué hacer con `?<param>=<id>` en un listado que abre su detalle desde la URL
 * (`useUrlDetailParam`):
 *
 * - `none`: nada que hacer (sin parámetro, listado aún sin cargar, o el id
 *   está y el diálogo se abre o ya se cerró).
 * - `remove-invalid`: el parámetro no es un entero positivo; se quita sin
 *   aviso.
 * - `verify`: el id no está en un listado cargado ANTES de que apareciera el
 *   parámetro; puede ser un registro nuevo, así que se refetchea una vez.
 * - `not-found`: el id no está en un listado cargado DESPUÉS de que apareció
 *   el parámetro; se avisa y se quita.
 */
export type UrlDetailAction = "none" | "remove-invalid" | "verify" | "not-found";

export interface UrlDetailDecision {
  /** Id del parámetro, `null` si no hay o no es válido. */
  id: number | null;
  /** Id cuyo diálogo debe estar abierto por la URL, o `null`. */
  urlDetailId: number | null;
  action: UrlDetailAction;
}

export interface UrlDetailDecisionInput {
  /** Valor crudo del parámetro (`null` si no viene). */
  raw: string | null;
  /** Cuándo se vio ese valor por primera vez (ms). */
  seenAt: number;
  /** `true` cuando el listado ya llegó (vacío incluido). */
  hasLoaded: boolean;
  /** Cuándo llegaron los datos del listado (`dataUpdatedAt`, ms). */
  dataUpdatedAt: number;
  /** ¿El listado cargado contiene el id? */
  hasRow: (id: number) => boolean;
  /** Id cuyo diálogo ya se cerró y cuya URL aún no se actualiza. */
  dismissedId: number | null;
}

export const decideUrlDetail = ({
  raw,
  seenAt,
  hasLoaded,
  dataUpdatedAt,
  hasRow,
  dismissedId,
}: UrlDetailDecisionInput): UrlDetailDecision => {
  if (raw === null) return { id: null, urlDetailId: null, action: "none" };
  const id = parsePositiveId(raw);
  if (id === null) return { id: null, urlDetailId: null, action: "remove-invalid" };
  if (!hasLoaded) return { id, urlDetailId: null, action: "none" };
  if (hasRow(id)) {
    return { id, urlDetailId: id === dismissedId ? null : id, action: "none" };
  }
  // Un listado que llegó después del parámetro ya es la lectura fresca: otro
  // refetch traería lo mismo (p. ej. al entrar con la caché fría).
  return { id, urlDetailId: null, action: dataUpdatedAt >= seenAt ? "not-found" : "verify" };
};

/**
 * ¿El resultado de una verificación del id `checkedId` sigue aplicando? Solo
 * si la URL ACTUAL lleva ese mismo id: si entretanto se abrió otro, el
 * resultado viejo no avisa ni quita nada.
 */
export const isCurrentUrlDetailId = (checkedId: number, currentRaw: string | null): boolean =>
  parsePositiveId(currentRaw) === checkedId;

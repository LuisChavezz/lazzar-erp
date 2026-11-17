import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { isOportunidadCerrada } from "../constants/opportunityChoices";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";
import { COTIZACION_ESTATUS_AUTORIZADA } from "./cotizacionEstatus";

/**
 * Estado VIVO de la oportunidad de un diálogo de acción (dar de baja,
 * transferir, ligar y quitar cotizaciones) y el aviso de fila obsoleta que se
 * deriva de él. Puro: lo usa `useOpportunityStaleNotice` y lo prueban las
 * pruebas unitarias.
 *
 * Con el listado en modo servidor la vista no tiene TODAS las oportunidades:
 * una fila que sale de la página (otro orden, otra página, un filtro de estado
 * que ya no cumple) NO dejó de existir. Por eso la ausencia en el listado nunca
 * cuenta, y "ya no existe" solo lo dice una lectura del REGISTRO (404), como en
 * cotizaciones (EC-809): `GET /ventas/oportunidades/{id}/` (trae el `estado`)
 * para dar de baja, transferir y ligar, y el detalle `…/onboarding/` para
 * quitar, que además necesita las cotizaciones ligadas. El 404 cubre la baja
 * (lógica), la transferencia a otro vendedor (quien la perdió deja de verla) y
 * la pérdida de acceso.
 *
 * Solo cuenta lo que el detalle resolvió DESPUÉS de abrir el diálogo: se
 * compara contra los contadores de la consulta al abrirlo (`baseline`), no
 * contra lo que ya hubiera en caché.
 */

/** Contadores de la consulta que se relee (los de `QueryState`). */
export interface DetailQueryCounts {
  dataUpdateCount: number;
  errorUpdateCount: number;
}

export interface LiveOpportunitySources<T> {
  /** Contadores al abrir el diálogo. */
  baseline: DetailQueryCounts;
  /** Estado actual de la consulta, o `undefined` si no existe. */
  state?: DetailQueryCounts & {
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    data?: T;
    /** El último error es un 404 (definitivo). */
    isNotFound: boolean;
  };
}

/**
 * Lo que los avisos necesitan de la oportunidad leída: su `estado` y, solo
 * desde el detalle, sus cotizaciones ligadas (`undefined` = no se sabe).
 */
export interface LiveOpportunityView {
  estado: string;
  cotizaciones?: readonly Pick<OpportunityCotizacion, "id" | "estatus">[];
}

/**
 * `null` = la oportunidad ya no existe o ya no es visible; una vista = lo que
 * se leyó después de abrir; `undefined` = aún no hay nada nuevo (el diálogo
 * sigue con su foto).
 */
export type LiveOpportunity = LiveOpportunityView | null | undefined;

/**
 * Lo leído después de abrir: `null` si fue un 404, el dato si llegó uno nuevo,
 * `undefined` si no hay nada nuevo (o el error no fue un 404).
 */
export const resolveLiveOpportunity = <T>({
  baseline,
  state,
}: LiveOpportunitySources<T>): T | null | undefined => {
  if (!state) return undefined;
  const hasNewError = state.errorUpdateCount > baseline.errorUpdateCount;
  const hasNewData = state.dataUpdateCount > baseline.dataUpdateCount && state.data !== undefined;
  // Si llegaron las dos cosas, manda la más reciente.
  if (hasNewError && state.isNotFound && (!hasNewData || state.errorUpdatedAt > state.dataUpdatedAt)) {
    return null;
  }
  return hasNewData ? state.data : undefined;
};

/** La acción del diálogo: decide qué cambios la invalidan. */
export type OpportunityDialogAction =
  | { kind: "delete" | "transfer" }
  | { kind: "ligar" }
  | { kind: "quitar"; cotizacionId: number };

export const OPPORTUNITY_STALE_GONE_MESSAGE =
  "La oportunidad ya no está disponible: se dio de baja, se transfirió a otro vendedor o ya no tienes acceso a ella.";

interface OpportunityStaleNoticeArgs {
  action: OpportunityDialogAction;
  /** Oportunidad del diálogo; `null` = cerrado. */
  opportunityId: number | null;
  live: LiveOpportunity;
  /** La acción PROPIA está en vuelo: su resultado cierra el diálogo, sin aviso. */
  isBusy: boolean;
}

/**
 * ¿El diálogo ya no aplica? Sobre `getStaleRowDialogNotice`, con la
 * oportunidad VIVA del detalle (nunca la caché del listado):
 *
 * - Todas las acciones: la oportunidad ya no existe (404) → se cierra.
 * - "Ligar": además, si quedó CERRADA (Ganada o Perdida, el `estado`
 *   calculado), porque el backend ya no liga (400 `etapa`).
 * - "Quitar": además, si la cotización ya no está ligada o ya se autorizó
 *   (el backend no quita una autorizada).
 * - "Dar de baja" y "Transferir" no dependen del estado: el backend las
 *   permite también con la oportunidad cerrada.
 *
 * `null` = el diálogo sigue.
 */
export const getOpportunityStaleNotice = ({
  action,
  opportunityId,
  live,
  isBusy,
}: OpportunityStaleNoticeArgs): StaleRowDialogNotice | null => {
  const resource = `opportunity-${action.kind}`;
  if (live === null) {
    return getStaleRowDialogNotice({
      resource,
      targetId: opportunityId,
      target: null,
      isBusy,
      messages: { gone: OPPORTUNITY_STALE_GONE_MESSAGE },
    });
  }
  if (action.kind === "delete" || action.kind === "transfer") return null;

  if (action.kind === "ligar") {
    const estado = live?.estado;
    return getStaleRowDialogNotice({
      resource,
      targetId: opportunityId,
      target: { estado: estado !== undefined && isOportunidadCerrada(estado) ? estado : "abierta" },
      expectedEstado: "abierta",
      isBusy,
      messages: {
        gone: OPPORTUNITY_STALE_GONE_MESSAGE,
        estadoChanged: (cerrada) =>
          `La oportunidad ya está ${cerrada.toLowerCase()}: ya no se le pueden ligar cotizaciones.`,
      },
    });
  }

  if (action.kind !== "quitar") return null;
  const cotizacion = live?.cotizaciones?.find((item) => item.id === action.cotizacionId);
  // Sin lectura nueva, o una sin el arreglo de cotizaciones (el detalle se
  // defiende de ese caso con `?? []`), la cotización sigue como al abrir:
  // ligada. Solo un arreglo que ya no la trae dice que se quitó.
  let cotizacionEstado: "ligada" | "autorizada" | null = "ligada";
  if (live?.cotizaciones) {
    if (!cotizacion) cotizacionEstado = null;
    else if (cotizacion.estatus === COTIZACION_ESTATUS_AUTORIZADA) cotizacionEstado = "autorizada";
  }
  return getStaleRowDialogNotice({
    resource,
    targetId: action.cotizacionId,
    target: cotizacionEstado === null ? null : { estado: cotizacionEstado },
    expectedEstado: "ligada",
    isBusy,
    messages: {
      gone: `La cotización #${action.cotizacionId} ya no está ligada a esta oportunidad.`,
      estadoChanged: () =>
        `La cotización #${action.cotizacionId} ya está autorizada: no se puede quitar de la oportunidad.`,
    },
  });
};

/**
 * Lo que un render de `useOpportunityStaleNotice` sabe: si el diálogo está
 * abierto, si la acción propia está en vuelo (mutación o candado) y el estado
 * de la consulta que se relee.
 */
export interface StaleNoticeFrame<T> {
  open: boolean;
  isBusy: boolean;
  state?: LiveOpportunitySources<T>["state"];
}

/** Memoria entre renders: si estaba abierto y los contadores al ABRIR. */
export interface StaleNoticeMemory {
  wasOpen: boolean;
  baseline: DetailQueryCounts;
}

export const INITIAL_STALE_NOTICE_MEMORY: StaleNoticeMemory = {
  wasOpen: false,
  baseline: { dataUpdateCount: 0, errorUpdateCount: 0 },
};

/**
 * Siguiente memoria: en la transición cerrado → abierto se copian los
 * contadores de ESE momento (lo anterior a abrir no cuenta); el resto de los
 * renders la deja igual (misma referencia, para no volver a renderizar).
 */
export const nextStaleNoticeMemory = <T>(
  memory: StaleNoticeMemory,
  frame: StaleNoticeFrame<T>
): StaleNoticeMemory => {
  if (frame.open === memory.wasOpen) return memory;
  if (!frame.open) return { ...memory, wasOpen: false };
  return {
    wasOpen: true,
    baseline: frame.state
      ? {
          dataUpdateCount: frame.state.dataUpdateCount,
          errorUpdateCount: frame.state.errorUpdateCount,
        }
      : INITIAL_STALE_NOTICE_MEMORY.baseline,
  };
};

/**
 * El aviso de un render: nada con el diálogo cerrado ni con la acción propia
 * en vuelo (su resultado cierra el diálogo y avisa por su cuenta: si se
 * verificara antes de que el diálogo se cierre saldría un segundo aviso); si
 * no, lo leído después de abrir (`toView` lo traduce a lo que el aviso mira).
 */
export const getStaleNoticeForFrame = <T>({
  frame,
  memory,
  action,
  opportunityId,
  toView,
}: {
  frame: StaleNoticeFrame<T>;
  memory: StaleNoticeMemory;
  action: OpportunityDialogAction;
  opportunityId: number | null;
  toView: (data: T) => LiveOpportunityView;
}): StaleRowDialogNotice | null => {
  if (!frame.open || frame.isBusy || opportunityId === null) return null;
  const live = resolveLiveOpportunity({ baseline: memory.baseline, state: frame.state });
  return getOpportunityStaleNotice({
    action,
    opportunityId,
    live: live === null ? null : live === undefined ? undefined : toView(live),
    isBusy: frame.isBusy,
  });
};

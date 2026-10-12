"use client";

import { useState } from "react";
import {
  useMutation,
  useMutationState,
  useQueryClient,
  type MutationFilters,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { vincularSkuMuestra } from "../services/actions";
import type { VincularSkuMuestraResponse } from "../interfaces/pedido-sku-muestra.interface";
import { pedidoDetailQueryKey } from "./usePedidoDetail";

type LinkSampleSkuVariables = {
  pedidoId: number;
  cotizacionId: number | null;
  tallaId: number;
};

/** Tallas a vincular de UNA línea (`PedidoDetalle`) dentro de una corrida. */
export interface SampleSkuRunLine {
  lineaId: number;
  tallaIds: number[];
}

type LinkSampleSkusBulkVariables = {
  pedidoId: number;
  cotizacionId: number | null;
  /**
   * Líneas de la corrida, en el orden en que se recorren. Una sola para el
   * "Vincular todas" del diálogo de una línea; todas las que tienen tallas
   * listas para el del pedido completo.
   */
  lines: SampleSkuRunLine[];
};

/**
 * Llaves de las dos mutaciones. Distintas y SIN prefijo común a propósito: el
 * filtro por `mutationKey` casa por prefijo, y una llave compartida haría que
 * los "en vuelo" de una fila contaran también la corrida masiva.
 */
const linkSampleSkuMutationKey = ["pedido-sku-muestra-link"] as const;
const linkSampleSkusBulkMutationKey = ["pedido-sku-muestra-link-bulk"] as const;

/**
 * Un filtro por tipo de mutación, compartido por la lectura reactiva
 * (`useMutationState`) y la guarda síncrona (`queryClient.isMutating`), para que
 * "en curso" signifique lo mismo en las dos.
 */
const singleLinkFilters = (pedidoId: number, tallaId?: number): MutationFilters => ({
  mutationKey: linkSampleSkuMutationKey,
  status: "pending",
  predicate: (mutation) => {
    const variables = mutation.state.variables as LinkSampleSkuVariables | undefined;
    return (
      variables?.pedidoId === pedidoId && (tallaId === undefined || variables.tallaId === tallaId)
    );
  },
});

const bulkLinkFilters = (pedidoId: number): MutationFilters => ({
  mutationKey: linkSampleSkusBulkMutationKey,
  status: "pending",
  predicate: (mutation) =>
    (mutation.state.variables as LinkSampleSkusBulkVariables | undefined)?.pedidoId === pedidoId,
});

const NO_LINES: number[] = [];

const NOT_FOUND_ERROR = "El pedido no existe o no pertenece a tu empresa.";
const FALLBACK_ERROR = "No se pudo vincular el SKU.";

interface LinkError {
  message: string;
  /**
   * A quién afecta el rechazo. `"talla"`: solo a esa talla (la que se ve en
   * pantalla ya no es la real); una corrida masiva sigue con las demás.
   * `"order"`: a cualquier talla del pedido; la corrida se detiene porque el
   * resto fallaría por el mismo motivo.
   */
  scope: "talla" | "order";
}

/**
 * Clasifica un rechazo del endpoint. Mismo criterio de copy que
 * `useUpdatePedidoHeader`: no hay formulario donde marcar el error, así que
 * todo va al toast, y nunca se usa `extractErrorMessage` (ante un cuerpo
 * desconocido devolvería el "Request failed with status code…" de Axios).
 *
 * SOLO es de la talla un 400 con la clave `pedido_detalle_talla_id` (no es de
 * este pedido, o aún no tiene SKU de producción). Todo lo demás es del pedido:
 *
 * - `permiso`: HTTP 400 con el mensaje plano bajo la clave, no un 403. La regla
 *   real es del backend (`_require_mesa_control`): superuser, `is_admin_empresa`
 *   o un rol activo de la empresa del usuario cuya clave de departamento sea
 *   EXACTAMENTE `MESACONTROL` (un rol `MESACONTROLYVENTAS` se rechaza). La UI
 *   solo decide la visibilidad —`E-MESACONTROL-PEDIDOS` o rol "admin"—, así que
 *   quien vea la acción sin cumplir la regla recibe este 400.
 * - 404: `get_object` acota por empresa; pedido ajeno, inexistente o de baja.
 * - 401 / 403: sesión caducada o sin acceso.
 * - Sin respuesta (red caída, petición abortada) y 5xx.
 * - Cualquier otro cuerpo: `detail` / `error` si los trae.
 */
const describeLinkError = (error: unknown): LinkError => {
  const order = (message: string): LinkError => ({ message, scope: "order" });
  if (!(error instanceof AxiosError)) return order(FALLBACK_ERROR);

  const response = error.response;
  if (!response) return order("No hay conexión con el servidor.");

  const { status, data } = response;
  const permiso = firstRejectionMessage(data, ["permiso"]);
  if (permiso) return order(permiso);
  if (status === 400) {
    const talla = firstRejectionMessage(data, ["pedido_detalle_talla_id"]);
    if (talla) return { message: talla, scope: "talla" };
  }
  if (status === 404) return order(NOT_FOUND_ERROR);
  if (status === 401 || status === 403) {
    return order("Tu sesión expiró o no tienes acceso a este pedido.");
  }
  if (status >= 500) return order("El servidor no pudo procesar la solicitud.");
  return order(
    firstRejectionMessage(data, ["detail", "non_field_errors", "error"]) ?? FALLBACK_ERROR,
  );
};

/**
 * Relectura tras vincular. La cotización de origen se invalida SIEMPRE que
 * exista, sin afirmar nada: el backend intenta espejarle el SKU, a menudo no lo
 * logra y la respuesta no dice si ocurrió. `["quote", id]` cubre las dos fuentes
 * del detalle (`"cotizaciones"` y `"mesa-control"`).
 */
const refetchAfterLink = (
  queryClient: QueryClient,
  pedidoId: number,
  cotizacionId: number | null,
) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(pedidoId) }),
    ...(cotizacionId
      ? [queryClient.invalidateQueries({ queryKey: ["quote", cotizacionId] })]
      : []),
  ]);

/**
 * Lo que la última corrida de "Vincular todas" hizo en UNA línea: su avance
 * mientras corre y su resultado después. Una corrida del pedido completo deja
 * una entrada por cada línea que recorre. Vive en la página (no en el diálogo),
 * así que cerrar el diálogo o cambiar de hoja no la pierde.
 */
export interface SampleSkuBulkRun {
  /** Tallas de ESTA línea en la corrida. */
  total: number;
  /**
   * Talla en curso. `null` cuando la corrida no está en esta línea: aún no le
   * toca, ya pasó por ella, se está releyendo el pedido o ya terminó.
   */
  currentTallaId: number | null;
  /**
   * Tallas vinculadas en ESTA corrida (id de talla → `sku_muestra` devuelto).
   * Es la superposición sobre el detalle en caché (`withLinkedSampleSkus`) y se
   * vacía cuando la relectura final trae el dato del servidor.
   */
  linkedSkus: Record<number, string>;
  /**
   * Motivo del rechazo de cada talla que falló. Dura hasta la siguiente corrida
   * de la línea (o hasta que esa talla se vincula sola).
   */
  failures: Record<number, string>;
  /** Motivo por el que la corrida se detuvo antes de terminar, o `null`. */
  stopReason: string | null;
  finished: boolean;
}

/** Avance global de la corrida en curso (todas sus líneas). */
export interface SampleSkuRunProgress {
  /** Tallas de la corrida. */
  total: number;
  /** Tallas ya procesadas (vinculadas o rechazadas). */
  processed: number;
  /** Ya no quedan tallas por procesar: se está releyendo el pedido. */
  refreshing: boolean;
}

interface LinkSampleSkusBulkResult {
  linked: number;
  failed: number;
  stopReason: string | null;
}

const count = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

const asSentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

interface UseSampleSkuLinkingOptions {
  pedidoId: number;
  /** Cotización de origen del pedido (`PedidoDetail.cotizacion`), o `null`. */
  cotizacionId: number | null;
}

/**
 * Vinculación del SKU de producción a las tallas de muestra de un pedido, de
 * una en una (`linkOne`) o todas las pendientes de una línea en fila
 * (`linkAll`, que recibe una línea o varias: la corrida del diálogo y la del
 * pedido completo son la misma). Se instancia en la PÁGINA del detalle, no en el diálogo: el
 * diálogo se puede cerrar en cualquier momento y al reabrirlo ve la corrida tal
 * como va.
 *
 * Dos fuentes, cada una con lo suyo:
 *
 * - "En curso" sale de la `MutationCache` (`runningLineaIds`, `pendingTallaIds`):
 *   es lo que de verdad se está ejecutando, y se limpia solo al terminar. Las
 *   dos mutaciones siguen PENDIENTES hasta que termina la relectura del pedido,
 *   para que un control no se re-habilite mostrando el estado viejo.
 * - El avance y el resultado de cada corrida son estado de este hook
 *   (`bulkRuns`, por línea, y `runProgress`, el global de la que está en curso).
 *
 * La corrida masiva es UNA mutación que recorre las tallas en secuencia, línea
 * por línea, y solo
 * puede haber una por pedido a la vez. Su `mutationFn` nunca lanza: una talla
 * rechazada por un motivo propio se cuenta y se sigue; cualquier rechazo que
 * afectaría a todas las restantes (ver `describeLinkError`) la detiene. Relee e
 * informa una sola vez al final.
 */
export function useSampleSkuLinking({ pedidoId, cotizacionId }: UseSampleSkuLinkingOptions) {
  const queryClient = useQueryClient();
  const [bulkRuns, setBulkRuns] = useState<Record<number, SampleSkuBulkRun>>({});
  const [runProgress, setRunProgress] = useState<SampleSkuRunProgress | null>(null);

  const patchRun = (lineaId: number, patch: (run: SampleSkuBulkRun) => SampleSkuBulkRun) =>
    setBulkRuns((runs) => (lineaId in runs ? { ...runs, [lineaId]: patch(runs[lineaId]) } : runs));

  const { mutate: mutateOne } = useMutation<
    VincularSkuMuestraResponse,
    unknown,
    LinkSampleSkuVariables
  >({
    mutationKey: linkSampleSkuMutationKey,
    mutationFn: (variables) => vincularSkuMuestra(variables.pedidoId, variables.tallaId),
    onSuccess: async (data, variables) => {
      toast.success(`SKU ${data.sku_muestra} vinculado`);
      await refetchAfterLink(queryClient, variables.pedidoId, variables.cotizacionId);
    },
    onError: (error, variables) => {
      const { message, scope } = describeLinkError(error);
      toast.error(message);
      // La talla que se ve ya no es la real: se relee para corregir la fila.
      if (scope === "talla") {
        void queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(variables.pedidoId) });
      }
    },
  });

  const { mutate: mutateBulk } = useMutation<
    LinkSampleSkusBulkResult,
    unknown,
    LinkSampleSkusBulkVariables
  >({
    mutationKey: linkSampleSkusBulkMutationKey,
    // Sin conexión, el modo por defecto dejaría la corrida EN PAUSA (pendiente
    // sin ejecutarse) hasta que vuelva la red. Así la petición se intenta, falla
    // y la corrida se detiene con su motivo.
    networkMode: "always",
    onMutate: ({ lines }) => {
      setRunProgress({
        total: lines.reduce((sum, line) => sum + line.tallaIds.length, 0),
        processed: 0,
        refreshing: false,
      });
      setBulkRuns((runs) => ({
        ...runs,
        ...Object.fromEntries(
          lines.map(({ lineaId, tallaIds }): [number, SampleSkuBulkRun] => [
            lineaId,
            {
              total: tallaIds.length,
              currentTallaId: null,
              linkedSkus: {},
              failures: {},
              stopReason: null,
              finished: false,
            },
          ]),
        ),
      }));
    },
    mutationFn: async ({ pedidoId: runPedidoId, lines }) => {
      const result: LinkSampleSkusBulkResult = { linked: 0, failed: 0, stopReason: null };
      const tallaProcessed = () =>
        setRunProgress((progress) =>
          progress ? { ...progress, processed: progress.processed + 1 } : progress,
        );
      for (const [lineIndex, { lineaId, tallaIds }] of lines.entries()) {
        for (const tallaId of tallaIds) {
          patchRun(lineaId, (run) => ({ ...run, currentTallaId: tallaId }));
          try {
            const { sku_muestra } = await vincularSkuMuestra(runPedidoId, tallaId);
            result.linked += 1;
            patchRun(lineaId, (run) => ({
              ...run,
              linkedSkus: { ...run.linkedSkus, [tallaId]: sku_muestra },
            }));
          } catch (error) {
            const { message, scope } = describeLinkError(error);
            if (scope === "order") {
              result.stopReason = message;
              break;
            }
            result.failed += 1;
            patchRun(lineaId, (run) => ({
              ...run,
              failures: { ...run.failures, [tallaId]: message },
            }));
          }
          tallaProcessed();
        }
        patchRun(lineaId, (run) => ({ ...run, currentTallaId: null }));
        if (result.stopReason) {
          // El aviso de paro queda en esta línea y en las que ya no se alcanzaron.
          const stopReason = result.stopReason;
          for (const line of lines.slice(lineIndex)) {
            patchRun(line.lineaId, (run) => ({ ...run, stopReason }));
          }
          break;
        }
      }
      return result;
    },
    onSuccess: async (result, variables) => {
      const { lines } = variables;
      setRunProgress((progress) => (progress ? { ...progress, refreshing: true } : progress));
      // Una sola relectura, también si nada se vinculó: un rechazo suele
      // significar que lo que se ve en pantalla ya no es lo real.
      await refetchAfterLink(queryClient, variables.pedidoId, variables.cotizacionId);
      // La superposición se retira cuando el servidor ya trae los SKU. Si la
      // relectura falló, el detalle en caché sigue siendo el viejo y lo
      // vinculado en esta corrida es lo más cierto que hay: se conserva.
      const refetchFailed =
        queryClient.getQueryState(pedidoDetailQueryKey(variables.pedidoId))?.status === "error";
      for (const { lineaId } of lines) {
        patchRun(lineaId, (run) => ({
          ...run,
          finished: true,
          linkedSkus: refetchFailed ? run.linkedSkus : {},
        }));
      }

      const counts = [
        count(result.linked, "talla vinculada", "tallas vinculadas"),
        ...(result.failed > 0 ? [count(result.failed, "falló", "fallaron")] : []),
      ].join(", ");
      if (result.stopReason) {
        const total = lines.reduce((sum, line) => sum + line.tallaIds.length, 0);
        const left = total - result.linked - result.failed;
        toast.error(
          `${counts}. Se detuvo: ${asSentence(result.stopReason)} ${count(
            left,
            "talla quedó sin procesar",
            "tallas quedaron sin procesar",
          )}.`,
        );
      } else if (result.failed > 0) {
        toast.error(counts);
      } else {
        toast.success(counts);
      }
    },
    onSettled: () => setRunProgress(null),
  });

  const pendingTallaIds = useMutationState({
    filters: singleLinkFilters(pedidoId),
    select: (mutation) => (mutation.state.variables as LinkSampleSkuVariables).tallaId,
  });

  // Una corrida por pedido a la vez: a lo sumo un elemento, con sus líneas.
  const [runningLineaIds = NO_LINES] = useMutationState({
    filters: bulkLinkFilters(pedidoId),
    select: (mutation) =>
      (mutation.state.variables as LinkSampleSkusBulkVariables).lines.map((line) => line.lineaId),
  });

  // Los valores reactivos de arriba llegan un render tarde: las guardas contra
  // el doble disparo consultan la caché de forma síncrona (la mutación queda
  // `pending` en el mismo tick en que se dispara), con los MISMOS filtros.
  const isBulkInFlight = () => queryClient.isMutating(bulkLinkFilters(pedidoId)) > 0;
  const isSingleInFlight = (tallaId?: number) =>
    queryClient.isMutating(singleLinkFilters(pedidoId, tallaId)) > 0;

  const linkOne = (lineaId: number, tallaId: number) => {
    if (isBulkInFlight() || isSingleInFlight(tallaId)) return;
    // Lo que la última corrida dejó dicho de esta talla deja de ser vigente.
    patchRun(lineaId, (run) => {
      if (!(tallaId in run.failures) && !(tallaId in run.linkedSkus)) return run;
      const failures = { ...run.failures };
      const linkedSkus = { ...run.linkedSkus };
      delete failures[tallaId];
      delete linkedSkus[tallaId];
      return { ...run, failures, linkedSkus };
    });
    mutateOne({ pedidoId, cotizacionId, tallaId });
  };

  const linkAll = (lines: SampleSkuRunLine[]) => {
    const withTallas = lines.filter((line) => line.tallaIds.length > 0);
    if (withTallas.length === 0 || isBulkInFlight() || isSingleInFlight()) return;
    mutateBulk({ pedidoId, cotizacionId, lines: withTallas });
  };

  const linkedSkus: Record<number, string> = {};
  for (const run of Object.values(bulkRuns)) Object.assign(linkedSkus, run.linkedSkus);

  return {
    linkOne,
    linkAll,
    /** Tallas con una vinculación individual en curso. */
    pendingTallaIds,
    /** Líneas de la corrida masiva en curso; vacío si no hay ninguna. */
    runningLineaIds,
    /**
     * Avance global de la corrida en curso. Puede ser `null` CON corrida en
     * curso si la página se desmontó y se volvió a montar a media corrida (la
     * corrida sigue; su avance no). Lo mismo aplica a `bulkRuns`.
     */
    runProgress,
    /** Lo que la última corrida hizo en cada línea, por id de línea. */
    bulkRuns,
    /** Superposición de todas las corridas: id de talla → SKU recién vinculado. */
    linkedSkus,
  };
}

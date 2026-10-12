"use client";

import { useState } from "react";
import {
  useIsMutating,
  useMutation,
  useMutationState,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { vincularSkuMuestra } from "../services/actions";
import type { VincularSkuMuestraResponse } from "../interfaces/pedido-sku-muestra.interface";
import { pedidoDetailQueryKey } from "./usePedidoDetail";

/**
 * Llaves de las dos mutaciones. Distintas y SIN prefijo común a propósito: el
 * filtro por `mutationKey` casa por prefijo, y una llave compartida haría que
 * los "en vuelo" de una fila contaran también la corrida masiva.
 */
const linkSampleSkuMutationKey = ["pedido-sku-muestra-link"] as const;
const linkSampleSkusBulkMutationKey = ["pedido-sku-muestra-link-bulk"] as const;

const NOT_FOUND_ERROR = "El pedido no existe o no pertenece a tu empresa.";
const FALLBACK_ERROR = "No se pudo vincular el SKU";

interface LinkError {
  message: string;
  /** 400 `{ permiso }`: el usuario no es mesa de control. */
  isPermiso: boolean;
  /** 400 `{ pedido_detalle_talla_id }`: la talla en pantalla ya no es la real. */
  isStaleTalla: boolean;
}

/**
 * Mensaje de un rechazo del endpoint. Mismo criterio que `useUpdatePedidoHeader`:
 * no hay formulario donde marcar el error, así que todo va al toast, y nunca se
 * usa `extractErrorMessage` (ante un cuerpo desconocido devolvería el "Request
 * failed with status code…" de Axios).
 *
 * - `permiso`: HTTP 400 con el mensaje plano bajo la clave, no un 403. La regla
 *   real es del backend (`_require_mesa_control`): superuser, `is_admin_empresa`
 *   o un rol activo de la empresa del usuario cuya clave de departamento sea
 *   EXACTAMENTE `MESACONTROL` (un rol `MESACONTROLYVENTAS` se rechaza). La UI
 *   solo decide la visibilidad —`E-MESACONTROL-PEDIDOS` o rol "admin"—, así que
 *   quien vea la acción sin cumplir la regla recibe este 400.
 * - `pedido_detalle_talla_id`: la talla no es de este pedido o aún no tiene SKU
 *   de producción.
 * - `detail` / `error`: `APIException` de DRF y el `{ error }` de otras vistas.
 */
const describeLinkError = (error: unknown): LinkError => {
  const result: LinkError = { message: FALLBACK_ERROR, isPermiso: false, isStaleTalla: false };
  if (!(error instanceof AxiosError)) return result;

  const data = error.response?.data;
  const permiso = firstRejectionMessage(data, ["permiso"]);
  if (permiso) return { message: permiso, isPermiso: true, isStaleTalla: false };
  // `get_object` acota por empresa: un pedido ajeno o dado de baja responde 404.
  if (error.response?.status === 404) return { ...result, message: NOT_FOUND_ERROR };
  const talla = firstRejectionMessage(data, ["pedido_detalle_talla_id"]);
  if (talla) return { message: talla, isPermiso: false, isStaleTalla: true };
  return {
    ...result,
    message: firstRejectionMessage(data, ["detail", "non_field_errors", "error"]) ?? FALLBACK_ERROR,
  };
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

type LinkSampleSkuVariables = {
  pedidoId: number;
  cotizacionId: number | null;
  tallaId: number;
};

type LinkSampleSkusBulkVariables = {
  pedidoId: number;
  cotizacionId: number | null;
  tallaIds: number[];
};

interface LinkSampleSkusBulkResult {
  linked: number;
  /** Mensaje de rechazo por talla fallida (id de `PedidoDetalleTalla`). */
  failures: Record<number, string>;
  /** Mensaje del 400 `permiso` que detuvo la corrida, si lo hubo. */
  permisoMessage: string | null;
}

export interface SampleSkuBulkProgress {
  /** Tallas ya procesadas (vinculadas o fallidas). */
  done: number;
  total: number;
  /** Talla en curso; `null` mientras se relee el pedido al terminar. */
  currentTallaId: number | null;
}

const piezas = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

interface UseSampleSkuLinkingOptions {
  pedidoId: number;
  /** Cotización de origen del pedido (`PedidoDetail.cotizacion`), o `null`. */
  cotizacionId: number | null;
}

/**
 * Vinculación del SKU de producción a las tallas de una línea de muestra, de
 * una en una (`linkOne`) o todas las pendientes en fila (`linkAll`).
 *
 * "En curso" vive en la `MutationCache`, no en el componente: sobrevive a que el
 * diálogo se cierre (p. ej. al cambiar de hoja) y se limpia solo al terminar.
 * Las dos mutaciones siguen PENDIENTES hasta que termina la relectura del
 * pedido, para que el control no se re-habilite mostrando el estado viejo.
 *
 * La corrida masiva es UNA mutación que recorre las tallas en secuencia: su
 * `mutationFn` nunca lanza (cada fallo se cuenta), así que relee e informa una
 * sola vez al final aunque el diálogo ya no esté montado. Se detiene en el
 * primer 400 `permiso` —el resto fallaría igual— y sigue ante cualquier otro
 * error de una talla.
 */
export function useSampleSkuLinking({ pedidoId, cotizacionId }: UseSampleSkuLinkingOptions) {
  const queryClient = useQueryClient();
  const [bulkProgress, setBulkProgress] = useState<SampleSkuBulkProgress | null>(null);
  const [bulkFailures, setBulkFailures] = useState<Record<number, string>>({});

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
      const { message, isStaleTalla } = describeLinkError(error);
      toast.error(message);
      // La talla que se ve ya no es la real: se relee para corregir la fila.
      if (isStaleTalla) {
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
    mutationFn: async (variables) => {
      const result: LinkSampleSkusBulkResult = { linked: 0, failures: {}, permisoMessage: null };
      const total = variables.tallaIds.length;
      for (const [index, tallaId] of variables.tallaIds.entries()) {
        setBulkProgress({ done: index, total, currentTallaId: tallaId });
        try {
          await vincularSkuMuestra(variables.pedidoId, tallaId);
          result.linked += 1;
        } catch (error) {
          const { message, isPermiso } = describeLinkError(error);
          if (isPermiso) {
            result.permisoMessage = message;
            break;
          }
          result.failures[tallaId] = message;
        }
      }
      return result;
    },
    onSuccess: async (result, variables) => {
      const failed = Object.keys(result.failures).length;
      setBulkFailures(result.failures);
      setBulkProgress({
        done: result.linked + failed,
        total: variables.tallaIds.length,
        currentTallaId: null,
      });
      // Una sola relectura, también si todo falló: un rechazo por talla suele
      // significar que lo que se ve en pantalla ya no es lo real.
      await refetchAfterLink(queryClient, variables.pedidoId, variables.cotizacionId);

      const vinculadas = piezas(result.linked, "talla vinculada", "tallas vinculadas");
      if (result.permisoMessage) {
        toast.error(
          result.linked > 0 ? `${result.permisoMessage} (${vinculadas})` : result.permisoMessage,
        );
      } else if (failed > 0) {
        toast.error(`${vinculadas}, ${piezas(failed, "falló", "fallaron")}`);
      } else {
        toast.success(vinculadas);
      }
    },
    onSettled: () => setBulkProgress(null),
  });

  const pendingTallaIds = useMutationState({
    filters: {
      mutationKey: linkSampleSkuMutationKey,
      status: "pending",
      predicate: (mutation) =>
        (mutation.state.variables as LinkSampleSkuVariables | undefined)?.pedidoId === pedidoId,
    },
    select: (mutation) => (mutation.state.variables as LinkSampleSkuVariables).tallaId,
  });

  const isBulkOfThisPedido = (variables: unknown) =>
    (variables as LinkSampleSkusBulkVariables | undefined)?.pedidoId === pedidoId;

  const isBulkRunning =
    useIsMutating({
      mutationKey: linkSampleSkusBulkMutationKey,
      predicate: (mutation) => isBulkOfThisPedido(mutation.state.variables),
    }) > 0;

  // `isBulkRunning` e `isPending` llegan un render tarde: las guardas contra el
  // doble disparo consultan la caché de forma síncrona (la mutación queda
  // `pending` en el mismo tick en que se dispara).
  const bulkInFlight = () =>
    queryClient.isMutating({
      mutationKey: linkSampleSkusBulkMutationKey,
      predicate: (mutation) => isBulkOfThisPedido(mutation.state.variables),
    }) > 0;

  const singlesInFlight = (tallaId?: number) =>
    queryClient.isMutating({
      mutationKey: linkSampleSkuMutationKey,
      predicate: (mutation) => {
        const variables = mutation.state.variables as LinkSampleSkuVariables | undefined;
        return (
          variables?.pedidoId === pedidoId &&
          (tallaId === undefined || variables.tallaId === tallaId)
        );
      },
    }) > 0;

  const linkOne = (tallaId: number) => {
    if (bulkInFlight() || singlesInFlight(tallaId)) return;
    // El aviso de un fallo anterior de esta talla deja de ser vigente.
    setBulkFailures((current) => {
      if (!(tallaId in current)) return current;
      const rest = { ...current };
      delete rest[tallaId];
      return rest;
    });
    mutateOne({ pedidoId, cotizacionId, tallaId });
  };

  const linkAll = (tallaIds: number[]) => {
    if (tallaIds.length === 0 || bulkInFlight() || singlesInFlight()) return;
    setBulkFailures({});
    mutateBulk({ pedidoId, cotizacionId, tallaIds });
  };

  return {
    linkOne,
    linkAll,
    /** Tallas con una vinculación individual en curso. */
    pendingTallaIds,
    isBulkRunning,
    /**
     * Avance de la corrida masiva. Puede ser `null` con `isBulkRunning` en
     * `true` si el diálogo se cerró y se reabrió a media corrida: el avance es
     * estado de este hook, la corrida no.
     */
    bulkProgress,
    /** Motivo del rechazo de cada talla que falló en la última corrida masiva. */
    bulkFailures,
  };
}

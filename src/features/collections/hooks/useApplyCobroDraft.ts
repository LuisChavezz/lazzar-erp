import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { buildCobroPayloadFromCobro, updateCobro } from "../services/actions";
import { cobroLabel } from "../utils/collection.utils";
import { isActionOutcomeUnknown } from "../utils/actionOutcome";
import { COBRO_DRAFT_APPLY_WITHOUT_LINES_MESSAGE, COBRO_DRAFT_NOT_DRAFT_MESSAGE } from "../utils/cobroDraft";
import { invalidateCobroEffects } from "./cobroQueryCache";
import { parseCobroError } from "./useSaveCobro";
import { useCobroAction } from "./useCobroAction";

/** Candado de "Aplicar", ÚNICO por cobro. */
export const applyCobroDraftMutationKey = (cobroId: number) => ["apply-cobro-draft", cobroId] as const;

export const COBRO_APPLY_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el cobro pudo haberse aplicado. Actualiza los datos antes de volver a intentarlo.";

/**
 * Mensaje de un fallo al aplicar: los errores de negocio de `aplicar_cobro`
 * ("Importe 60 excede saldo 50 de la CxC 15.", factura cancelada, moneda) llegan
 * aquí, porque un borrador no se valida al guardarse. Un cliente o una cuenta
 * que se desactivó (el botón no lo sabe si el catálogo no cargó o cambió con la
 * confirmación abierta) sale con su aviso de inactivo (`parseCobroError`).
 */
const applyCobroErrorMessage = (error: unknown): string => {
  if (isActionOutcomeUnknown(error)) return COBRO_APPLY_UNCONFIRMED_MESSAGE;
  const parsed = parseCobroError(error, [], { isUpdate: true });
  return parsed.messages.length > 0 ? parsed.messages.join("\n") : parsed.formError ?? "No se pudo aplicar el cobro.";
};

/**
 * Aplica UN borrador desde su detalle (`PATCH /finanzas/cobros/{id}/` con el
 * cobro completo y `estatus: "Aplicado"`), sobre el esqueleto `useCobroAction`
 * (candado por cobro, retrieve FRESCO antes de la petición):
 *
 * - Con el cobro fresco, si ya no es `Borrador` o no tiene líneas, NO hace el
 *   PATCH y avisa el motivo.
 * - El payload sale del cobro fresco (`buildCobroPayloadFromCobro`), no de la
 *   fila: aplica exactamente lo que está guardado.
 * - Al terminar bien refresca todo lo que mueve un cobro aplicado. Ante un error
 *   se releen el listado de cobros y las CxC (saldos que cambiaron por debajo);
 *   sin respuesta, todo el conjunto.
 */
export const useApplyCobroDraft = (cobroId: number) => {
  const queryClient = useQueryClient();

  const { trigger: apply, isRunning: isApplying } = useCobroAction({
    mutationKey: applyCobroDraftMutationKey(cobroId),
    cobroId,
    run: async (current) => {
      if (current.estatus !== "Borrador") throw new PrecheckError(COBRO_DRAFT_NOT_DRAFT_MESSAGE);
      if (current.cobro_detalles.length === 0) throw new PrecheckError(COBRO_DRAFT_APPLY_WITHOUT_LINES_MESSAGE);
      return { cobro: await updateCobro(cobroId, buildCobroPayloadFromCobro(current, "Aplicado")) };
    },
    onSuccess: ({ cobro }) => {
      invalidateCobroEffects(queryClient);
      toast.success(`Cobro ${cobroLabel(cobro)} aplicado`);
    },
    errorMessage: applyCobroErrorMessage,
    onError: (outcomeUnknown) => {
      if (outcomeUnknown) {
        invalidateCobroEffects(queryClient);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["cobros"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
    },
  });

  return { apply, isApplying };
};

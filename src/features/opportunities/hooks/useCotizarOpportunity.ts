"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OPPORTUNITY_GONE_DETAIL_MESSAGE } from "./opportunityErrorMessages";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import type {
  OpportunityCotizarResponse,
  OpportunityCotizarVariables,
} from "../interfaces/opportunity-onboarding.interface";
import { cotizarOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/**
 * Rechazos de negocio del endpoint, que llegan por campo y no como
 * `{ error }`, en este orden: `{"etapa": "La oportunidad está ganada; para
 * vender más, abre otra."}` (o "perdida"), `{"vendedor": "La oportunidad no
 * tiene vendedor; transfiérela primero."}` y `{"sucursal": "Tu sucursal no
 * pertenece a la empresa de la oportunidad."}`. El detalle ya oculta "Cotizar"
 * en los dos primeros casos; llegan con datos viejos.
 */
const REJECTION_KEYS = ["etapa", "vendedor", "sucursal", "detail", "non_field_errors"] as const;

const cotizarErrorMessage = (error: unknown): string => {
  const fallback = "No se pudo crear la cotización. Intenta de nuevo.";
  if (isNotFoundError(error)) return OPPORTUNITY_GONE_DETAIL_MESSAGE;
  if (error instanceof AxiosError && error.response?.status === 400) {
    return firstRejectionMessage(error.response.data, REJECTION_KEYS) ?? fallback;
  }
  return fallback;
};

/**
 * "Cotizar": crea una cotización en Borrador ligada a la oportunidad.
 *
 * El endpoint NO es idempotente: la guarda contra el doble envío es de quien la
 * dispara (`useCreateAndOpenQuote`), que usa la `mutationKey` por oportunidad
 * como candado: por eso el hook recibe la oportunidad.
 *
 * Al terminar —bien o mal— se relee todo lo de oportunidades: con éxito el
 * `estado` pasa a `Cotizada` (listado y detalle); con un rechazo, el motivo
 * suele ser que la oportunidad cambió (se perdió, se dio de baja) y la pantalla
 * debe reflejarlo. Con éxito además cambia lo que cuenta cotizaciones: su
 * listado y el resumen del cliente.
 */
export const cotizarOpportunityMutationKey = (opportunityId: number) =>
  ["cotizar-opportunity", opportunityId] as const;

export const useCotizarOpportunity = (opportunityId: number) => {
  const queryClient = useQueryClient();

  return useMutation<OpportunityCotizarResponse, unknown, OpportunityCotizarVariables>({
    mutationKey: cotizarOpportunityMutationKey(opportunityId),
    mutationFn: ({ id }) => cotizarOpportunity(id),
    onSuccess: (_data, { cliente }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      // `useCustomer` usa el id de la URL (string) en su queryKey.
      if (cliente !== null) {
        queryClient.invalidateQueries({ queryKey: ["customer", String(cliente)] });
      }
      toast.success("Cotización creada en borrador");
    },
    onError: (error) => {
      console.error(error);
      toast.error(cotizarErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY });
    },
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { transferOpportunity } from "../services/actions";
import {
  OPPORTUNITY_GONE_MESSAGE,
  opportunityActionErrorMessage,
  transferVendedorRejection,
} from "./opportunityErrorMessages";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

export interface TransferOpportunityVariables {
  id: number;
  /** Id del usuario que pasa a ser el vendedor. */
  vendedor: number;
  /**
   * Aviso si la oportunidad ya no existe (404), según dónde se disparó. Va en
   * las variables —y no en un callback del componente— para que el aviso
   * salga aunque el diálogo ya se haya desmontado. No viaja al backend.
   */
  goneMessage?: string;
}

/**
 * "Transferir": pasa la oportunidad a otro vendedor
 * (`POST /ventas/oportunidades/{id}/transferir/`). Solo un administrador de
 * empresa; el backend responde 403 a cualquier otro.
 *
 * Los avisos —de éxito y de error— los da el hook, así que salen aunque el
 * diálogo se haya desmontado. Excepción: un 400 en `vendedor` (el destinatario
 * no vale) no es toast; el diálogo lo pinta bajo el selector.
 *
 * Al terminar —bien o mal— invalida el prefijo `["opportunities"]`: listado,
 * detalle, seguimientos, embudo y recientes reflejan al nuevo dueño. Devuelve
 * la promesa de esa invalidación, así que la mutación sigue "pending" (y el
 * diálogo bloqueado) hasta que la pantalla se releyó.
 */
export const useTransferOpportunity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, vendedor }: TransferOpportunityVariables) =>
      transferOpportunity(id, vendedor),
    onSuccess: (opportunity) => {
      toast.success(
        opportunity.vendedor_nombre
          ? `Oportunidad transferida a ${opportunity.vendedor_nombre}`
          : "Oportunidad transferida correctamente"
      );
    },
    onError: (error, { goneMessage }) => {
      console.error(error);
      if (transferVendedorRejection(error)) return;
      toast.error(
        isNotFoundError(error)
          ? (goneMessage ?? OPPORTUNITY_GONE_MESSAGE)
          : opportunityActionErrorMessage(error, "No se pudo transferir la oportunidad. Intenta de nuevo.")
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};

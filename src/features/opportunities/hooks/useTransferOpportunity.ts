import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { transferOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

export interface TransferOpportunityVariables {
  id: number;
  /** Id del usuario que pasa a ser el vendedor. */
  vendedor: number;
}

/**
 * "Transferir": pasa la oportunidad a otro vendedor
 * (`POST /ventas/oportunidades/{id}/transferir/`). Solo un administrador de
 * empresa; el backend responde 403 a cualquier otro.
 *
 * El aviso de ERROR lo da quien la dispara (`OpportunityTransferDialog`): un
 * 400 en `vendedor` se pinta bajo el selector y no como toast.
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
    onError: (error) => console.error(error),
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};

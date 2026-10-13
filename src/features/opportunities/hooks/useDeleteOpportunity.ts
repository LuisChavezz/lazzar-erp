import { hashKey, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteOpportunity } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { opportunityDetailKey } from "./useOpportunityDetail";
import { opportunitySeguimientosKey } from "./useOpportunitySeguimientos";
import { opportunityActionErrorMessage } from "./opportunityErrorMessages";

/** Consultas que son de UNA oportunidad y dejan de tener sentido al darla de baja. */
const ownQueryKeys = (id: number) => [opportunityDetailKey(id), opportunitySeguimientosKey(id)];

interface UseDeleteOpportunityOptions {
  /**
   * Se llama en cuanto el servidor confirma la baja, ANTES de tocar la caché.
   * Quien da de baja desde el detalle lo usa para dejar de consultarlo (ver
   * abajo) y salir al listado.
   */
  onDeleted?: (id: number) => void;
}

/**
 * Da de baja una oportunidad (baja lógica en el backend). Sin optimista: la
 * fila sale del listado cuando el refetch por prefijo responde, y con ella se
 * actualiza el total.
 *
 * Con la baja confirmada, lo de ESA oportunidad —su detalle y su historial de
 * seguimientos— se quita de la caché (si quedara, volver a abrir su URL
 * pintaría la ficha de una oportunidad dada de baja mientras llega la
 * relectura) y se excluye de la invalidación: pedirlo de nuevo solo traería un
 * 404 y retrasaría la salida al listado. Si la baja
 * FALLA sí se relee todo, detalle incluido: lo usual es que otra persona ya la
 * hubiera dado de baja, y la pantalla debe reflejarlo.
 */
export const useDeleteOpportunity = ({ onDeleted }: UseDeleteOpportunityOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOpportunity,
    onSuccess: (_data, id) => {
      // Primero quien llama: si el detalle sigue montado debe deshabilitar su
      // consulta antes de que se quite, o el observador la volvería a crear y
      // a pedir en el siguiente render.
      onDeleted?.(id);
      ownQueryKeys(id).forEach((queryKey) => queryClient.removeQueries({ queryKey, exact: true }));
      toast.success("Oportunidad dada de baja correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        opportunityActionErrorMessage(error, "No se pudo dar de baja la oportunidad. Intenta de nuevo.")
      );
    },
    // Se devuelve la promesa: la mutación sigue "pending" hasta que el listado
    // se refresca, y la confirmación se cierra con la fila ya fuera.
    onSettled: (_data, error, id) => {
      const deletedHashes = ownQueryKeys(id).map((queryKey) => hashKey(queryKey));
      return queryClient.invalidateQueries({
        queryKey: OPPORTUNITIES_KEY,
        predicate: error ? undefined : (query) => !deletedHashes.includes(query.queryHash),
      });
    },
  });
};

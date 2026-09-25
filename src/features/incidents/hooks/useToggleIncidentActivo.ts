import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { setIncidentActivo } from "../services/actions";
import type { Incident, ToggleIncidentActivoPayload } from "../interfaces/incident.interface";
import { INCIDENTS_KEY } from "./useIncidents";

/**
 * Clave de la mutación: el menú de cada fila lee de la `MutationCache` qué ids
 * tienen un cambio de estatus en vuelo (ver `usePendingIncidentToggleIds`).
 */
export const toggleIncidentActivoMutationKey = ["toggle-incident-activo"] as const;

/**
 * Da de baja o reactiva una incidencia (PATCH de `activo`). Ocupa el lugar del
 * hook de borrado: el DELETE del backend ES esta misma baja lógica, así que la
 * pantalla no lo expone. Mismo criterio que `useToggleCostCenterActivo`.
 *
 * La incidencia NO sale del listado al darse de baja: sigue visible con
 * estatus Inactivo, por eso el optimista MARCA la fila en vez de filtrarla.
 *
 * Error: el mensaje del backend solo con un 400 real (`firstDrfFieldMessage`);
 * cualquier otro fallo —500, 502, red caída— cae al texto en español por
 * dirección. NO se usa `extractErrorMessage`: devuelve el `message` crudo de
 * Axios ("Request failed with status code 500") antes de su respaldo.
 */
export const useToggleIncidentActivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: toggleIncidentActivoMutationKey,
    mutationFn: ({ id, activo }: ToggleIncidentActivoPayload) => setIncidentActivo(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });
      const previousIncidents = queryClient.getQueryData<Incident[]>(INCIDENTS_KEY);

      if (previousIncidents) {
        queryClient.setQueryData<Incident[]>(INCIDENTS_KEY, (old) =>
          old ? old.map((incident) => (incident.id === id ? { ...incident, activo } : incident)) : []
        );
      }

      return { previousIncidents };
    },
    onError: (error, variables, context) => {
      if (context?.previousIncidents) {
        queryClient.setQueryData(INCIDENTS_KEY, context.previousIncidents);
      }
      console.error(error);
      const fallback = variables.activo
        ? "No se pudo reactivar la incidencia. Intenta de nuevo."
        : "No se pudo dar de baja la incidencia. Intenta de nuevo.";
      const drfMessage =
        error instanceof AxiosError && error.response?.status === 400
          ? firstDrfFieldMessage(error)
          : undefined;
      toast.error(drfMessage ?? fallback);
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.activo
          ? "Incidencia reactivada correctamente"
          : "Incidencia dada de baja correctamente"
      );
    },
  });
};

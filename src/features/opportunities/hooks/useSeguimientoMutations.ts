import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import type {
  SeguimientoCompletadoVariables,
  SeguimientoUpdateVariables,
} from "../interfaces/seguimiento.interface";
import {
  completarSeguimiento,
  createSeguimiento,
  deleteSeguimiento,
  reabrirSeguimiento,
  updateSeguimiento,
} from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import {
  handleSeguimientoWriteError,
  SEGUIMIENTO_GONE_MESSAGE,
  seguimientoActionErrorMessage,
  type SetSeguimientoFieldError,
} from "./seguimientoErrorMessages";

/**
 * Mutaciones de los seguimientos de una oportunidad.
 *
 * Todas releen lo de oportunidades al terminar —bien o mal— invalidando el
 * prefijo `["opportunities"]`, del que cuelgan las DOS consultas de la ficha:
 * el historial (`useOpportunitySeguimientos`, de donde sale también el resumen
 * de pendientes) y el detalle de la oportunidad. Sin escritura optimista: en
 * qué grupo y en qué orden queda un seguimiento se decide con lo que responde
 * el backend.
 *
 * Devuelven la promesa de esa invalidación: la mutación sigue "pending" hasta
 * que ambas se releyeron, y quien la dispara (un diálogo, un renglón
 * bloqueado) se libera con la pantalla ya al día.
 *
 * Un 404 en editar, completar, reabrir o eliminar significa que otra persona
 * ya borró el seguimiento: se avisa con `SEGUIMIENTO_GONE_MESSAGE` y la
 * relectura lo quita del historial.
 */

/** Alta. No envía `vendedor`: el backend pone al usuario de la sesión. */
export const useCreateSeguimiento = (setFieldError?: SetSeguimientoFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSeguimiento,
    onSuccess: () => {
      toast.success("Seguimiento registrado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        handleSeguimientoWriteError(error, "Error al registrar el seguimiento", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};

/** PATCH con SOLO los campos que cambiaron (los arma el formulario). */
export const useUpdateSeguimiento = (setFieldError?: SetSeguimientoFieldError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: SeguimientoUpdateVariables) => updateSeguimiento(id, changes),
    onSuccess: () => {
      toast.success("Seguimiento actualizado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        isNotFoundError(error)
          ? SEGUIMIENTO_GONE_MESSAGE
          : handleSeguimientoWriteError(error, "Error al actualizar el seguimiento", setFieldError)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};

/** Borrado FÍSICO: no hay papelera ni forma de deshacerlo. */
export const useDeleteSeguimiento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSeguimiento,
    onSuccess: () => {
      toast.success("Seguimiento eliminado correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        seguimientoActionErrorMessage(error, "No se pudo eliminar el seguimiento. Intenta de nuevo.")
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};

const SEGUIMIENTO_COMPLETADO_MUTATION_KEY = ["opportunity-seguimiento-completado"] as const;

/**
 * Completa (`POST …/completar/`) o reabre (`PATCH {completado: false}`) un
 * seguimiento. Sin toast de éxito: el renglón cambia de grupo a la vista.
 */
export const useSetSeguimientoCompletado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: SEGUIMIENTO_COMPLETADO_MUTATION_KEY,
    mutationFn: ({ id, completado }: SeguimientoCompletadoVariables) =>
      completado ? completarSeguimiento(id) : reabrirSeguimiento(id),
    onError: (error, { completado }) => {
      console.error(error);
      toast.error(
        seguimientoActionErrorMessage(
          error,
          completado
            ? "No se pudo completar el seguimiento. Intenta de nuevo."
            : "No se pudo reabrir el seguimiento. Intenta de nuevo."
        )
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
  });
};

/**
 * Ids de los seguimientos con un completar/reabrir EN CURSO, para bloquear su
 * renglón. Sale de la caché de mutaciones y no de un `isPending`: así cada
 * renglón se bloquea por separado aunque se marquen varios seguidos, y sigue
 * bloqueado hasta que el historial se releyó.
 */
export const usePendingSeguimientoIds = (): number[] =>
  useMutationState({
    filters: { mutationKey: SEGUIMIENTO_COMPLETADO_MUTATION_KEY, status: "pending" },
    select: (mutation) => (mutation.state.variables as SeguimientoCompletadoVariables).id,
  });

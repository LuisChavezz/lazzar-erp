import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { patchCachedRowById } from "@/src/utils/cachedRows";
import { approveAbsence } from "../services/actions";
import type { Absence } from "../interfaces/absence.interface";
import { getAusenciaVocabulary, TIPO_FALTA_INJUSTIFICADA } from "../constants/absenceChoices";
import { ABSENCES_KEY } from "./useAbsences";
import { absenceActionErrorMessage } from "./absenceErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingAbsenceIds`). */
export const approveAbsenceMutationKey = ["approve-absence"] as const;

/**
 * Aprueba (o confirma una falta): `POST {id}/aprobar/`. Sin optimista, como
 * `useApproveVacation`: el servidor fija `autorizado_por`/`fecha_aprobacion` y
 * puede rechazar la transición (400). Se invalida también tras un error;
 * en el éxito, la fila se escribe antes con la respuesta (EC-927).
 *
 * Las variables llevan el `tipo` solo para el texto del aviso.
 */
export const useApproveAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: approveAbsenceMutationKey,
    mutationFn: ({ id }: { id: number; tipo: string }) => approveAbsence(id),
    onSuccess: async (absence, { tipo }) => {
      // La respuesta es el registro completo con la forma de la fila del
      // listado (`PermisoAusenciaSerializer`): se escribe antes del refetch,
      // que si falla dejaría la fila pendiente y con "Aprobar" disponible.
      await patchCachedRowById<Absence>(queryClient, ABSENCES_KEY, absence.id, () => absence);
      toast.success(
        tipo === TIPO_FALTA_INJUSTIFICADA
          ? "Falta injustificada confirmada"
          : "Registro de ausencia aprobado"
      );
    },
    onError: (error, { tipo }) => {
      console.error(error);
      // Verbo + sujeto del vocabulario ("No se pudo confirmar la falta
      // injustificada."), nunca el rótulo del botón.
      const { approveVerb, subject } = getAusenciaVocabulary(tipo);
      toast.error(
        absenceActionErrorMessage(error, `No se pudo ${approveVerb} ${subject}. Intenta de nuevo.`)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY }),
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { approveAbsence } from "../services/actions";
import { getAusenciaVocabulary, TIPO_FALTA_INJUSTIFICADA } from "../constants/absenceChoices";
import { ABSENCES_KEY } from "./useAbsences";
import { absenceActionErrorMessage } from "./absenceErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingAbsenceIds`). */
export const approveAbsenceMutationKey = ["approve-absence"] as const;

/**
 * Aprueba (o confirma una falta): `POST {id}/aprobar/`. Sin optimista, como
 * `useApproveVacation`: el servidor fija `autorizado_por`/`fecha_aprobacion` y
 * puede rechazar la transición (400). Se invalida también tras un error.
 *
 * Las variables llevan el `tipo` solo para el texto del aviso.
 */
export const useApproveAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: approveAbsenceMutationKey,
    mutationFn: ({ id }: { id: number; tipo: string }) => approveAbsence(id),
    onSuccess: (_data, { tipo }) => {
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

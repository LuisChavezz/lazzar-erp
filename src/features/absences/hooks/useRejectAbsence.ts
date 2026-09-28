import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { rejectAbsence } from "../services/actions";
import { AbsenceRejectVariables } from "../interfaces/absence.interface";
import { getAusenciaVocabulary, TIPO_FALTA_INJUSTIFICADA } from "../constants/absenceChoices";
import { ABSENCES_KEY } from "./useAbsences";
import { absenceActionErrorMessage } from "./absenceErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingAbsenceIds`). */
export const rejectAbsenceMutationKey = ["reject-absence"] as const;

interface UseRejectAbsenceOptions {
  /** Un error del backend sobre `motivo_rechazo` va al diálogo, no a un toast. */
  onReasonError?: (message: string) => void;
}

/**
 * Rechaza (o descarta una falta): `POST {id}/rechazar/` con
 * `{ motivo_rechazo }`, que SOLO viaja por aquí. Sin optimista.
 *
 * Las variables llevan el `tipo` solo para el texto del aviso.
 */
export const useRejectAbsence = ({ onReasonError }: UseRejectAbsenceOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectAbsenceMutationKey,
    mutationFn: ({ id, motivo_rechazo }: AbsenceRejectVariables & { tipo: string }) =>
      rejectAbsence(id, { motivo_rechazo }),
    onSuccess: (_data, { tipo }) => {
      toast.success(
        tipo === TIPO_FALTA_INJUSTIFICADA
          ? "Falta injustificada descartada"
          : "Registro de ausencia rechazado"
      );
    },
    onError: (error, { tipo }) => {
      console.error(error);
      const reasonMessage = drfFieldMessage(error, "motivo_rechazo");
      if (reasonMessage && onReasonError) {
        onReasonError(reasonMessage);
        return;
      }
      const { rejectVerb, subject } = getAusenciaVocabulary(tipo);
      toast.error(
        absenceActionErrorMessage(error, `No se pudo ${rejectVerb} ${subject}. Intenta de nuevo.`)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ABSENCES_KEY }),
  });
};

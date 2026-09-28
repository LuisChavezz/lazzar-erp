"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { MainDialog } from "@/src/components/MainDialog";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useRejectAbsence } from "../hooks/useRejectAbsence";
import { AbsenceRejectSchema } from "../schemas/absence.schema";
import { getAusenciaVocabulary, getTipoAusenciaLabel, TIPO_FALTA_INJUSTIFICADA } from "../constants/absenceChoices";
import { formatAbsenceRange, type AbsenceRow } from "./AbsenceColumns";

interface AbsenceRejectDialogProps {
  absence: AbsenceRow;
  onClose: () => void;
}

/**
 * Diálogo de RECHAZO (o DESCARTE de una falta, D2): `POST {id}/rechazar/` con
 * motivo obligatorio. Mismo esqueleto que `VacationRejectDialog`: se monta en
 * `AbsenceList` (no en la celda) con `key` por registro, y cierra ante un 400
 * (ya no pendiente) o un 404 (ya no existe).
 */
export function AbsenceRejectDialog({ absence, onClose }: AbsenceRejectDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState<string | null>(null);
  const { mutate, isPending } = useRejectAbsence({ onReasonError: setMotivoError });
  const submittingRef = useRef(false);

  const isFalta = absence.tipo === TIPO_FALTA_INJUSTIFICADA;
  const { rejectAction, rejectVerb, approveVerb, subject } = getAusenciaVocabulary(absence.tipo);

  const handleOpenChange = (next: boolean) => {
    if (!next && !isPending) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const parsed = AbsenceRejectSchema.safeParse({ motivo_rechazo: motivo });
    if (!parsed.success) {
      setMotivoError(parsed.error.issues[0]?.message ?? "Motivo inválido");
      return;
    }

    submittingRef.current = true;
    mutate(
      { id: absence.id, motivo_rechazo: parsed.data.motivo_rechazo, tipo: absence.tipo },
      {
        onSettled: () => {
          submittingRef.current = false;
        },
        onSuccess: onClose,
        onError: (error) => {
          const status = error instanceof AxiosError ? error.response?.status : undefined;
          if (status === 400 || status === 404) onClose();
        },
      }
    );
  };

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="480px"
      showCloseButton={false}
      title={isFalta ? "Descartar Falta Injustificada" : `Rechazar ${getTipoAusenciaLabel(absence.tipo) ?? "Registro"}`}
      description={`Se va a ${rejectVerb} ${subject} de ${absence.empleado_nombre} (${formatAbsenceRange(
        absence
      )}). Después ya no podrá editarse, ${approveVerb}se ni eliminarse.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <FormTextarea
          label={isFalta ? "Motivo del descarte" : "Motivo de rechazo"}
          name="motivo_rechazo"
          rows={3}
          placeholder={isFalta ? "Explica por qué se descarta la falta" : "Explica por qué se rechaza"}
          value={motivo}
          disabled={isPending}
          error={motivoError ? { message: motivoError } : undefined}
          onChange={(event) => {
            setMotivo(event.target.value);
            if (motivoError) setMotivoError(null);
          }}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isFalta ? "Descartando…" : "Rechazando…"}
            className="bg-red-600! hover:bg-red-700! focus:ring-red-500!"
          >
            {rejectAction}
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}

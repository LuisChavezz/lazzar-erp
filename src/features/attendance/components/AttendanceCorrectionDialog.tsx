"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { formatLocalDate } from "@/src/utils/formatDate";
import type { AttendanceCorrectionField } from "../schemas/attendance.schema";
import { useAttendanceCorrectionForm } from "../hooks/useAttendanceCorrectionForm";
import type { AttendanceRow } from "../utils/attendanceRows";
import { openPicker } from "../utils/dateInputs";

interface AttendanceCorrectionDialogProps {
  record: AttendanceRow;
  onClose: () => void;
  /** La corrección falló y el diálogo sigue abierto (ver `markCorrectionFailed`). */
  onFailed: () => void;
}

/**
 * "Corregir" un registro (`E-RH`): horas de entrada y salida sobre la `fecha`
 * del registro, y observaciones. La lógica (solo campos cambiados, nunca
 * `estado`, errores del servidor por campo) vive en
 * `useAttendanceCorrectionForm`. El padre lo monta con `key` por registro.
 */
export function AttendanceCorrectionDialog({
  record,
  onClose,
  onFailed,
}: AttendanceCorrectionDialogProps) {
  const {
    form,
    isPending,
    formMessage,
    getError,
    clearFieldErrors,
    revalidateTimes,
    validateField,
    handleFormSubmit,
  } = useAttendanceCorrectionForm({ record, onClose, onFailed });

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && !isPending) onClose();
  };

  /** Cambio de una hora: limpia sus errores y reevalúa la regla cruzada. */
  const changeTime = (field: Exclude<AttendanceCorrectionField, "observaciones">, value: string) => {
    clearFieldErrors(field);
    revalidateTimes({ ...form.state.values, [field]: value });
  };

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="520px"
      showCloseButton={false}
      title="Corregir Registro de Asistencia"
      description={`${record.empleado_nombre} · ${formatLocalDate(
        record.fecha
      )}. Las horas son de México y corresponden a ese día. El estado lo vuelve a calcular el sistema, salvo que el registro esté justificado.`}
    >
      <form onSubmit={handleFormSubmit} className="space-y-4 py-1">
        <fieldset disabled={isPending} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["hora_entrada", "hora_salida"] as const).map((name) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <FormInput
                    label={name === "hora_entrada" ? "Hora de entrada" : "Hora de salida"}
                    type="time"
                    name={field.name}
                    className="dark:scheme-dark cursor-pointer"
                    onClick={openPicker}
                    value={field.state.value}
                    error={getError(name)}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      changeTime(name, event.target.value);
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField(name, form.state.values);
                    }}
                  />
                )}
              </form.Field>
            ))}
          </div>
          <p className="-mt-2 ml-1 text-[11px] text-slate-400">
            Deja ambas horas vacías para registrar el día como falta. La salida requiere entrada.
          </p>
          <form.Field name="observaciones">
            {(field) => (
              <FormTextarea
                label="Observaciones"
                name={field.name}
                rows={3}
                placeholder="Notas sobre el registro (opcional)"
                value={field.state.value}
                error={getError("observaciones")}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldErrors("observaciones");
                }}
                onBlur={field.handleBlur}
              />
            )}
          </form.Field>
        </fieldset>
        {formMessage && (
          <p className="ml-1 text-xs font-medium text-amber-600 dark:text-amber-400">{formMessage}</p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando…">
            Guardar corrección
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}

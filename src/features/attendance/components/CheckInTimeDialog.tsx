"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { formatLocalDate } from "@/src/utils/formatDate";
import { useCheckInTimeForm, type CheckInKind } from "../hooks/useCheckInTimeForm";
import type { RollCallRow } from "../utils/attendanceRows";
import { openPicker } from "../utils/dateInputs";

export type { CheckInKind };

interface CheckInTimeDialogProps {
  kind: CheckInKind;
  row: RollCallRow;
  onClose: () => void;
  /** La checada falló y el diálogo sigue abierto. */
  onFailed: () => void;
}

/**
 * Checada de un DÍA PASADO: captura la hora (México). Hoy no se usa: el
 * servidor toma su hora actual. La lógica vive en `useCheckInTimeForm`.
 *
 * Se monta en `RollCallView`, no en la celda, con `key` por empleado y tipo.
 */
export function CheckInTimeDialog({ kind, row, onClose, onFailed }: CheckInTimeDialogProps) {
  const { form, isPending, entradaGuardada, getError, clearError, handleFormSubmit } =
    useCheckInTimeForm({ kind, row, onClose, onFailed });

  const handleOpenChange = (next: boolean) => {
    if (!next && !isPending) onClose();
  };

  const isEntry = kind === "entrada";

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="440px"
      showCloseButton={false}
      title={isEntry ? "Registrar Entrada" : "Registrar Salida"}
      description={`${row.empleado_nombre} · ${formatLocalDate(row.fecha)}. Es un día pasado: captura la hora de ${
        isEntry ? "llegada" : "salida"
      } (hora de México).${entradaGuardada ? ` Entrada registrada: ${entradaGuardada}.` : ""}`}
    >
      <form onSubmit={handleFormSubmit} className="space-y-4 py-1">
        <form.Field name="hora">
          {(field) => (
            <FormInput
              label={isEntry ? "Hora de entrada" : "Hora de salida"}
              type="time"
              name={field.name}
              className="dark:scheme-dark cursor-pointer"
              onClick={openPicker}
              value={field.state.value}
              disabled={isPending}
              error={getError()}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearError();
              }}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Registrando…">
            {isEntry ? "Registrar entrada" : "Registrar salida"}
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}

"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { getMexicoTimeHHMM, toMexicoLocalTimestamp } from "@/src/utils/mexicoTime";
import {
  createCheckInTimeSchema,
  HORA_INVALIDA_MESSAGE,
  type CheckInTimeValues,
  type StoredTime,
} from "../schemas/attendance.schema";
import type { RollCallRow } from "../utils/attendanceRows";
import { targetOf } from "../utils/attendanceRowTarget";
import { useRegisterEntry, useRegisterExit } from "./useCheckIn";

export type CheckInKind = "entrada" | "salida";

interface UseCheckInTimeFormParams {
  kind: CheckInKind;
  row: RollCallRow;
  onClose: () => void;
  /** La checada falló y el diálogo sigue abierto: un cierre posterior va sin aviso. */
  onFailed: () => void;
}

/**
 * Formulario de la checada con hora (días pasados), con TanStack Form. Mismo
 * esquema que `useShiftForm`. `hora` viaja como "YYYY-MM-DD HH:MM:SS" en hora
 * local de México (`toMexicoLocalTimestamp`), junto con `fecha`.
 *
 * Un 404 (sin registro o empleado inexistente) o un 409 (ya estaba registrada)
 * cierran el diálogo: reintentar no sirve y el toast explica. Un 400 (p. ej. la
 * salida no es posterior a la entrada) lo deja abierto para corregir la hora.
 */
export function useCheckInTimeForm({ kind, row, onClose, onFailed }: UseCheckInTimeFormParams) {
  // Para la salida, la entrada ya guardada (con segundos) es el límite inferior.
  const [after] = useState<StoredTime | null>(() =>
    kind === "salida" && row.record?.hora_entrada
      ? { hhmm: getMexicoTimeHHMM(row.record.hora_entrada), iso: row.record.hora_entrada }
      : null
  );
  const [target] = useState(() => targetOf(row));
  const [horaError, setHoraError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const entry = useRegisterEntry();
  const exit = useRegisterExit();
  const { mutateAsync, isPending } = kind === "entrada" ? entry : exit;

  const form = useForm({
    defaultValues: { hora: "" } as CheckInTimeValues,
    onSubmit: async ({ value }) => {
      const parsed = createCheckInTimeSchema(row.fecha, after).safeParse(value);
      if (!parsed.success) {
        setHoraError(parsed.error.issues[0]?.message ?? HORA_INVALIDA_MESSAGE);
        return;
      }
      const hora = toMexicoLocalTimestamp(row.fecha, parsed.data.hora);
      if (!hora) {
        setHoraError(HORA_INVALIDA_MESSAGE);
        return;
      }
      try {
        await mutateAsync({ target, hora });
        onClose();
      } catch (error) {
        // El toast ya lo dio el hook.
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        if (status === 404 || status === 409) onClose();
        else onFailed();
      }
    },
  });

  const getError = (): FormFieldError | undefined =>
    horaError ? ({ message: horaError } as FormFieldError) : undefined;

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (submittingRef.current) return;
    submittingRef.current = true;
    void form.handleSubmit().finally(() => {
      submittingRef.current = false;
    });
  };

  return {
    form,
    isPending,
    entradaGuardada: after?.hhmm ?? null,
    getError,
    clearError: () => setHoraError(null),
    handleFormSubmit,
  };
}

"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { getMexicoTimeHHMM, toMexicoIsoDateTime } from "@/src/utils/mexicoTime";
import type { AttendanceCorrectionBody } from "../interfaces/attendance.interface";
import {
  AttendanceCorrectionFields,
  createAttendanceCorrectionSchema,
  getCorrectionTimesError,
  type AttendanceCorrectionContext,
  type AttendanceCorrectionField,
  type AttendanceCorrectionValues,
} from "../schemas/attendance.schema";
import type { AttendanceRow } from "../utils/attendanceRows";
import { targetOf } from "../utils/attendanceRowTarget";
import { useCorrectAttendance } from "./useCorrectAttendance";

const HORA_INEXISTENTE_MESSAGE = "Esa hora no existe en la zona horaria de México para este día.";
const SIN_CAMBIOS_MESSAGE = "No hay cambios que guardar.";

type FieldErrors = Partial<Record<AttendanceCorrectionField, string>>;

interface UseAttendanceCorrectionFormParams {
  record: AttendanceRow;
  onClose: () => void;
  /** La corrección falló (el diálogo sigue abierto): ver `markCorrectionFailed`. */
  onFailed: () => void;
}

/**
 * Formulario de "Corregir" (`E-RH`) con TanStack Form. Mismo esquema que
 * `useShiftForm`: errores de cliente y de servidor en estados separados, los
 * del servidor (400 por campo) llegan por `setFieldError` del hook de
 * mutación, y la regla cruzada de horas se reevalúa al cambiar la otra hora
 * una vez que ya se disparó.
 *
 * Contrato que conserva:
 * - Nunca envía `estado`: un registro justificado sigue justificado.
 * - Solo viajan los campos que CAMBIARON: el `<input type="time">` trabaja en
 *   minutos, y reenviar una hora sin tocar truncaría los segundos de una
 *   checada (07:59:42 → 07:59:00) y podía cambiar el retardo.
 * - La regla "salida posterior a la entrada" compara una hora no cambiada con
 *   su datetime guardado, con segundos (ver `getCorrectionTimesError`).
 */
export function useAttendanceCorrectionForm({
  record,
  onClose,
  onFailed,
}: UseAttendanceCorrectionFormParams) {
  // Valores y horas guardadas de APERTURA, fijos: contra ellos se decide qué
  // cambió, aunque un refetch traiga el registro de nuevo con el diálogo
  // abierto.
  const [context] = useState<AttendanceCorrectionContext>(() => ({
    fecha: record.fecha,
    hora_entrada: { hhmm: getMexicoTimeHHMM(record.hora_entrada), iso: record.hora_entrada },
    hora_salida: { hhmm: getMexicoTimeHHMM(record.hora_salida), iso: record.hora_salida },
  }));
  const [initialValues] = useState<AttendanceCorrectionValues>(() => ({
    hora_entrada: context.hora_entrada.hhmm,
    hora_salida: context.hora_salida.hhmm,
    observaciones: record.observaciones ?? "",
  }));
  const [target] = useState(() => targetOf(record));

  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  // ¿La regla cruzada de horas ya se disparó? Desde entonces cada cambio de
  // una hora la reevalúa (mismo mecanismo que `horaRangeFiredRef` en turnos).
  const timesRuleFiredRef = useRef(false);
  // Envío en curso, síncrono: `isPending` llega hasta el siguiente render.
  const submittingRef = useRef(false);

  const { mutateAsync, isPending } = useCorrectAttendance((field, message) =>
    setServerErrors((previous) => ({ ...previous, [field]: message }))
  );

  const removeError = (errors: FieldErrors, field: AttendanceCorrectionField): FieldErrors => {
    if (!(field in errors)) return errors;
    const next = { ...errors };
    delete next[field];
    return next;
  };

  /** Reevalúa la regla cruzada con los valores vigentes y deja su error donde toca. */
  const revalidateTimes = (values: AttendanceCorrectionValues) => {
    if (!timesRuleFiredRef.current) return;
    const error = getCorrectionTimesError(values, context);
    setClientErrors((previous) => {
      let next = removeError(removeError(previous, "hora_entrada"), "hora_salida");
      if (error) next = { ...next, [error.field]: error.message };
      return next;
    });
  };

  /** Limpia los errores del campo editado (y de la otra hora: la regla las liga). */
  const clearFieldErrors = (field: AttendanceCorrectionField) => {
    setFormMessage(null);
    setClientErrors((previous) => removeError(previous, field));
    setServerErrors((previous) =>
      field === "observaciones"
        ? removeError(previous, field)
        : removeError(removeError(previous, "hora_entrada"), "hora_salida")
    );
  };

  /** Valida UN campo en blur; para las horas, también la regla cruzada. */
  const validateField = (field: AttendanceCorrectionField, values: AttendanceCorrectionValues) => {
    const parsed = AttendanceCorrectionFields[field].safeParse(values[field]);
    if (!parsed.success) {
      setClientErrors((previous) => ({
        ...previous,
        [field]: parsed.error.issues[0]?.message ?? "Valor inválido",
      }));
      return;
    }
    setClientErrors((previous) => removeError(previous, field));
    if (field !== "observaciones" && getCorrectionTimesError(values, context)) {
      timesRuleFiredRef.current = true;
      revalidateTimes(values);
    }
  };

  const validateForm = (values: AttendanceCorrectionValues): boolean => {
    const parsed = createAttendanceCorrectionSchema(context).safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }
    const next: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as AttendanceCorrectionField;
      next[field] ??= issue.message;
    });
    if (next.hora_entrada || next.hora_salida) timesRuleFiredRef.current = true;
    setClientErrors(next);
    return false;
  };

  /**
   * Cuerpo del PATCH con SOLO lo que cambió, o los errores de las horas que no
   * existen en México ese día (un salto de horario de verano anterior a 2022).
   */
  const buildBody = (
    values: AttendanceCorrectionValues
  ): { body: AttendanceCorrectionBody } | { errors: FieldErrors } => {
    const body: AttendanceCorrectionBody = {};
    const errors: FieldErrors = {};
    (["hora_entrada", "hora_salida"] as const).forEach((field) => {
      if (values[field] === initialValues[field]) return;
      if (values[field] === "") {
        body[field] = null;
        return;
      }
      const iso = toMexicoIsoDateTime(record.fecha, values[field]);
      if (iso) body[field] = iso;
      else errors[field] = HORA_INEXISTENTE_MESSAGE;
    });
    const observaciones = values.observaciones.trim();
    if (observaciones !== initialValues.observaciones.trim()) {
      body.observaciones = observaciones;
    }
    return Object.keys(errors).length > 0 ? { errors } : { body };
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});
      if (!validateForm(value)) return;

      const built = buildBody(value);
      if ("errors" in built) {
        setClientErrors(built.errors);
        return;
      }
      if (Object.keys(built.body).length === 0) {
        setFormMessage(SIN_CAMBIOS_MESSAGE);
        return;
      }

      try {
        await mutateAsync({ target, body: built.body });
        onClose();
      } catch (error) {
        // El toast ya lo dio el hook. 404: el registro ya no existe, corregir no
        // sirve. El resto (400 por campo, red) deja el diálogo abierto con lo
        // capturado.
        if (error instanceof AxiosError && error.response?.status === 404) {
          onClose();
        } else {
          onFailed();
        }
      }
    },
  });

  const getError = (field: AttendanceCorrectionField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

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
    formMessage,
    getError,
    clearFieldErrors,
    revalidateTimes,
    validateField,
    handleFormSubmit,
  };
}

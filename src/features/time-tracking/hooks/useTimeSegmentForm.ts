"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getMexicoTimeHHMM } from "@/src/utils/mexicoTime";
import type { StoredTime } from "@/src/utils/timeInput";
import { TIPO_NORMAL, type TipoControlHoras } from "../constants/timeTrackingChoices";
import type {
  TimeSegment,
  TimeSegmentCreateBody,
  TimeSegmentUpdateBody,
} from "../interfaces/time-tracking.interface";
import {
  createTimeSegmentSchema,
  getSegmentTimesError,
  resolveSegmentInstants,
  resolveSegmentTime,
  TimeSegmentFields,
  type TimeSegmentContext,
  type TimeSegmentField,
  type TimeSegmentTimeField,
  type TimeSegmentValues,
} from "../schemas/time-tracking.schema";
import {
  getDefaultStartHHMM,
  instantToHHMM,
  parseInstant,
  suggestTipo,
  toSegmentInterval,
} from "../utils/segmentTime";
import { useCreateTimeSegment } from "./useCreateTimeSegment";
import { useUpdateTimeSegment } from "./useUpdateTimeSegment";

const SIN_CAMBIOS_MESSAGE = "No hay cambios que guardar.";

type FieldErrors = Partial<Record<TimeSegmentField, string>>;

/** Lo que el formulario necesita de la asistencia padre. */
export interface BreakdownAttendance {
  id: number;
  empleado: number;
  fecha: string;
}

interface UseTimeSegmentFormParams {
  attendance: BreakdownAttendance;
  /** Límites VIGENTES de la asistencia; aquí la entrada siempre existe. */
  bounds: { entryMs: number; exitMs: number | null };
  /** Tramos VIGENTES de la asistencia (todos: el hook excluye el que edita). */
  segments: readonly TimeSegment[];
  /** Corte de horas extra vigente, o `null` si no se puede resolver. */
  cutoffMs: number | null;
  /** Tramo a editar, o `null` para dar de alta. */
  segment: TimeSegment | null;
  /** Guardado con éxito (o, al editar, el tramo ya no existe). */
  onDone: () => void;
}

const toOpId = (op: string): number | null => (op ? Number(op) : null);
const toDescripcion = (descripcion: string): string | null => descripcion.trim() || null;

/**
 * Formulario de un tramo (alta o edición) con TanStack Form. Mismo esquema que
 * `useAttendanceCorrectionForm`: errores de cliente y de servidor en estados
 * separados, los del servidor (400 por campo) llegan por `setFieldError` del
 * hook de mutación, y la regla cruzada de horas se reevalúa al cambiar la otra
 * hora una vez que ya se disparó.
 *
 * Contrato que conserva:
 * - Las reglas se evalúan contra la asistencia y los tramos VIGENTES (se
 *   reciben en cada render), no contra los de la apertura.
 * - Nunca envía `horas_trabajadas`. El alta toma `empleado`, `asistencia` y
 *   `fecha` de la asistencia; la edición envía SIEMPRE las dos horas.
 * - Una hora que no se tocó al editar se reenvía con su valor guardado, con
 *   segundos: el `<input type="time">` trabaja en minutos y la truncaría.
 * - `tipo` sigue la sugerencia del corte de horas extra mientras la persona no
 *   lo cambie a mano (ver `followsSuggestion`).
 */
export function useTimeSegmentForm({
  attendance,
  bounds,
  segments,
  cutoffMs,
  segment,
  onDone,
}: UseTimeSegmentFormParams) {
  // Todo lo de APERTURA, fijo: contra ello se decide qué cambió aunque un
  // refetch traiga el tramo de nuevo con el formulario abierto.
  const [opening] = useState(() => {
    if (!segment) {
      return {
        segmentId: null,
        stored: null,
        initialValues: {
          hora_inicio: getDefaultStartHHMM(attendance.fecha, bounds, segments),
          hora_fin: "",
          tipo: TIPO_NORMAL,
          op: "",
          descripcion: "",
        } satisfies TimeSegmentValues,
        storedTipo: null,
      };
    }
    const stored: Record<TimeSegmentTimeField, StoredTime> = {
      hora_inicio: { hhmm: getMexicoTimeHHMM(segment.hora_inicio), iso: segment.hora_inicio },
      hora_fin: { hhmm: getMexicoTimeHHMM(segment.hora_fin), iso: segment.hora_fin },
    };
    return {
      segmentId: segment.id,
      stored,
      initialValues: {
        hora_inicio: stored.hora_inicio.hhmm,
        hora_fin: stored.hora_fin.hhmm,
        tipo: segment.tipo,
        op: segment.op !== null ? String(segment.op) : "",
        descripcion: segment.descripcion ?? "",
      } satisfies TimeSegmentValues,
      storedTipo: {
        tipo: segment.tipo,
        startMs: parseInstant(segment.hora_inicio),
        endMs: parseInstant(segment.hora_fin),
      },
    };
  });
  const { initialValues } = opening;
  const isEditing = opening.segmentId !== null;

  // Horas que la persona ya TOCÓ: desde entonces se reconstruyen siempre desde
  // la `fecha` de la asistencia, aunque el texto coincida con el guardado.
  const [touchedTimes, setTouchedTimes] = useState<Record<TimeSegmentTimeField, boolean>>({
    hora_inicio: false,
    hora_fin: false,
  });

  // Contexto de las reglas, rehecho en CADA render. `touched` se puede
  // adelantar al estado (el cambio de una hora valida antes del re-render).
  const buildContext = (touched: Record<TimeSegmentTimeField, boolean>): TimeSegmentContext => {
    const stored: TimeSegmentContext["stored"] = {};
    if (opening.stored) {
      if (!touched.hora_inicio) stored.hora_inicio = opening.stored.hora_inicio;
      if (!touched.hora_fin) stored.hora_fin = opening.stored.hora_fin;
    }
    return {
      fecha: attendance.fecha,
      entryMs: bounds.entryMs,
      exitMs: bounds.exitMs,
      siblings: segments.flatMap((other) => {
        if (other.id === opening.segmentId) return [];
        const interval = toSegmentInterval(other);
        return interval ? [interval] : [];
      }),
      stored,
    };
  };
  const context = buildContext(touchedTimes);

  /**
   * ¿`tipo` sigue la sugerencia? En un alta, hasta que la persona lo cambia a
   * mano. Al editar, también hasta entonces, salvo que el tramo guardado SÍ
   * tuviera sugerencia y su `tipo` difiera de ella: eso fue una elección manual
   * previa y se respeta. Si el guardado no tenía sugerencia (cruzaba el corte o
   * no tenía fin), su `tipo` no cuenta como elección manual. Se evalúa en cada
   * render con el corte VIGENTE (el catálogo de turnos puede llegar después de
   * abrir).
   */
  const [tipoTouched, setTipoTouched] = useState(false);
  const storedSuggestion = opening.storedTipo
    ? suggestTipo(opening.storedTipo.startMs, opening.storedTipo.endMs, cutoffMs)
    : null;
  const followsSuggestion =
    !tipoTouched &&
    (opening.storedTipo === null ||
      storedSuggestion === null ||
      storedSuggestion === "cruza" ||
      storedSuggestion === opening.storedTipo.tipo);

  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  // ¿La regla cruzada de horas ya se disparó? Desde entonces cada cambio de
  // una hora la reevalúa (mismo mecanismo que la corrección de asistencia).
  const timesRuleFiredRef = useRef(false);
  // Envío en curso, síncrono: `isPending` llega hasta el siguiente render.
  const submittingRef = useRef(false);

  const setFieldError = (field: TimeSegmentField, message: string) =>
    setServerErrors((previous) => ({ ...previous, [field]: message }));
  const { mutateAsync: createSegment, isPending: isCreating } = useCreateTimeSegment(setFieldError);
  const { mutateAsync: updateSegment, isPending: isUpdating } = useUpdateTimeSegment(setFieldError);
  const isPending = isCreating || isUpdating;

  const removeError = (errors: FieldErrors, field: TimeSegmentField): FieldErrors => {
    if (!(field in errors)) return errors;
    const next = { ...errors };
    delete next[field];
    return next;
  };

  /** Reevalúa la regla cruzada con los valores vigentes y deja su error donde toca. */
  const revalidateTimes = (values: TimeSegmentValues, rulesContext = context) => {
    if (!timesRuleFiredRef.current) return;
    const error = getSegmentTimesError(values, rulesContext);
    setClientErrors((previous) => {
      let next = removeError(removeError(previous, "hora_inicio"), "hora_fin");
      if (error) next = { ...next, [error.field]: error.message };
      return next;
    });
  };

  /** Limpia los errores del campo editado (y de la otra hora: la regla las liga). */
  const clearFieldErrors = (field: TimeSegmentField) => {
    setFormMessage(null);
    setClientErrors((previous) => removeError(previous, field));
    setServerErrors((previous) =>
      field === "hora_inicio" || field === "hora_fin"
        ? removeError(removeError(previous, "hora_inicio"), "hora_fin")
        : removeError(previous, field)
    );
  };

  /** Valida UN campo en blur; para las horas, también la regla cruzada. */
  const validateField = (field: TimeSegmentField, values: TimeSegmentValues) => {
    const parsed = TimeSegmentFields[field].safeParse(values[field]);
    if (!parsed.success) {
      setClientErrors((previous) => ({
        ...previous,
        [field]: parsed.error.issues[0]?.message ?? "Valor inválido",
      }));
      return;
    }
    setClientErrors((previous) => removeError(previous, field));
    if ((field === "hora_inicio" || field === "hora_fin") && getSegmentTimesError(values, context)) {
      timesRuleFiredRef.current = true;
      revalidateTimes(values);
    }
  };

  const validateForm = (values: TimeSegmentValues): boolean => {
    const parsed = createTimeSegmentSchema(context).safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }
    const next: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as TimeSegmentField;
      next[field] ??= issue.message;
    });
    if (next.hora_inicio || next.hora_fin) timesRuleFiredRef.current = true;
    setClientErrors(next);
    return false;
  };

  /**
   * Cuerpo a enviar, ya validado. Al editar: las dos horas siempre (la no
   * tocada, con su valor guardado) y el resto solo si cambió; sin ningún
   * cambio, nada. Una hora tocada cuenta como cambio aunque su texto sea el
   * mismo: se reconstruye sobre `fecha` (así se corrige un tramo guardado en
   * otro día).
   */
  const buildBody = (
    values: TimeSegmentValues
  ):
    | { kind: "create"; body: TimeSegmentCreateBody }
    | { kind: "update"; id: number; body: TimeSegmentUpdateBody }
    | { kind: "none" } => {
    const start = resolveSegmentTime("hora_inicio", values, context);
    const end = resolveSegmentTime("hora_fin", values, context);
    // `validateForm` ya garantizó que ambas resuelven.
    if (!start || "error" in start || !end || "error" in end) {
      return { kind: "none" };
    }

    if (opening.segmentId === null) {
      return {
        kind: "create",
        body: {
          empleado: attendance.empleado,
          asistencia: attendance.id,
          fecha: attendance.fecha,
          hora_inicio: start.iso,
          hora_fin: end.iso,
          tipo: values.tipo,
          op: toOpId(values.op),
          descripcion: toDescripcion(values.descripcion),
        },
      };
    }

    const body: TimeSegmentUpdateBody = { hora_inicio: start.iso, hora_fin: end.iso };
    let changed = touchedTimes.hora_inicio || touchedTimes.hora_fin;
    if (values.tipo !== initialValues.tipo) {
      body.tipo = values.tipo;
      changed = true;
    }
    if (values.op !== initialValues.op) {
      body.op = toOpId(values.op);
      changed = true;
    }
    if (values.descripcion.trim() !== initialValues.descripcion.trim()) {
      body.descripcion = toDescripcion(values.descripcion);
      changed = true;
    }
    return changed ? { kind: "update", id: opening.segmentId, body } : { kind: "none" };
  };

  const form = useForm({
    defaultValues: initialValues as TimeSegmentValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});
      setFormMessage(null);
      if (!validateForm(value)) return;

      const built = buildBody(value);
      if (built.kind === "none") {
        setFormMessage(SIN_CAMBIOS_MESSAGE);
        return;
      }

      try {
        if (built.kind === "create") {
          await createSegment(built.body);
        } else {
          await updateSegment({ id: built.id, body: built.body });
        }
        onDone();
      } catch (error) {
        // El toast ya lo dio el hook. Al editar, un 404 significa que el tramo
        // ya no existe: editarlo no sirve. El resto (400 por campo, red) deja
        // el formulario con lo capturado.
        if (isEditing && isNotFoundError(error)) {
          onDone();
        }
      }
    },
  });

  /** Aplica la sugerencia de `tipo` a los valores nuevos, si la sigue y hay una. */
  const applySuggestion = (values: TimeSegmentValues, rulesContext: TimeSegmentContext) => {
    if (!followsSuggestion) return;
    const { startMs, endMs } = resolveSegmentInstants(values, rulesContext);
    const suggestion = suggestTipo(startMs, endMs, cutoffMs);
    // "cruza" o sin sugerencia: el tipo NO cambia solo.
    if ((suggestion === "normal" || suggestion === "extra") && suggestion !== values.tipo) {
      form.setFieldValue("tipo", suggestion);
    }
  };

  /** Cambio de una hora: limpia sus errores, reevalúa la regla cruzada y la sugerencia de tipo. */
  const changeTime = (field: TimeSegmentTimeField, value: string) => {
    clearFieldErrors(field);
    // El campo queda TOCADO; este mismo evento ya valida con ese contexto.
    const touched = { ...touchedTimes, [field]: true };
    setTouchedTimes(touched);
    const nextContext = buildContext(touched);
    const next = { ...form.state.values, [field]: value };
    revalidateTimes(next, nextContext);
    applySuggestion(next, nextContext);
  };

  /**
   * Inicio por defecto de un ALTA, calculado con los datos VIGENTES: el
   * formulario puede montarse con la lista en caché antes de que llegue la
   * recarga. Mientras la persona no toque el inicio, sigue a los tramos y a la
   * asistencia (incluso vaciándose si ya no hay inicio válido); una vez tocado,
   * nunca se sobrescribe. Reevalúa la regla cruzada y la sugerencia de `tipo`
   * igual que un cambio de hora.
   */
  const defaultStart = isEditing ? null : getDefaultStartHHMM(attendance.fecha, bounds, segments);
  const syncDefaultStart = useEffectEvent((start: string) => {
    if (form.state.values.hora_inicio === start) return;
    form.setFieldValue("hora_inicio", start);
    const next = { ...form.state.values, hora_inicio: start };
    revalidateTimes(next, context);
    applySuggestion(next, context);
  });
  useEffect(() => {
    if (defaultStart !== null && !touchedTimes.hora_inicio) {
      syncDefaultStart(defaultStart);
    }
  }, [defaultStart, touchedTimes.hora_inicio]);

  /** Elección MANUAL de `tipo`: desde aquí se respeta y la sugerencia deja de aplicarse. */
  const changeTipo = (value: TipoControlHoras) => {
    setTipoTouched(true);
    clearFieldErrors("tipo");
    form.setFieldValue("tipo", value);
  };

  /**
   * Aviso si el tramo cruza el corte de horas extra (nunca se divide solo), o
   * `null`.
   */
  const getCutoffWarning = (values: Pick<TimeSegmentValues, TimeSegmentTimeField>): string | null => {
    const { startMs, endMs } = resolveSegmentInstants(values, context);
    if (cutoffMs === null || suggestTipo(startMs, endMs, cutoffMs) !== "cruza") {
      return null;
    }
    const hhmm = instantToHHMM(cutoffMs);
    return `El tramo cruza el corte de horas extra (${hhmm}). Se recomienda dividirlo en dos: uno hasta las ${hhmm} y otro desde esa hora. El tipo no se ajusta solo.`;
  };

  const getError = (field: TimeSegmentField): FormFieldError | undefined => {
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
    isEditing,
    isPending,
    formMessage,
    /** OP guardada al abrir la edición: el selector la conserva siempre. */
    storedOpId: toOpId(initialValues.op),
    getError,
    clearFieldErrors,
    changeTime,
    changeTipo,
    validateField,
    getCutoffWarning,
    handleFormSubmit,
  };
}

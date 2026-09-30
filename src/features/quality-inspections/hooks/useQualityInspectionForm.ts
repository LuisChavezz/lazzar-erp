"use client";

import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { toSendableDecimal } from "@/src/utils/decimal";
import { fieldNameFromIssuePath } from "@/src/utils/fieldNameFromIssuePath";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import {
  buildQualityInspectionSchema,
  type QualityInspectionFormValues,
} from "../schemas/quality-inspection.schema";
import { useCreateQualityInspection } from "./useCreateQualityInspection";
import { QUALITY_DECIMAL_PLACES } from "../utils/qualityQuantities";
import type {
  CreateQualityInspectionPayload,
  QualityPendingReception,
  QualityResultado,
} from "../interfaces/quality-inspection.interface";
import type {
  ParsedQualityInspectionError,
  QualityLineErrorField,
} from "../utils/parseQualityInspectionError";

interface UseQualityInspectionFormParams {
  reception: QualityPendingReception;
  onSuccess: () => void;
  /** La recepción dejó de estar pendiente (otra persona la inspeccionó). */
  onStale: () => void;
}

const LINE_ERROR_FIELDS: QualityLineErrorField[] = [
  "cantidad_aprobada",
  "cantidad_rechazada",
  "resultado",
  "motivo_rechazo",
  "suma",
];

type LineServerErrors =Record<number, Partial<Record<QualityLineErrorField, string>>>;

const toFieldError = (message: string | undefined): FormFieldError | undefined =>
  message ? ({ message } as FormFieldError) : undefined;

function buildPayload(
  receptionId: number,
  value: QualityInspectionFormValues,
): CreateQualityInspectionPayload {
  const observaciones = value.observaciones.trim();
  return {
    recepcion: receptionId,
    inspector: value.inspector,
    ...(observaciones ? { observaciones } : {}),
    detalle: value.lineas.map((line) => ({
      recepcion_detalle: line.recepcion_detalle,
      // El schema ya garantizó el formato: `toSendableDecimal` canoniza
      // ("12." → "12.00") y devuelve null solo para el campo vacío, que vale 0.
      cantidad_aprobada: toSendableDecimal(line.cantidad_aprobada, QUALITY_DECIMAL_PLACES) ?? "0.00",
      cantidad_rechazada:
        toSendableDecimal(line.cantidad_rechazada, QUALITY_DECIMAL_PLACES) ?? "0.00",
      resultado: line.resultado as QualityResultado,
      motivo_rechazo: line.motivo_rechazo.trim() || null,
    })),
  };
}

/**
 * Estado y validación del formulario de inspección.
 *
 * La validación corre en VIVO sobre los valores (no solo al enviar): el botón
 * se mantiene deshabilitado mientras el schema no pase. Los mensajes, en
 * cambio, solo se muestran en los renglones que el usuario ya tocó (o en todos
 * tras `handleRevealErrors`), para no abrir el diálogo lleno de rojo.
 *
 * Los errores del backend se guardan aparte, por `recepcion_detalle`, y se
 * limpian en cuanto se edita su renglón.
 */
export function useQualityInspectionForm({
  reception,
  onSuccess,
  onStale,
}: UseQualityInspectionFormParams) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const schema = buildQualityInspectionSchema(reception.detalle.map((line) => line.id));

  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [serverLineErrors, setServerLineErrors] = useState<LineServerErrors>({});
  const [serverInspectorError, setServerInspectorError] = useState<string | undefined>();

  const handleServerError = (parsed: ParsedQualityInspectionError) => {
    if (parsed.stale) {
      onStale();
      return;
    }
    setServerLineErrors(parsed.lineErrors);
    setServerInspectorError(parsed.inspectorError);
  };

  const mutation = useCreateQualityInspection({
    onSuccess,
    onServerError: handleServerError,
  });

  const defaultValues: QualityInspectionFormValues = {
    inspector: 0,
    observaciones: "",
    lineas: reception.detalle.map((line) => ({
      recepcion_detalle: line.id,
      cantidad_recibida: line.cantidad_recibida,
      cantidad_aprobada: "",
      cantidad_rechazada: "",
      resultado: "",
      motivo_rechazo: "",
    })),
  };

  /**
   * Muestra los errores de TODOS los renglones (no solo los tocados) y lleva
   * la vista al primero. El botón de envío sigue deshabilitado mientras el form
   * no sea válido: esta es la vía para encontrar qué falta en una recepción
   * larga (la dispara el aviso "Faltan N renglones…").
   */
  const revealErrors = (issuePaths: readonly (readonly PropertyKey[])[]) => {
    setShowAllErrors(true);
    scrollToFirstValidationError(
      formRef.current,
      // `suma` no es un input: se apunta a la cantidad aprobada de su renglón.
      issuePaths.map((path) =>
        fieldNameFromIssuePath(
          path.at(-1) === "suma" ? [...path.slice(0, -1), "cantidad_aprobada"] : path,
        ),
      ),
    );
  };

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      // Defensa: el botón no se habilita con el form inválido.
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        revealErrors(parsed.error.issues.map((issue) => issue.path));
        return;
      }
      mutation.mutate(buildPayload(reception.id, value));
    },
  });

  // ── Validación en vivo ────────────────────────────────────────────────────
  const values = useStore(form.store, (state) => state.values);
  const validation = schema.safeParse(values);
  const clientErrors: Record<string, string> = {};
  const invalidLineIndices = new Set<number>();
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const key = issue.path.join(".");
      clientErrors[key] ??= issue.message;
      if (issue.path[0] === "lineas" && typeof issue.path[1] === "number") {
        invalidLineIndices.add(issue.path[1]);
      }
    }
  }

  const handleRevealErrors = () => {
    if (!validation.success) {
      revealErrors(validation.error.issues.map((issue) => issue.path));
    }
  };

  const markTouched = (key: string) => {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  /** Llamar en cada cambio de un campo del renglón `index`. */
  const markLineTouched = (index: number) => {
    markTouched(`lineas.${index}`);
    const lineId = values.lineas[index]?.recepcion_detalle;
    if (lineId !== undefined && serverLineErrors[lineId]) {
      setServerLineErrors((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
    }
  };

  const markInspectorTouched = () => {
    markTouched("inspector");
    setServerInspectorError(undefined);
  };

  const getLineError = (index: number, field: QualityLineErrorField) => {
    const lineId = values.lineas[index]?.recepcion_detalle;
    const serverMessage = lineId !== undefined ? serverLineErrors[lineId]?.[field] : undefined;
    if (serverMessage) return toFieldError(serverMessage);
    if (!showAllErrors && !touched.has(`lineas.${index}`)) return undefined;
    return toFieldError(clientErrors[`lineas.${index}.${field}`]);
  };

  /** ¿El renglón tiene algún error VISIBLE? (para marcar su tarjeta en rojo). */
  const lineHasVisibleError = (index: number) =>
    LINE_ERROR_FIELDS.some((field) => getLineError(index, field) !== undefined);

  const getInspectorError = () => {
    if (serverInspectorError) return toFieldError(serverInspectorError);
    if (!showAllErrors && !touched.has("inspector")) return undefined;
    return toFieldError(clientErrors.inspector);
  };

  /** Error que no pertenece a ningún campo (renglones faltantes/sobrantes). */
  const formError = clientErrors.lineas;

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Enter en un input NO envía: con N renglones es muy fácil disparar el POST
  // (irreversible: mueve inventario) mientras se captura una cantidad.
  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
      event.preventDefault();
    }
  };

  return {
    form,
    formRef,
    isValid: validation.success,
    isPending: mutation.isPending,
    formError,
    pendingLineCount: invalidLineIndices.size,
    isInspectorMissing: clientErrors.inspector !== undefined,
    handleRevealErrors,
    lineHasVisibleError,
    getLineError,
    getInspectorError,
    markLineTouched,
    markInspectorTouched,
    handleFormSubmit,
    handleFormKeyDown,
  };
}

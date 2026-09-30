"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { QuoteValidationIssue } from "@/src/features/quotes/utils/quoteValidationErrors";
import type { PedidoDetail } from "../interfaces/order.interface";
import {
  createPedidoProgramacionFormValues,
  createPedidoProgramacionSchema,
  getPedidoTotalPiezas,
  sumProgramacionCantidades,
} from "../schemas/pedido-programacion.schema";
import {
  getDestinoNoAplicableMessage,
  getPedidoDestinosAplicables,
  isPedidoProgramacionDestino,
  type PedidoProgramacionDestino,
} from "../constants/pedidoProgramacion";
import { useProgramarPedido } from "./useProgramarPedido";

const LIST_ERROR_KEY = "programaciones";

/** `programaciones.<i>.<campo>` → índice (grupo 1). */
const ROW_FIELD_PATH_RE = /^programaciones\.(\d+)\./;

/**
 * Estado del formulario "Programar pedido". Molde de `useCreditNoteForm`:
 * errores indexados por ruta, claves estables por renglón, `safeParse` en el
 * submit y `mutateAsync` con `try/catch` (el toast sale de la mutación).
 *
 * Recibe el pedido YA CARGADO: el diálogo solo monta el formulario con el
 * detalle fresco, así que los valores iniciales se calculan una vez.
 */
export function usePedidoProgramacionForm({
  pedido,
  onSuccess,
}: {
  pedido: PedidoDetail;
  onSuccess?: () => void;
}) {
  const totalPiezas = getPedidoTotalPiezas(pedido);
  const destinosAplicables = getPedidoDestinosAplicables(pedido.destinos_aplicables);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [initialValues] = useState(() => createPedidoProgramacionFormValues(pedido));
  const rowKeyCounter = useRef(initialValues.programaciones.length);
  const [rowKeys, setRowKeys] = useState<number[]>(() =>
    initialValues.programaciones.map((_, index) => index),
  );

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  /**
   * Limpia el error de un campo y, con él, el de la LISTA: la suma excedida
   * depende de todas las cantidades, así que cualquier edición la vuelve a
   * poner en duda.
   */
  const clearError = (path: string) => {
    setErrors((prev) => {
      const keys = ROW_FIELD_PATH_RE.test(path) ? [path, LIST_ERROR_KEY] : [path];
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  /** Quitar un renglón recorre los índices: los errores por renglón dejan de apuntar bien. */
  const resetRowErrors = () => {
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(LIST_ERROR_KEY)) next[key] = value;
      }
      return next;
    });
  };

  const applyServerIssues = (issues: QuoteValidationIssue[]) => {
    setErrors((prev) => {
      const next = { ...prev };
      issues.forEach((issue) => {
        if (!next[issue.path]) next[issue.path] = issue.message;
      });
      return next;
    });
  };

  const { mutateAsync: programarMutation, isPending: isSaving } = useProgramarPedido({
    onValidationError: applyServerIssues,
  });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      const parsed = createPedidoProgramacionSchema(totalPiezas, destinosAplicables).safeParse(
        value,
      );
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }
      setErrors({});
      setIsSubmitting(true);
      try {
        // Lista COMPLETA (reemplazo total) con destino, cantidad y comentarios
        // (`null` si está vacío). La fecha y el usuario los sella el servidor.
        await programarMutation({
          pedidoId: pedido.id,
          payload: {
            programaciones: parsed.data.programaciones.map(
              ({ destino, cantidad, comentarios }) => ({ destino, cantidad, comentarios }),
            ),
          },
        });
        onSuccess?.();
      } catch {
        // Ya repartido por `useProgramarPedido` (errores de campo + toast).
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const programaciones = useStore(form.store, (state) => state.values.programaciones);
  const sumaProgramada = sumProgramacionCantidades(programaciones);
  const excedeTotal = sumaProgramada > totalPiezas;

  /**
   * Destino (de la lista blanca) que el pedido ya NO admite, o `null`. Se
   * evalúa en vivo, no solo al enviar: una entrada guardada así debe verse
   * marcada desde que se abre el diálogo. `""` y los códigos desconocidos no
   * cuentan aquí; esos los marca el schema.
   */
  const getDestinoNoAplicable = (destino: string): PedidoProgramacionDestino | null =>
    isPedidoProgramacionDestino(destino) && !destinosAplicables.includes(destino)
      ? destino
      : null;
  const hayDestinosNoAplicables = programaciones.some(
    (row) => getDestinoNoAplicable(row.destino) !== null,
  );

  /** Error de un campo: el del estado (submit/servidor) o, para `destino`, el de aplicabilidad. */
  const getRowError = (index: number, field: "destino" | "cantidad" | "comentarios") => {
    const path = `programaciones.${index}.${field}`;
    const stored = getError(path);
    if (stored || field !== "destino") return stored;
    const noAplicable = getDestinoNoAplicable(programaciones[index]?.destino ?? "");
    return noAplicable ? { message: getDestinoNoAplicableMessage(noAplicable) } : undefined;
  };

  const addRow = () => {
    form.pushFieldValue("programaciones", { destino: "", cantidad: "", comentarios: "" });
    setRowKeys((prev) => [...prev, rowKeyCounter.current++]);
    clearError(LIST_ERROR_KEY);
  };

  const removeRow = (index: number) => {
    form.removeFieldValue("programaciones", index);
    setRowKeys((prev) => prev.filter((_, i) => i !== index));
    resetRowErrors();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    rowKeys,
    totalPiezas,
    sumaProgramada,
    excedeTotal,
    destinosAplicables,
    hayDestinosNoAplicables,
    isPending: isSubmitting || isSaving,
    getError,
    getRowError,
    clearError,
    addRow,
    removeRow,
    handleFormSubmit,
  };
}

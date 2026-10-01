"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
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
  getDestinoNoAplicable,
  getDestinoNoAplicableMessage,
  getPedidoDestinosAplicables,
} from "../constants/pedidoProgramacion";
import { getPedidoDetail } from "../services/actions";
import { pedidoDetailQueryKey } from "./usePedidoDetail";
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

  const queryClient = useQueryClient();
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

  /**
   * Relee el detalle para recalcular `destinos_aplicables` cuando el backend
   * rechaza la LISTA: el pedido pudo cambiar de servicios con el diálogo
   * abierto y la regla en vivo marcará el renglón afectado. No se interpreta el
   * texto del 400: cualquier error de lista relee.
   *
   * Por qué NO resetea el formulario: los valores iniciales viven en un
   * `useState` (misma referencia para siempre), así que `useForm` no ve cambiar
   * `defaultValues`; el nuevo detalle solo cambia `pedido`, del que se derivan
   * `destinosAplicables` y `totalPiezas`. Se lee con la acción directa y se
   * escribe con `setQueryData`, no con `refetch`: un refetch FALLIDO pondría la
   * query en error y el diálogo cambiaría el formulario por su `ErrorState`,
   * perdiendo lo capturado. Si la relectura falla, se conserva el detalle actual.
   */
  const refreshPedidoDetail = async () => {
    try {
      const fresh = await getPedidoDetail(pedido.id);
      queryClient.setQueryData(pedidoDetailQueryKey(pedido.id), fresh);
    } catch {
      // El 400 original ya se mostró; sin detalle nuevo no hay nada que recalcular.
    }
  };

  const applyServerIssues = (issues: QuoteValidationIssue[]) => {
    setErrors((prev) => {
      const next = { ...prev };
      issues.forEach((issue) => {
        if (!next[issue.path]) next[issue.path] = issue.message;
      });
      return next;
    });
    if (issues.some((issue) => issue.path === LIST_ERROR_KEY)) {
      void refreshPedidoDetail();
    }
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
  /**
   * Cada renglón es una parcialidad: cuenta renglones, no destinos distintos
   * (un destino puede repetirse), e incluye los vacíos o con error, que el
   * guardado ya bloquea hasta que sean válidos.
   */
  const totalParcialidades = programaciones.length;
  const excedeTotal = sumaProgramada > totalPiezas;

  /**
   * Marca EN VIVO, no solo al enviar: una entrada guardada con un destino que
   * el pedido ya no admite debe verse marcada desde que se abre el diálogo, y
   * bloquea el guardado. Misma regla que la guarda del schema.
   */
  const hayDestinosNoAplicables = programaciones.some(
    (row) => getDestinoNoAplicable(row.destino, destinosAplicables) !== null,
  );

  /** Error del destino de un renglón: el del estado (submit/servidor) o el de aplicabilidad. */
  const getDestinoError = (index: number): FormFieldError | undefined => {
    const stored = getError(`programaciones.${index}.destino`);
    if (stored) return stored;
    const noAplicable = getDestinoNoAplicable(
      programaciones[index]?.destino ?? "",
      destinosAplicables,
    );
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
    totalParcialidades,
    excedeTotal,
    destinosAplicables,
    hayDestinosNoAplicables,
    isPending: isSubmitting || isSaving,
    getError,
    getDestinoError,
    clearError,
    addRow,
    removeRow,
    handleFormSubmit,
  };
}

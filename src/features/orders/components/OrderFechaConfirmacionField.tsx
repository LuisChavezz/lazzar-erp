"use client";

import { useEffect, useRef, useState } from "react";
import { PencilSquareIcon } from "@/src/components/Icons";
import { formatShortDate, parseLocalDate } from "@/src/utils/formatDate";
import { PedidoFechaConfirmacionField } from "./PedidoFechaConfirmacionField";

interface OrderFechaConfirmacionFieldProps {
  /** Valor del servidor: datetime ISO con offset, o `null`. */
  value: string | null;
  /** Misma regla de edición de siempre (ver `canEditHeader` en la página). */
  canEdit: boolean;
  /** Guardado del editor existente (`mutateAsync`: rechaza si falla). */
  onSave: (fechaConfirmacion: string | null) => Promise<unknown>;
  isPending: boolean;
}

/**
 * "Fecha confirmada" en modo LECTURA, como el resto de los datos de la hoja:
 * la fecha formateada (o "—") y, solo si se puede editar, un lápiz que muestra
 * el editor existente (`PedidoFechaConfirmacionField`, sin tocar).
 *
 * El día se lee con `parseLocalDate`, el MISMO parseo local que usa el editor,
 * para que la lectura y el `<input type="date">` muestren el mismo día
 * calendario (una fecha sin hora no se interpreta como medianoche UTC).
 *
 * Ciclo del editor:
 * - Guardado correcto → vuelve a lectura. `mutateAsync` resuelve tras releer
 *   el detalle, así que el valor nuevo ya está en pantalla. Si el foco quedó
 *   "suelto" (Enter, o clic en una zona no enfocable) vuelve al lápiz.
 * - Guardado fallido → el editor vuelve al valor del servidor y el toast de la
 *   mutación avisa, como siempre. Si el foco quedó suelto, regresa al editor
 *   (y salir de él sin cambios vuelve a lectura, por la ruta normal); si el
 *   usuario ya lo llevó a otro control, no se le roba: se vuelve a lectura.
 * - Escape, o salir del campo sin cambios → vuelve a lectura sin guardar.
 */

/** El foco no está en ningún control: el editor lo soltó al guardar. */
const isFocusIdle = () => !document.activeElement || document.activeElement === document.body;
export function OrderFechaConfirmacionField({
  value,
  canEdit,
  onSave,
  isPending,
}: OrderFechaConfirmacionFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  /** El editor llamó a guardar en este blur (si no, el blur fue sin cambios). */
  const savingRef = useRef(false);
  /** Escape: lo que el editor intente guardar al desmontarse se descarta. */
  const cancelledRef = useRef(false);
  /** Devolver el foco al lápiz al volver a lectura (solo si lo tenía el editor). */
  const restoreFocusRef = useRef(false);
  /** Tras un guardado fallido: reenfocar el editor cuando deje de estar pendiente. */
  const [refocusEditor, setRefocusEditor] = useState(false);

  const date = parseLocalDate(value);
  const label = date ? formatShortDate(date) : "—";

  useEffect(() => {
    if (isEditing) {
      cancelledRef.current = false;
      containerRef.current?.querySelector("input")?.focus();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      pencilRef.current?.focus();
    }
  }, [isEditing]);

  // El input está deshabilitado mientras el guardado está pendiente: se
  // reenfoca en cuanto se habilita.
  useEffect(() => {
    if (refocusEditor && !isPending) {
      setRefocusEditor(false);
      containerRef.current?.querySelector("input")?.focus();
    }
  }, [refocusEditor, isPending]);

  if (!canEdit) return <>{label}</>;

  const closeEditor = (restoreFocus: boolean) => {
    restoreFocusRef.current = restoreFocus;
    setIsEditing(false);
  };

  const handleSave = async (next: string | null) => {
    if (cancelledRef.current) return;
    savingRef.current = true;
    try {
      await onSave(next);
      closeEditor(isFocusIdle());
    } catch (error) {
      if (isFocusIdle()) {
        setRefocusEditor(true);
      } else {
        closeEditor(false);
      }
      // Se relanza: el editor (`useInlineDraft`) necesita el rechazo para
      // volver al valor del servidor.
      throw error;
    } finally {
      savingRef.current = false;
    }
  };

  if (!isEditing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        <button
          ref={pencilRef}
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label="Editar fecha de confirmación"
          title="Editar fecha de confirmación"
          className="cursor-pointer rounded p-0.5 text-slate-400 hover:text-sky-600 dark:text-slate-500 dark:hover:text-sky-400 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500"
        >
          <PencilSquareIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelledRef.current = true;
          closeEditor(true);
        }
      }}
      // Se evalúa DESPUÉS del `onBlur` del input (el evento burbujea desde él):
      // si el editor no guardó, el valor no cambió y se vuelve a lectura.
      onBlur={() => {
        if (!savingRef.current && !cancelledRef.current) closeEditor(false);
      }}
    >
      <PedidoFechaConfirmacionField value={value} onSave={handleSave} isPending={isPending} />
    </div>
  );
}

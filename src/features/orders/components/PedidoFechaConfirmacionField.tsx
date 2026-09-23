"use client";

import { FormInput } from "@/src/components/FormInput";
import { useInlineDraft } from "@/src/hooks/useInlineDraft";
import { parseLocalDate, toLocalDateKey, toLocalMidnightIso } from "@/src/utils/formatDate";

interface PedidoFechaConfirmacionFieldProps {
  /** Valor canónico del servidor: datetime ISO con offset, o `null`. */
  value: string | null;
  /**
   * Se invoca al confirmar un cambio: medianoche local del día elegido con
   * offset explícito (`toLocalMidnightIso`), o `null` si se vació.
   */
  onSave: (fechaConfirmacion: string | null) => void | Promise<unknown>;
  isPending?: boolean;
}

/**
 * Día calendario LOCAL de `fecha_confirmacion`, como lo necesita
 * `<input type="date">`. No `value.slice(0, 10)`: eso toma el día del offset en
 * que lo guardó el servidor, que no tiene por qué ser la zona del navegador.
 */
const toDateInputValue = (value: string | null): string | null => {
  const date = parseLocalDate(value);
  return date ? toLocalDateKey(date) : null;
};

/**
 * Fecha de confirmación editable en línea, en la cabecera del detalle.
 *
 * Misma mecánica que el campo de máquina de la orden de bordado
 * (`useInlineDraft`: guarda al salir solo si cambió, Enter confirma), con una
 * adaptación propia del `<input type="date">`: una fecha a medio teclear
 * reporta `value === ""`, igual que una vaciada a propósito. Al salir se mira
 * `validity.badInput`: si la fecha está incompleta se DESCARTA el borrador
 * (`revert`) en vez de guardarla como `null`, que borraría la confirmación.
 * Vaciarla de verdad (valor vacío sin `badInput`) sí manda `null`.
 */
export function PedidoFechaConfirmacionField({
  value,
  onSave,
  isPending = false,
}: PedidoFechaConfirmacionFieldProps) {
  const { draft, setDraft, handleBlur, revert } = useInlineDraft(
    toDateInputValue(value),
    // Se DEVUELVE lo que devuelva `onSave`: si es una promesa rechazada,
    // `useInlineDraft` regresa el campo al valor del servidor.
    (next) => {
      if (next === null) return onSave(null);
      // Un día que no se pudiera convertir NO se manda como `null`: eso
      // borraría la confirmación en lugar de fallar.
      const iso = toLocalMidnightIso(next);
      return iso ? onSave(iso) : undefined;
    },
  );

  return (
    <FormInput
      variant="compact"
      type="date"
      value={draft}
      disabled={isPending}
      aria-label="Fecha de confirmación"
      className="w-34 py-0.5!"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        if (event.currentTarget.validity.badInput) {
          revert();
          return;
        }
        handleBlur();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

"use client";

import { useRef } from "react";
import toast from "react-hot-toast";
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
 * (`useInlineDraft`: guarda al salir solo si cambió, Enter confirma), con
 * adaptaciones propias del `<input type="date">`:
 *
 * - Una fecha a medio teclear reporta `value === ""`, igual que una vaciada a
 *   propósito; lo que las distingue es `validity.badInput`. Si la fecha está
 *   incompleta al salir se DESCARTA el borrador (`revert`) en vez de guardarla
 *   como `null`, que borraría la confirmación, y se AVISA: antes volvía al
 *   valor anterior en silencio y parecía que el guardado se había perdido
 *   (EC-565, ME-10). Vaciarla de verdad (valor vacío sin `badInput`) sí manda
 *   `null`. `badInput` se toma en cada tecla y no en el blur: Firefox lo
 *   reporta en `false` DENTRO del blur aunque la fecha siga incompleta, y ahí
 *   se habría mandado `null`. Por lo mismo, Tab y Enter lo toman al bajar la
 *   tecla, antes de que el foco se mueva, y solo para encender la marca.
 * - Tab es el nativo: recorre día, mes, año y el botón del calendario (que
 *   viven DENTRO del input, sin blur) y solo al salir del input se guarda.
 * - Un blur porque la VENTANA perdió el foco (Alt+Tab) no es salir del campo:
 *   se ignora y lo tecleado sigue ahí al volver.
 */
export function PedidoFechaConfirmacionField({
  value,
  onSave,
  isPending = false,
}: PedidoFechaConfirmacionFieldProps) {
  /** `validity.badInput` de la última interacción (ver arriba por qué no en el blur). */
  const incompleteRef = useRef(false);
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
      onChange={(event) => {
        incompleteRef.current = event.currentTarget.validity.badInput;
        setDraft(event.target.value);
      }}
      onKeyUp={(event) => {
        if (event.key === "Tab" || event.key === "Enter") return;
        incompleteRef.current = event.currentTarget.validity.badInput;
      }}
      onBlur={(event) => {
        if (!document.hasFocus()) return;
        if (event.currentTarget.validity.badInput || incompleteRef.current) {
          incompleteRef.current = false;
          revert();
          toast.error("La fecha está incompleta; no se guardó.");
          return;
        }
        handleBlur();
      }}
      onKeyDown={(event) => {
        // Solo la encienden: con el foco ya en el botón del calendario Firefox
        // también la reporta en `false`. La apagan las teclas que editan.
        if (event.key === "Tab" || event.key === "Enter") {
          incompleteRef.current ||= event.currentTarget.validity.badInput;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

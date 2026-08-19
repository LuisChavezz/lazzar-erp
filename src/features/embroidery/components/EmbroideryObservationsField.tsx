"use client";

import { FormTextarea } from "@/src/components/FormTextarea";
import { useInlineDraft } from "../hooks/useInlineDraft";

/**
 * Tope blando. `observaciones` es un `TextField` en el backend (sin límite de
 * longitud), pero un campo de notas sin freno acaba guardando pegotes enteros.
 */
const MAX_LENGTH = 1000;

interface EmbroideryObservationsFieldProps {
  /** Valor canónico del servidor (`observaciones`). */
  value: string | null;
  /** Se invoca con el nuevo valor (o `null` si queda vacío) al confirmar. */
  onSave: (value: string | null) => void;
  /** PATCH en vuelo: inhabilita el campo. */
  isPending?: boolean;
}

/**
 * Campo multilínea editable en línea para `observaciones`.
 *
 * Comparte con el campo de máquina toda la mecánica del borrador
 * (`useInlineDraft`). La diferencia propia: NO confirma con Enter, porque aquí
 * el salto de línea es contenido legítimo — solo guarda al salir del campo.
 */
export function EmbroideryObservationsField({
  value,
  onSave,
  isPending = false,
}: EmbroideryObservationsFieldProps) {
  const { draft, setDraft, handleBlur } = useInlineDraft(value, onSave);

  return (
    <FormTextarea
      rows={2}
      value={draft}
      maxLength={MAX_LENGTH}
      placeholder="Sin observaciones"
      disabled={isPending}
      aria-label="Observaciones"
      className="rounded-md! px-2! py-1.5! text-xs!"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={handleBlur}
    />
  );
}

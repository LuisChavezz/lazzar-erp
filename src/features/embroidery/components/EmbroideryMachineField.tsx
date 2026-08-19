"use client";

import { FormInput } from "@/src/components/FormInput";
import { useInlineDraft } from "../hooks/useInlineDraft";

/** Techo de longitud del nombre de máquina — texto libre, sin otra validación. */
const MAX_LENGTH = 100;

interface EmbroideryMachineFieldProps {
  /** Valor canónico del servidor (`maquina_asignada`). */
  value: string | null;
  /** Se invoca con el nuevo valor (o `null` si queda vacío) al confirmar. */
  onSave: (value: string | null) => void;
  /** PATCH en vuelo: inhabilita el campo. */
  isPending?: boolean;
}

/**
 * Campo de texto editable en línea para `maquina_asignada`.
 *
 * El borrador, la resincronización con el servidor y la comparación al salir
 * viven en `useInlineDraft`, compartido con el campo de observaciones. Aquí
 * solo queda lo propio de este campo: el input de una línea, su tope de
 * longitud y que Enter confirme (en observaciones el salto de línea es
 * contenido legítimo, así que allí no).
 */
export function EmbroideryMachineField({
  value,
  onSave,
  isPending = false,
}: EmbroideryMachineFieldProps) {
  const { draft, setDraft, handleBlur } = useInlineDraft(value, onSave);

  return (
    <FormInput
      variant="compact"
      value={draft}
      maxLength={MAX_LENGTH}
      placeholder="Sin asignar"
      disabled={isPending}
      aria-label="Máquina asignada"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

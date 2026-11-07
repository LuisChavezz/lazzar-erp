import type { MouseEvent } from "react";

/**
 * Abre el selector nativo al hacer clic en un input de fecha u hora (mismo
 * gesto que `ShiftForm`). `showPicker` lanza si el input no lo admite en ese
 * momento; no hay nada que hacer.
 */
export const openPicker = (event: MouseEvent<HTMLInputElement>) => {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    /* noop */
  }
};

import { useEffect, useEffectEvent, type RefObject } from "react";

/**
 * Escape cierra SOLO la lista de un buscador, no el diálogo que lo contiene
 * (EC-922). Un diálogo de Radix escucha Escape en `document` en fase de
 * captura, antes que cualquier `onKeyDown` de React, y se cerraría entero con
 * lo capturado. Por eso se escucha en `window`, también en captura (corre antes
 * que `document`), y se detiene la propagación.
 *
 * Solo actúa mientras la lista está abierta (`open`) y el Escape sale del input
 * del buscador: con la lista cerrada, Escape cierra el diálogo como siempre.
 */
export function useEscapeClosesPopup(
  open: boolean,
  inputRef: RefObject<HTMLElement | null>,
  onEscape: () => void,
) {
  const handleEscape = useEffectEvent(onEscape);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.target !== inputRef.current) return;
      event.stopPropagation();
      handleEscape();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, inputRef]);
}

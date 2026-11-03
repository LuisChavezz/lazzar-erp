import { useRef, useState } from "react";

/**
 * Candado de reenvío POR FILA para una acción confirmada (eliminar, cancelar,
 * emitir...).
 *
 * - Se toma al CONFIRMAR, nunca al abrir: cerrar el diálogo sin confirmar no deja
 *   nada tomado.
 * - Guarda los ids EN VUELO, no un booleano de la acción: mientras la fila A
 *   viaja, confirmar la B sigue funcionando; confirmar A otra vez no.
 * - Cerrar el diálogo a mano NO lo suelta: se suelta cuando la petición termina.
 *
 * La ref es la guarda: se marca de forma SÍNCRONA, así que el segundo clic de un
 * doble clic —que llega antes de que React vuelva a pintar— ya la encuentra
 * puesta. El estado solo refleja lo mismo para pintar la etiqueta de pendiente
 * de la fila correcta; el `isPending` de la mutación no sirve para eso, porque
 * con dos filas en vuelo describe solo la última llamada.
 *
 * Extraído tal cual de la función privada que `CreditNoteList` y `PolizaList`
 * repiten; esos dos módulos aún conservan su copia local.
 */
export function useRowActionLock() {
  const inFlightRef = useRef<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(() => new Set());

  const acquire = (id: number): boolean => {
    if (inFlightRef.current.has(id)) return false;
    inFlightRef.current.add(id);
    setPendingIds(new Set(inFlightRef.current));
    return true;
  };

  const release = (id: number) => {
    inFlightRef.current.delete(id);
    setPendingIds(new Set(inFlightRef.current));
  };

  const isPending = (id: number | null): boolean =>
    id !== null && pendingIds.has(id);

  /**
   * Lectura SÍNCRONA del candado (la ref, no el estado): para guardas en
   * handlers —p. ej. el `onOpenChange` de una confirmación— que deben valer
   * desde el primer frame, antes del render que pinta `isPending`. No se usa
   * para pintar.
   */
  const isHeld = (id: number | null): boolean => id !== null && inFlightRef.current.has(id);

  /**
   * Props de una confirmación (`ConfirmDialog`) que debe quedar abierta y
   * bloqueada mientras la acción de SU registro está en vuelo: se esparcen tal
   * cual (`{...rowLock.guardClose(id, cerrar)}`).
   *
   * - `busy`: lo que la pinta ocupada (botones deshabilitados, Esc y clic fuera
   *   ignorados). `extraBusy` agrega el "en vuelo" de otra fuente, p. ej. la
   *   `MutationCache` (`busyIds`), que sobrevive a un remontaje.
   * - `onOpenChange`: ignora el cierre (Volver, X, Esc) mientras el candado
   *   está tomado. Lee la ref (`isHeld`), así que vale desde el mismo clic de
   *   confirmar, antes del render que pinta `busy`. Al terminar, la acción
   *   cierra la confirmación por su cuenta.
   */
  const guardClose = (id: number | null, close: () => void, extraBusy = false) => ({
    busy: extraBusy || isPending(id),
    onOpenChange: (open: boolean) => {
      if (open || isHeld(id)) return;
      close();
    },
  });

  return { acquire, release, isPending, isHeld, guardClose };
}

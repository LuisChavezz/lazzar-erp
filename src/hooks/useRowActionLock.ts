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

  return { acquire, release, isPending };
}

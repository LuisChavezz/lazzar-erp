"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDialogSession } from "./useDialogSession";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogMessages,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";

/** Confirmación abierta: el id y el `activo` que tenía el registro al abrirse. */
interface ToggleTarget {
  id: number;
  activo: boolean;
}

interface UseActivoToggleDialogArgs<T extends { id: number; activo: boolean }> {
  /** El listado COMPLETO (no la vista filtrada), contra el que se resuelve la fila. */
  rows: readonly T[];
  /** Ids con un cambio de `activo` en vuelo (`usePendingRecordIds`). */
  busyIds: number[];
  /** `isPending` de la mutación propia, que sigue pendiente hasta su `onSettled`. */
  isPending: boolean;
  /** Prefijo de la `key` del toast de aviso (`"bank"`, `"cost-center"`…). */
  resource: string;
  messages: Required<StaleRowDialogMessages>;
}

/**
 * Confirmación de activar/desactivar (o dar de baja/reactivar) de un catálogo
 * con baja lógica por `activo`, en ambos sentidos. Vive en la lista, nunca en la
 * celda: una celda se desmonta al ordenar, filtrar o paginar, y el cambio de
 * `activo` puede sacar la fila de la vista filtrada.
 *
 * - Guarda solo el id y el `activo` de la apertura, y resuelve la fila contra
 *   `rows` (el listado completo): el diálogo sobrevive a que la fila salga del
 *   filtro.
 * - `isBusy`: el "en vuelo" por fila de la caché o la mutación propia. Mientras
 *   dura, el aviso de obsoleto no aplica (el optimista ya invirtió `activo`) y
 *   el diálogo lo cierra el `onSettled` de la mutación con `close`.
 * - Vía rápida contra la caché: si un refetch muestra que el registro ya no
 *   existe o ya tiene otro `activo` que el de la apertura, el diálogo se cierra
 *   con un toast de aviso (`getStaleRowDialogNotice`). Ajuste en render; el
 *   toast sale de un efecto, porque en pleno render actualizaría otro
 *   componente (el Toaster).
 * - `snapshot`/`sessionId` (`useDialogSession`): la copia del registro al
 *   ABRIR, para que el texto no siga a los refetch ni al optimista y sobreviva a
 *   la animación de salida. Se toma DESPUÉS del aviso, igual que en `AreaList`.
 */
export function useActivoToggleDialog<T extends { id: number; activo: boolean }>({
  rows,
  busyIds,
  isPending,
  resource,
  messages,
}: UseActivoToggleDialogArgs<T>) {
  const [target, setTarget] = useState<ToggleTarget | null>(null);
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);

  const row = target !== null ? (rows.find((item) => item.id === target.id) ?? null) : null;
  const isBusy = target !== null && (busyIds.includes(target.id) || isPending);

  const stale = getStaleRowDialogNotice({
    resource,
    targetId: target?.id ?? null,
    target: row,
    expectedActivo: target?.activo ?? true,
    isBusy,
    messages,
  });
  if (stale) {
    setTarget(null);
    setStaleNotice(stale);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  const session = useDialogSession(target !== null, row);

  return {
    /** Abre la confirmación para la fila, con el `activo` que tiene ahora. */
    request: (item: T) => setTarget({ id: item.id, activo: item.activo }),
    close: () => setTarget(null),
    open: target !== null,
    snapshot: session.snapshot,
    sessionId: session.id,
    isBusy,
  };
}

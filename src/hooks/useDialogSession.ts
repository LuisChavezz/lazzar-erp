import { useState } from "react";

/**
 * "Sesión" de un diálogo controlado: lo que valía `snapshot` en el momento de
 * ABRIRLO, y un `id` que cambia en cada apertura.
 *
 * Resuelve dos cosas que un diálogo controlado necesita a la vez:
 *
 * - **Una copia al abrir.** El contenido trabaja con el registro tal como
 *   estaba al abrir, no con el que su dueño tenga en cada render: si el
 *   registro se relee a media captura (o su fila sale de la página), la base
 *   con la que un formulario calcula qué cambió no se mueve.
 * - **El contenido sobrevive al cierre.** Al cerrar, el dueño suele poner su
 *   registro en `null`, pero el diálogo sigue en pantalla durante su animación
 *   de salida: la copia conserva el último valor, así que el texto no se vacía
 *   mientras se cierra.
 *
 * `id` sirve de `key` para montar un contenido NUEVO en cada apertura, sin
 * depender de que el anterior haya terminado de desmontarse.
 *
 * ```tsx
 * const session = useDialogSession(open, recordToEdit);
 * <MainDialog open={open} …>
 *   <Form key={session.id} record={session.snapshot} />
 * </MainDialog>
 * ```
 *
 * La copia se toma SOLO en la transición cerrado → abierto: cambiar `snapshot`
 * con el diálogo ya abierto no la actualiza.
 */
export function useDialogSession<T>(open: boolean, snapshot: T): { id: number; snapshot: T } {
  const [session, setSession] = useState({ id: 0, snapshot });
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((current) => ({ id: current.id + 1, snapshot }));
  }
  return session;
}

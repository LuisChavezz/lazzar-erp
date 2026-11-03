/**
 * Orquestación de "preparar → confirmar → enviar" de un correo con PDF
 * adjunto, sin React, para que se pueda probar sola (`tests/unit/`). La usa
 * `useSendEmailConfirmation`, que es lo que consumen cotizaciones, facturas y
 * órdenes de compra.
 *
 * - `request(id)` prepara el correo de un registro. Si el registro ya tiene
 *   una acción en curso (`isBusy`), no hace nada: un doble clic no prepara dos
 *   veces. Solo abre la confirmación (`onPrepared`) si al terminar sigue siendo
 *   el ÚLTIMO pedido (`turn`) y es el registro que se pidió.
 * - `confirm(email)` envía el correo confirmado, salvo que el registro tenga
 *   otra acción en curso: entonces avisa (`onBusy`) en vez de no hacer nada.
 * - `invalidate()` descarta lo que se esté preparando (otra acción abrió su
 *   propio diálogo, o la vista cambió de registro).
 *
 * Los errores de `prepare` ya los avisa su mutación; aquí solo se descartan.
 */
import { isSameSnapshot } from "@/src/utils/sameSnapshot";

/**
 * Revalidación al ENVIAR (la confirmación pudo quedar abierta): si la lectura
 * fresca del registro ya no es igual a la foto con la que se preparó el correo,
 * se lanza `staleMessage` y no se envía —nunca sale una versión distinta de la
 * que el usuario confirmó—. Las guardas de negocio (cancelada, estatus,
 * importes) las aplica cada dominio antes de llamar aquí.
 */
export function assertEmailSnapshotUnchanged(
  current: unknown,
  prepared: unknown,
  staleMessage: string,
): void {
  if (!isSameSnapshot(current, prepared)) throw new Error(staleMessage);
}

export interface SendEmailFlowDeps<T extends { id: number }> {
  /** Turno del último pedido; vive fuera para sobrevivir entre llamadas. */
  turn: { current: number };
  isBusy: (id: number) => boolean;
  prepare: (id: number) => Promise<T>;
  send: (email: T) => void;
  onPrepared: (email: T) => void;
  onBusy: () => void;
}

export function createSendEmailFlow<T extends { id: number }>(deps: SendEmailFlowDeps<T>) {
  return {
    async request(id: number): Promise<void> {
      if (deps.isBusy(id)) return;
      const turn = ++deps.turn.current;
      let email: T;
      try {
        email = await deps.prepare(id);
      } catch {
        return;
      }
      if (turn !== deps.turn.current || email.id !== id) return;
      deps.onPrepared(email);
    },
    confirm(email: T): void {
      if (deps.isBusy(email.id)) {
        deps.onBusy();
        return;
      }
      deps.send(email);
    },
    invalidate(): void {
      deps.turn.current++;
    },
  };
}

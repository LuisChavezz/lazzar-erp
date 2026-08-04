import { errorToText } from "../hooks/useBrowserPrintDevices";

/** Resultado de intentar enviar UN ZPL a la impresora. */
export type SendZplResult =
  | { ok: true }
  | { ok: false; detail: string | null; timedOut: boolean };

/** Espera máxima por etiqueta antes de darla por no-confirmada. El SDK de
 *  Browser Print no pone timeout ni garantiza que se invoque alguno de sus dos
 *  callbacks (si el agente acepta la conexión y nunca responde, no llega nada),
 *  así que la espera la acota quien lo usa. Misma disciplina que el botón de
 *  reimpresión del historial. */
export const SEND_LABEL_TIMEOUT_MS = 15000;

/**
 * Envía UN ZPL a la impresora y resuelve (nunca rechaza) con el desenlace.
 *
 * Promisifica `device.send(zpl, success, error)` con un watchdog: gana el
 * PRIMERO en llegar —éxito, error o timeout— y los callbacks tardíos del SDK se
 * ignoran (un token local evita resolver dos veces). Así el bucle del lote
 * puede `await`-ear etiqueta por etiqueta con un desenlace determinista por cada
 * una, sin colgarse si el agente se queda mudo.
 *
 * El ZPL va TAL CUAL: el SDK lo serializa por dentro. No se escapa ni modifica.
 */
export function sendZplToDevice(
  device: BrowserPrintDevice,
  zpl: string,
  timeoutMs: number = SEND_LABEL_TIMEOUT_MS,
): Promise<SendZplResult> {
  return new Promise((resolve) => {
    if (typeof device.send !== "function") {
      resolve({
        ok: false,
        detail: "La impresora detectada no expone el método de envío del SDK.",
        timedOut: false,
      });
      return;
    }

    let settled = false;
    const finish = (result: SendZplResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      resolve(result);
    };

    const watchdog = setTimeout(
      () => finish({ ok: false, detail: null, timedOut: true }),
      timeoutMs,
    );

    device.send(
      zpl,
      () => finish({ ok: true }),
      (detail) => finish({ ok: false, detail: errorToText(detail), timedOut: false }),
    );
  });
}

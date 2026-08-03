/**
 * Tipos del SDK de Zebra Browser Print (`public/vendor/browser-print/`).
 *
 * No hay paquete npm ni tipos oficiales: los dos `.min.js` son scripts
 * globales clásicos (`var BrowserPrint = ...`) que se cargan con `next/script`
 * y quedan colgados de `window`. Por eso se declara `window.BrowserPrint` como
 * opcional — mientras el script no haya cargado (o si el navegador lo bloquea)
 * la propiedad sencillamente no existe, y el código que la usa tiene que
 * comprobarlo.
 *
 * Se declara SOLO la superficie que el frontend usa hoy (detección de
 * impresoras + envío de ZPL). El SDK expone más cosas —`convert()`, `read()`,
 * `sendFile()`…— que se irán agregando aquí cuando se implementen.
 */

// Sin `import`/`export` a propósito: este archivo es un script global, así que
// `Window` se fusiona con el del DOM directamente.
declare interface Window {
  BrowserPrint?: BrowserPrintApi;
}

/** Una impresora reportada por el agente local de Browser Print. Todos los
 *  campos vienen del JSON del agente, así que se tratan como opcionales. */
declare interface BrowserPrintDevice {
  name?: string;
  uid?: string;
  /** "network", "usb", "bluetooth"… — lo más cercano a la "dirección" del
   *  equipo que expone el agente (no hay campo de IP). */
  connection?: string;
  deviceType?: string;
  provider?: string;
  manufacturer?: string;
  /**
   * Envía datos crudos a la impresora (`POST 127.0.0.1:9100/write`). Para ZPL
   * la cadena va TAL CUAL: el SDK la mete en `JSON.stringify({device, data})`,
   * así que no hay que escapar ni codificar nada antes.
   *
   * - `success` recibe el cuerpo de la respuesta del agente (normalmente `""`).
   * - `error` recibe `xhr.response` — igual que en la detección, suele venir
   *   vacío cuando el agente no respondió.
   * - Si el navegador no puede ni crear el XHR, el SDK **no llama a ninguno de
   *   los dos callbacks**. Quien lo use tiene que acotar su propia espera.
   *
   * Es un método de la instancia `BrowserPrint.Device` y usa `this` por dentro:
   * hay que invocarlo como `device.send(...)`, no desestructurarlo.
   */
  send(
    data: string,
    success?: (response: string) => void,
    error?: (detail: unknown) => void
  ): void;
}

declare interface BrowserPrintApi {
  /**
   * Impresora predeterminada configurada en el sistema.
   *
   * Ojo con los tres desenlaces, porque la UI los distingue:
   * - `success(device)` → el agente respondió y hay predeterminada.
   * - `success(null)`   → el agente respondió pero NO hay predeterminada
   *                       (el SDK devuelve `null` cuando el cuerpo viene vacío).
   * - `error(detail)`   → no se pudo hablar con el agente (no instalado, no
   *                       corriendo, o bloqueado por el navegador). `detail`
   *                       es `xhr.response`, normalmente `""` en ese caso.
   */
  getDefaultDevice(
    type: string,
    success: (device: BrowserPrintDevice | null) => void,
    error?: (detail: unknown) => void
  ): void;
  /** Todas las impresoras locales. Con `type` definido el SDK ya filtra y
   *  entrega `[]` si no hay ninguna de ese tipo (agente vivo, cero equipos). */
  getLocalDevices(
    success: (devices: BrowserPrintDevice[]) => void,
    error: ((detail: unknown) => void) | undefined,
    type?: string
  ): void;
}

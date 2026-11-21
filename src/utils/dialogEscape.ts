/**
 * ¿El Escape salió de un `<select>` nativo? (EC-922)
 *
 * Radix escucha Escape en `document`, en fase de captura, y cierra el diálogo
 * entero (desmonta su contenido y se pierde lo capturado). Con la lista de un
 * `<select>` abierta, Firefox entrega ese Escape a la página además de cerrar
 * la lista. El `keydown` va al elemento enfocado, y el foco no sale del select
 * mientras su lista está abierta, así que en cualquier navegador que lo
 * entregue su `target` es el select: basta con mirar el `target` del evento
 * original que Radix pasa a `onEscapeKeyDown`. Con el select enfocado y la
 * lista cerrada, Escape tampoco cierra el diálogo; se cierra con Escape desde
 * otro campo, la X o "Cerrar".
 *
 * Se compara `tagName` y no `instanceof HTMLSelectElement` para no depender del
 * realm del elemento (y poder probarlo sin DOM).
 */
export const isEscapeFromSelect = (event: { target: EventTarget | null }): boolean => {
  const target = event.target as { tagName?: unknown } | null;
  return typeof target?.tagName === "string" && target.tagName.toUpperCase() === "SELECT";
};

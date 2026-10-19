/** Copia de la confirmación para descartar un lote impreso sin registrar. La
 *  comparten "Descartar e imprimir de nuevo" (paso de impresión) y el cierre del
 *  diálogo con un lote pendiente. */
export const DISCARD_PENDING_TITLE = "Descartar etiquetas sin registrar";
export const DISCARD_PENDING_DESCRIPTION =
  "Hay etiquetas impresas sin registrar. Si las descartas, sus EPCs se perderán.";

/** Variante para un lote que pudo haber quedado registrado (un intento anterior
 *  perdió la respuesta): ahí no es cierto que los EPCs se pierdan. */
export const DISCARD_POSSIBLY_REGISTERED_DESCRIPTION =
  "Es posible que este lote ya se haya registrado. Revisa el historial antes de descartarlo: si aparece ahí, no vuelvas a imprimir estas etiquetas.";

export const getDiscardPendingDescription = (possiblyRegistered: boolean) =>
  possiblyRegistered ? DISCARD_POSSIBLY_REGISTERED_DESCRIPTION : DISCARD_PENDING_DESCRIPTION;

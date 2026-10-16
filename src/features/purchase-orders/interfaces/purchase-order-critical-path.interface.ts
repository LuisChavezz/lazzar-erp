/**
 * Ruta crítica de UNA orden de compra (`GET|PATCH
 * /compras/ordenes/{id}/ruta-critica/`, backend PR #483). Es informativa: la
 * fecha en que compras supo que llegó la mercancía y un comentario. No toca la
 * OC, sus recepciones ni WMS; cada cambio real queda en la auditoría del
 * backend.
 *
 * GET y PATCH responden esta MISMA forma. No viene dentro del listado ni del
 * detalle de la OC, y no hay endpoint para varias OC a la vez. Una OC sin
 * captura responde los campos en `null` (el GET no escribe: el registro nace
 * con el primer PATCH que cambia algo).
 */
export interface PurchaseOrderCriticalPath {
  /** Solo lectura: sale de la URL. */
  oc_id: number;
  /** `DateField` "yyyy-mm-dd" o `null`. El backend acepta fechas futuras. */
  fecha_real_recibo: string | null;
  /** Hasta 2000 caracteres; el backend lo recorta y guarda `""` como `null`. */
  comentarios: string | null;
  /** Solo lectura. `null` mientras nadie haya capturado. */
  updated_at: string | null;
}

/**
 * Cuerpo del PATCH (parcial): solo los campos que cambiaron. Cualquier otra
 * llave el backend la ignora en silencio y responde 200, por eso no se tipa.
 */
export type PurchaseOrderCriticalPathUpdateBody = Partial<
  Pick<PurchaseOrderCriticalPath, "fecha_real_recibo" | "comentarios">
>;

/** OC sobre la que se abre el diálogo. Folio y estatus vienen de quien abre: la respuesta no los trae. */
export interface PurchaseOrderCriticalPathTarget {
  ocId: number;
  folio: string | null;
  estatus: number;
}

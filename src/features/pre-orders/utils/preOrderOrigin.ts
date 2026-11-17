import type { PreOrderListItem } from "../interfaces/pre-order.interface";

type OriginFields = Pick<PreOrderListItem, "id" | "origen" | "referencia" | "pedido" | "pedido_folio">;

/** Un resurtido de stock no tiene pedido (`pedido` en `null`). */
export const isResurtido = (p: Pick<OriginFields, "origen" | "pedido">): boolean =>
  p.origen === "resurtido" || p.pedido === null;

/**
 * Lo que identifica a la pre-orden ante el usuario: la `referencia` del
 * backend (`P-…` o `"Resurtido · SKU"`), con respaldo para respuestas viejas.
 */
export const preOrderReference = (p: OriginFields): string =>
  p.referencia ||
  p.pedido_folio ||
  (p.pedido !== null ? `#${p.pedido}` : `Resurtido #${p.id}`);

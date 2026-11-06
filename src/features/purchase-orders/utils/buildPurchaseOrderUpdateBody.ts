import type { PurchaseOrderDetalleItem } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrder, UpdatePurchaseOrderBody } from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditHeader } from "../schemas/purchase-order-edit.schema";
import { almacenPutPatch } from "./purchaseOrderDelivery";

/**
 * Body del `PUT /compras/ordenes/{pk}/`: encabezado del Step 1 + renglones.
 *
 * - `pedidos` va SIEMPRE (reemplaza la lista completa); el campo legado
 *   `pedido` nunca se manda.
 * - `tipo_compra` solo sin folio (`isTipoCompraLocked`).
 * - `almacen` solo si cambió respecto de `loaded` (EC-796; `null` = lo quitó
 *   el usuario o un cambio de sucursal): reenviar uno que quedó inactivo haría
 *   que el backend rechazara el PUT completo. `loaded` debe ser la FOTO fresca
 *   del detalle con la que se sembró el Step 1, no la fila del listado (puede
 *   tener hasta 15 min de caché): contra una fila vieja, un almacén sin
 *   cambios parecería cambiado y se reenviaría.
 */
export const buildPurchaseOrderUpdateBody = ({
  header,
  loaded,
  isTipoCompraLocked,
  detalles,
}: {
  header: PurchaseOrderEditHeader;
  loaded: Pick<PurchaseOrder, "almacen">;
  isTipoCompraLocked: boolean;
  detalles: PurchaseOrderDetalleItem[];
}): UpdatePurchaseOrderBody => {
  const { tipo_compra, almacen, ...headerRest } = header;
  const headerWithoutTipo = {
    ...headerRest,
    ...almacenPutPatch(almacen, loaded.almacen),
  };
  return isTipoCompraLocked
    ? { ...headerWithoutTipo, detalles }
    : { ...headerWithoutTipo, tipo_compra, detalles };
};

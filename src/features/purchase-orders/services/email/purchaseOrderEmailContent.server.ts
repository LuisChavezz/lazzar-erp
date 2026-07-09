/**
 * Construcción del contenido del correo de una orden de compra.
 * Aquí solo se define cómo obtener asunto, HTML y texto plano a partir del
 * detalle de la orden. El envío real ocurre en otra capa (Gmail).
 */
import { createElement } from "react";
import { render, toPlainText } from "@react-email/render";
import PurchaseOrderEmail from "@/src/emails/PurchaseOrderEmail";
import type { PurchaseOrderDetail } from "../../interfaces/purchase-order.interface";

/**
 * Resuelve el nombre del proveedor para usarlo en asunto y contenido.
 */
const getSupplierName = (order: PurchaseOrderDetail) =>
  order.proveedor_nombre || `proveedor ${order.proveedor}`;

/**
 * Construye el asunto del correo a partir del folio y el nombre del proveedor.
 */
export const buildPurchaseOrderEmailSubject = (order: PurchaseOrderDetail) =>
  `Orden de compra ${order.folio} - ${getSupplierName(order)}`;

/**
 * Renderiza la plantilla React Email a HTML y genera su equivalente en texto
 * plano para compatibilidad con clientes que prefieren texto sin formato.
 */
export const buildPurchaseOrderEmailContent = async (order: PurchaseOrderDetail) => {
  const html = await render(createElement(PurchaseOrderEmail, { order }));

  return {
    html,
    text: toPlainText(html),
  };
};

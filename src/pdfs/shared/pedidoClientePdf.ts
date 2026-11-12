/**
 * Cliente del pedido madre en los PDF de las órdenes de producción, bordado,
 * reflejante y corte de manga (EC-857). Módulo puro, sin `@react-pdf/renderer`.
 *
 * El dato es `pedido_vinculado.cliente` (o `pedidos[].cliente` en la OP), que
 * el backend arma en bloque (EC-880). Se muestra tal cual: nombre, razón social
 * y RFC, con "—" para un dato vacío, igual que el bloque de cliente del PDF del
 * pedido.
 */
import type { PedidoVinculadoCliente } from "@/src/features/orders/interfaces/pedido-vinculado.interface";
import { textOrDash } from "@/src/utils/textOrDash";
import type { PdfInfoItem } from "./DocumentPdfLayout";

/** Rótulo corto (subtítulo y pie): razón social, o el nombre; `null` sin ninguno. */
export const pedidoClienteLabel = (cliente: PedidoVinculadoCliente | null | undefined): string | null =>
  cliente?.razon_social?.trim() || cliente?.nombre?.trim() || null;

/** Renglones de la tarjeta "CLIENTE". Un pedido sin cliente sale con guiones. */
export const pedidoClienteItems = (cliente: PedidoVinculadoCliente | null | undefined): PdfInfoItem[] => [
  { label: "Cliente", value: textOrDash(cliente?.nombre) },
  { label: "Razón social", value: textOrDash(cliente?.razon_social) },
  { label: "RFC", value: textOrDash(cliente?.rfc) },
];

import type React from "react";
import { EmbroideryOrderDetailDialog } from "@/src/features/embroidery/components/EmbroideryOrderDetailDialog";
import { ReflectiveOrderDetailDialog } from "@/src/features/reflective-orders/components/ReflectiveOrderDetailDialog";
import { CorteMangaOrderDetailByIdDialog } from "@/src/features/corte-manga/components/CorteMangaOrderDetailByIdDialog";
import { ProductionOrderDetailByIdDialog } from "@/src/features/production-orders/components/ProductionOrderDetailByIdDialog";
import { PickingDetailByIdDialog } from "@/src/features/picking/components/PickingDetailByIdDialog";
import { PackingDetailByIdDialog } from "@/src/features/packing/components/PackingDetailByIdDialog";
import { PurchaseOrderDetailDialog } from "@/src/features/purchase-orders/components/PurchaseOrderDetailDialog";
import { QuoteDetailByIdDialog } from "@/src/features/quotes/components/QuoteDetailByIdDialog";
import { StockMovementDetailByIdDialog } from "@/src/features/stock-movements/components/StockMovementDetailByIdDialog";
import { invoiceDetailHref, invoiceDetailPath } from "@/src/features/invoicing/constants/invoiceDetailOrigins";

/**
 * Llave del registro que abre el detalle de un picking. La usan DOS tablas de
 * la hoja de Avances: "Documentos relacionados" (donde llega como `doc.tipo`
 * del backend) y "Folios de surtido" (donde la ponemos nosotros para reusar el
 * mismo diálogo sin inventar una ruta). Debe coincidir con el `tipo` que emite
 * el backend.
 */
export const PICKING_DOC_TIPO = "picking";

/** Llave del registro para el detalle de un packing (= `doc.tipo`). */
export const PACKING_DOC_TIPO = "packing";

/** Documento a abrir: el `tipo` elige el diálogo y el `id` es el del documento. */
export interface OpenOrderDocument {
  tipo: string;
  id: number;
}

/**
 * Registro de tipos de documento con detalle navegable desde el pedido. La
 * llave es el `doc.tipo`; el valor, el diálogo que lo abre. Todos comparten la
 * MISMA firma (`{ orderId, open, onOpenChange }`) y se auto-abastecen del
 * detalle por id (= `doc.id`), así que se montan de forma uniforme. Un tipo
 * ausente del registro queda como texto estático.
 *
 * Mover estos diálogos de hoja no abre acceso a nada nuevo: son los mismos
 * tipos que ya eran navegables, y la regla `/orders` sigue siendo el único
 * control de acceso (ver `routePermissions`).
 */
type DocDetailDialog = React.ComponentType<{
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

export const ORDER_DOCUMENT_DIALOGS: Record<string, DocDetailDialog> = {
  orden_bordado: EmbroideryOrderDetailDialog,
  orden_reflejante: ReflectiveOrderDetailDialog,
  // Corte de manga no se auto-abastece por id de fábrica (su diálogo recibe el
  // objeto ya resuelto); `CorteMangaOrderDetailByIdDialog` es el wrapper que le
  // da la firma por id que este registro exige.
  orden_corte_manga: CorteMangaOrderDetailByIdDialog,
  // Producción sí es self-fetching, pero con prop `opId` no-nullable;
  // `ProductionOrderDetailByIdDialog` solo adapta la firma (sin action/hook).
  orden_produccion: ProductionOrderDetailByIdDialog,
  // Picking recibe la fila YA enriquecida (`PickingRow`) y no acepta null;
  // `PickingDetailByIdDialog` fetchea por id, enriquece y maneja loading/error.
  [PICKING_DOC_TIPO]: PickingDetailByIdDialog,
  // Packing es como picking pero sin enriquecimiento; el wrapper fetchea por id
  // y maneja loading/error (el diálogo no acepta null ni los tiene).
  [PACKING_DOC_TIPO]: PackingDetailByIdDialog,
  // Orden de compra encaja directo: ya es self-fetching por id y su firma es
  // exactamente la del registro (`{ orderId, open, onOpenChange }`).
  orden_compra: PurchaseOrderDetailDialog,
  // Cotización: `QuoteDetails` es contenido self-fetching (no un diálogo);
  // `QuoteDetailByIdDialog` solo lo envuelve en un MainDialog (sin action/hook).
  cotizacion: QuoteDetailByIdDialog,
  // La factura NO está aquí: tiene página propia (ver `ORDER_DOCUMENT_ROUTES`).
  // Movimiento de inventario sí es self-fetching, pero con prop `movementId`
  // no-nullable; `StockMovementDetailByIdDialog` solo adapta la firma.
  movimiento_inventario: StockMovementDetailByIdDialog,
};

/**
 * ¿`tipo` tiene diálogo de detalle registrado? `Object.hasOwn` (no `in` ni
 * indexado directo) para que un `tipo` como `constructor`/`toString` no resuelva
 * a una función heredada de `Object.prototype`. Quien monta el diálogo indexa
 * `ORDER_DOCUMENT_DIALOGS` tras esta comprobación.
 */
export function hasOrderDocumentDialog(tipo: string): boolean {
  return Object.hasOwn(ORDER_DOCUMENT_DIALOGS, tipo);
}

/**
 * Tipos de documento que se abren en su PÁGINA de detalle en vez de un diálogo.
 * `path` es la ruta que evalúa el proxy (para ofrecer el enlace solo a quien
 * puede abrirla); `href`, la URL con el origen para su "Volver".
 *
 * A diferencia de los diálogos de arriba —que la regla `/orders` deja abrir a
 * cualquiera que vea el pedido, porque el backend no filtra ese detalle por
 * permiso—, una página tiene su propia regla en `routePermissions` y el enlace
 * respeta esa regla: sin permiso, el documento queda como texto.
 */
interface OrderDocumentRoute {
  path: (docId: number) => string;
  href: (docId: number, pedidoId: number) => string;
}

export const ORDER_DOCUMENT_ROUTES: Record<string, OrderDocumentRoute> = {
  factura: {
    path: invoiceDetailPath,
    href: (docId, pedidoId) => invoiceDetailHref(docId, "order", { pedido: pedidoId }),
  },
};

/** Ruta de detalle de `tipo`, o `null`. `Object.hasOwn` por el mismo motivo que arriba. */
export function getOrderDocumentRoute(tipo: string): OrderDocumentRoute | null {
  return Object.hasOwn(ORDER_DOCUMENT_ROUTES, tipo) ? ORDER_DOCUMENT_ROUTES[tipo] : null;
}

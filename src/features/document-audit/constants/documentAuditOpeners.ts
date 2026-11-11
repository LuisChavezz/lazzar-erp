import { invoiceDetailHref, invoiceDetailPath } from "@/src/features/invoicing/constants/invoiceDetailOrigins";
import {
  pedidoDetailHref,
  pedidoDetailPath,
} from "@/src/features/orders/constants/pedidoDetailOrigins";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import type { BitacoraDocumento, TipoDocumento } from "../interfaces/document-audit.interface";
import { isTipoDocumento } from "./documentAuditValues";

/**
 * Cómo se abre el documento de un evento, según su `tipo_documento`.
 *
 * - `route`: página de detalle por id. `path` es la ruta que evalúa el proxy
 *   (sin query); `href`, el enlace real.
 * - `dialog`: diálogo de detalle que se abastece solo por id (los monta la
 *   vista, ver `documentAuditDialogs`). Un diálogo no tiene regla de ruta
 *   propia, así que se ofrece solo a quien puede abrir la pantalla donde ese
 *   diálogo vive hoy (`gatePath`): es el mismo criterio de acceso que ya tiene
 *   el usuario para llegar a él.
 *
 * Por qué un registro propio y no `ORDER_DOCUMENT_DIALOGS` / `SEARCH_APERTURA`:
 * el primero es de los documentos de UN pedido (su firma exige `pedidoId`, sus
 * diálogos los ampara la regla `/orders` y abre como diálogo lo que aquí tiene
 * página), y el segundo cubre solo las entidades del buscador (sin OC, OP ni
 * diálogos, y con `?from=home`). Se reusan sus piezas —los diálogos por id y los
 * helpers de URL de cada módulo—, no el mapa.
 *
 * Los cinco tipos ausentes (factura de proveedor, cobro, pago, póliza, ajuste
 * de inventario) no tienen hoy detalle por id: su folio queda como texto.
 */
export type DocumentAuditOpener =
  | { kind: "route"; path: (id: number) => string; href: (id: number) => string }
  | { kind: "dialog"; gatePath: string };

export const DOCUMENT_AUDIT_OPENERS: Partial<Record<TipoDocumento, DocumentAuditOpener>> = {
  pedido: {
    kind: "route",
    path: pedidoDetailPath,
    // Origen propio: el "Volver" del pedido regresa a la bitácora.
    href: (id) => pedidoDetailHref(id, "document-audit"),
  },
  orden_compra: {
    kind: "route",
    path: (id) => purchaseOrderDetailHref(id),
    href: (id) => purchaseOrderDetailHref(id),
  },
  orden_produccion: {
    kind: "route",
    path: (id) => `/manufacturing/production-orders/${id}`,
    href: (id) => `/manufacturing/production-orders/${id}`,
  },
  orden_bordado: {
    kind: "route",
    path: (id) => `/manufacturing/embroidery/${id}`,
    href: (id) => `/manufacturing/embroidery/${id}`,
  },
  orden_reflejante: {
    kind: "route",
    path: (id) => `/manufacturing/reflective-orders/${id}`,
    href: (id) => `/manufacturing/reflective-orders/${id}`,
  },
  orden_corte_manga: {
    kind: "route",
    path: (id) => `/manufacturing/corte-manga/${id}`,
    href: (id) => `/manufacturing/corte-manga/${id}`,
  },
  factura: { kind: "route", path: invoiceDetailPath, href: (id) => invoiceDetailHref(id) },
  // Diálogos: `gatePath` es el listado del que se abren hoy.
  picking: { kind: "dialog", gatePath: "/wms/picking" },
  packing: { kind: "dialog", gatePath: "/wms/packing" },
  // Recepciones de ambos orígenes (OC y OP): las muestra la vista de WMS.
  recepcion: { kind: "dialog", gatePath: "/wms/receipts" },
  // Transferencias y movimientos son subvistas de Configuración.
  transferencia: { kind: "dialog", gatePath: "/config" },
  movimiento_inventario: { kind: "dialog", gatePath: "/config" },
};

/** Documento que se puede abrir desde un evento: su tipo, su id y cómo. */
export interface DocumentAuditTarget {
  tipo: TipoDocumento;
  id: number;
  opener: DocumentAuditOpener;
}

/**
 * Destino del evento, o `null` si se pinta como texto: tipo sin detalle por
 * id, id no numérico, evento de BORRADO (el documento ya no existe) o destino
 * al que el usuario no puede llegar.
 */
export const resolveDocumentAuditTarget = (
  event: Pick<BitacoraDocumento, "tipo_documento" | "documento_id" | "accion">,
  user: PermissionContext | null | undefined,
): DocumentAuditTarget | null => {
  if (event.accion === "eliminar") return null;
  if (!isTipoDocumento(event.tipo_documento)) return null;
  const opener = DOCUMENT_AUDIT_OPENERS[event.tipo_documento];
  const id = parsePositiveId(event.documento_id);
  if (!opener || id === null) return null;
  const gate = opener.kind === "route" ? opener.path(id) : opener.gatePath;
  if (!canAccessRoute(gate, user)) return null;
  return { tipo: event.tipo_documento, id, opener };
};

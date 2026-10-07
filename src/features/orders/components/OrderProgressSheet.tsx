import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { getPedidoEstatusConfig } from "../constants/pedidoStatus";
import type { PedidoDetail } from "../interfaces/order.interface";
import { OrderDocumentsSection } from "./OrderDocumentsSection";
import { OrderPickingBySizeSection } from "./OrderPickingBySizeSection";
import { OrderPickingFoliosSection } from "./OrderPickingFoliosSection";
import { OrderPickingProgressSection } from "./OrderPickingProgressSection";
import { OrderBadge } from "./OrderSheetPrimitives";
import type { OpenOrderDocument } from "./orderDocumentDialogs";

interface OrderProgressSheetProps {
  pedido: PedidoDetail;
  /** Abre un documento (o un folio de surtido) en su diálogo de detalle. */
  onOpenDoc: (doc: OpenOrderDocument) => void;
}

/**
 * Hoja 2, "Avances": el estado operativo del pedido — avance de surtido
 * general, surtido por línea y talla, folios de surtido y documentos
 * relacionados. Los diálogos de detalle NO viven aquí: los monta la página
 * (estado por encima de las hojas), para que cambiar de hoja nunca deje uno
 * huérfano ni abierto donde no corresponde.
 */
export function OrderProgressSheet({ pedido, onOpenDoc }: OrderProgressSheetProps) {
  const folios = pedido.folios_picking ?? [];
  return (
    <div className="space-y-6">
      {/* Identidad mínima: esta hoja no repite "Información Comercial". */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-medium text-slate-900 dark:text-white">
          Avances del pedido{" "}
          <span className="font-mono">{pedido.folio || `#${pedido.id}`}</span>
        </h1>
        <OrderBadge config={getPedidoEstatusConfig(pedido.estatus)} />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {textOrDash(pedido.cliente_razon_social || pedido.cliente_nombre)}
        </span>
      </div>

      <OrderPickingProgressSection tracker={pedido.tracker_picking} />
      <OrderPickingBySizeSection detalles={pedido.detalles} />
      <OrderPickingFoliosSection folios={folios} onOpenFolio={onOpenDoc} />
      <OrderDocumentsSection
        pedidoId={pedido.id}
        documentos={pedido.documentos ?? []}
        foliosPicking={folios}
        onOpenDoc={onOpenDoc}
      />
    </div>
  );
}

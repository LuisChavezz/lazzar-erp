"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { formatShortDate } from "@/src/utils/formatDate";
import { usePurchaseOrder } from "@/src/features/purchase-orders/hooks/usePurchaseOrder";
import type { PurchaseOrderReceipt } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { recepcionesFacturables } from "../utils/receptionLineOptions";

interface ReceptionSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** OC ya elegida. El diálogo no debería abrirse con `0`. */
  ocId: number;
  /** Id de la recepción ya elegida (`0` = ninguna). */
  selectedRecepcionId: number;
  onConfirm: (recepcion: PurchaseOrderReceipt) => void;
}

function ReceptionSelectorContent({
  ocId,
  selectedRecepcionId,
  onConfirm,
  onCancel,
}: {
  ocId: number;
  selectedRecepcionId: number;
  onConfirm: (recepcion: PurchaseOrderReceipt) => void;
  onCancel: () => void;
}) {
  // Retrieve de la OC: trae en UNA consulta `detalles[]` y `recepciones[]` (con
  // sus partidas). La llave `["purchase-orders", id]` es la misma que usa el
  // selector de partidas, así que el siguiente paso no vuelve a pedirla.
  const { purchaseOrder, isLoading, isError } = usePurchaseOrder(ocId > 0 ? ocId : null);
  const { facturables: recepciones, excluidasPorOrigen } = purchaseOrder
    ? recepcionesFacturables(purchaseOrder)
    : { facturables: [], excluidasPorOrigen: 0 };

  // Mismo patrón que el selector de partidas: lo excluido se CUENTA en el
  // subtítulo con su motivo, en vez de desaparecer en silencio.
  const aviso =
    excluidasPorOrigen > 0
      ? ` ${excluidasPorOrigen} ${excluidasPorOrigen === 1 ? "recepción se excluyó por ser" : "recepciones se excluyeron por ser"} de origen producción: no ${excluidasPorOrigen === 1 ? "está ligada" : "están ligadas"} a la orden de compra.`
      : "";

  return (
    <SingleSelectPickerDialogContent<PurchaseOrderReceipt>
      title="Seleccionar Recepción"
      subtitle={`Una factura cubre UNA recepción de la orden de compra.${aviso}`}
      statusColor="indigo"
      items={recepciones}
      isLoading={isLoading}
      isError={isError}
      loadingTitle="Cargando recepciones"
      loadingMessage="Obteniendo las recepciones de la orden de compra..."
      errorMessage="Error al cargar las recepciones de la orden de compra."
      searchPlaceholder="Buscar por folio, remisión o almacén..."
      filterPredicate={(recepcion, term) =>
        `${recepcion.folio} ${recepcion.remision ?? ""} ${recepcion.almacen_nombre}`
          .toLowerCase()
          .includes(term)
      }
      getKey={(recepcion) => recepcion.id}
      selectedKey={selectedRecepcionId > 0 ? selectedRecepcionId : null}
      emptyMessage={
        excluidasPorOrigen > 0
          ? "Esta orden de compra no tiene recepciones facturables: todas son de origen producción."
          : "Esta orden de compra no tiene recepciones registradas: no hay mercancía recibida que facturar."
      }
      noResultsMessage="No se encontraron recepciones"
      renderContent={(recepcion) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {recepcion.folio}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {recepcion.almacen_nombre}
              {recepcion.remision ? ` · Remisión ${recepcion.remision}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
            <p>{recepcion.estatus_label}</p>
            <p>
              {/* `fecha_recepcion` es un datetime ISO: sin `timeZone` fija, se
                  pinta en la zona del usuario, que es lo correcto para un instante. */}
              {formatShortDate(recepcion.fecha_recepcion)} · {recepcion.detalles.length}{" "}
              {recepcion.detalles.length === 1 ? "partida" : "partidas"}
            </p>
          </div>
        </div>
      )}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/**
 * ReceptionSelectorDialog — nivel 2 del selector de la factura.
 *
 * Recepciones de la OC elegida, leídas de su retrieve y filtradas a origen `OC`
 * (ver `recepcionesFacturables`).
 */
export function ReceptionSelectorDialog({
  open,
  onOpenChange,
  ocId,
  selectedRecepcionId,
  onConfirm,
}: ReceptionSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="640px"
      showCloseButton={false}
    >
      {open && (
        <ReceptionSelectorContent
          ocId={ocId}
          selectedRecepcionId={selectedRecepcionId}
          onConfirm={(recepcion) => {
            onConfirm(recepcion);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}

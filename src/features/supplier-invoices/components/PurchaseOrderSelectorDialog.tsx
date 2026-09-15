"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import { formatShortDate } from "@/src/utils/formatDate";
import { usePurchaseOrders } from "@/src/features/purchase-orders/hooks/usePurchaseOrders";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";

interface PurchaseOrderSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id de la OC ya elegida (`0` = ninguna), para resaltarla al abrir. */
  selectedOcId: number;
  /** Se invoca con la OC elegida (objeto completo del listado). */
  onConfirm: (oc: PurchaseOrder) => void;
}

/**
 * Contenido con el hook de datos — se monta solo mientras el diálogo está
 * abierto, así que el listado de OC se pide bajo demanda. Mismo reparto que
 * `InvoiceSelectorDialog` en notas de crédito.
 */
function PurchaseOrderSelectorContent({
  selectedOcId,
  onConfirm,
  onCancel,
}: {
  selectedOcId: number;
  onConfirm: (oc: PurchaseOrder) => void;
  onCancel: () => void;
}) {
  const { purchaseOrders, isLoading, isError } = usePurchaseOrders();

  // `GET /compras/ordenes/` es plano y no acepta filtros: se filtra en memoria.
  // Fuera las inactivas y las que no tienen proveedor (el FK es `SET_NULL`): una
  // factura de proveedor sin proveedor no puede generar su cuenta por pagar.
  // No se puede filtrar aquí por "tiene recepciones": el listado no las trae; el
  // siguiente paso lo dice si la OC elegida no tiene ninguna.
  const disponibles = purchaseOrders.filter((oc) => oc.activo && Boolean(oc.proveedor));

  return (
    <SingleSelectPickerDialogContent<PurchaseOrder>
      title="Seleccionar Orden de Compra"
      subtitle="La factura toma el proveedor, la moneda y la sucursal de la orden elegida"
      statusColor="indigo"
      items={disponibles}
      isLoading={isLoading}
      isError={isError}
      loadingTitle="Cargando órdenes de compra"
      loadingMessage="Obteniendo las órdenes de compra..."
      errorMessage="Error al cargar las órdenes de compra."
      searchPlaceholder="Buscar por folio, proveedor o referencia..."
      filterPredicate={(oc, term) =>
        `${oc.folio ?? ""} ${oc.proveedor_nombre ?? ""} ${oc.referencia ?? ""}`
          .toLowerCase()
          .includes(term)
      }
      getKey={(oc) => oc.id}
      selectedKey={selectedOcId > 0 ? selectedOcId : null}
      emptyMessage="No hay órdenes de compra activas con proveedor."
      noResultsMessage="No se encontraron órdenes de compra"
      renderContent={(oc) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {oc.folio ?? `OC #${oc.id}`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {oc.proveedor_nombre ?? "—"}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
            <p>{oc.estatus_label}</p>
            <p>
              {/* `fecha_oc` es fecha-calendario: `timeZone: "UTC"` evita pintar
                  el día anterior al oeste de Greenwich. */}
              {formatShortDate(oc.fecha_oc, { timeZone: "UTC" })} · {oc.moneda_codigo}
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
 * PurchaseOrderSelectorDialog — nivel 1 del selector de la factura.
 *
 * Selector ÚNICO de la orden de compra, apilado encima del formulario (que
 * permanece montado detrás). Entrega la OC completa del LISTADO: de ella salen
 * proveedor, moneda, sucursal y —si el rol lo deja ver— la tasa de IVA. Los
 * renglones y las recepciones vienen después, del retrieve de la OC.
 */
export function PurchaseOrderSelectorDialog({
  open,
  onOpenChange,
  selectedOcId,
  onConfirm,
}: PurchaseOrderSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="640px"
      showCloseButton={false}
    >
      {open && (
        <PurchaseOrderSelectorContent
          selectedOcId={selectedOcId}
          onConfirm={(oc) => {
            onConfirm(oc);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}

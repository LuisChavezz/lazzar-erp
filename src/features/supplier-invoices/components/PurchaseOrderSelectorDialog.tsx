"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { formatShortDate } from "@/src/utils/formatDate";
import { usePurchaseOrderSearchField } from "@/src/features/purchase-orders/hooks/usePurchaseOrderSearch";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { PURCHASE_ORDER_STATUS } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { purchaseOrderEstatusParamExcept } from "@/src/features/purchase-orders/utils/purchaseOrderSearchParams";

/**
 * Lo que el formulario ya sabe de la OC elegida: basta para fijarla arriba del
 * selector aunque la búsqueda no la traiga (issue #262).
 */
export interface SelectedPurchaseOrderSummary {
  id: number;
  folio: string;
  proveedorNombre: string;
}

interface PurchaseOrderSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** OC ya elegida (`null` = ninguna), fija arriba y resaltada al abrir. */
  selectedOc: SelectedPurchaseOrderSummary | null;
  /** Se invoca con la OC elegida (objeto completo del listado). */
  onConfirm: (oc: PurchaseOrder) => void;
}

/**
 * OC que respaldan una factura de proveedor: no canceladas y con proveedor (el
 * FK es `SET_NULL`; sin él no se puede generar la cuenta por pagar). Las
 * inactivas ya las excluye el backend. No se puede filtrar por "tiene
 * recepciones": el listado no las trae; el siguiente paso lo dice.
 */
const SELECTABLE_ESTATUS = purchaseOrderEstatusParamExcept([PURCHASE_ORDER_STATUS.CANCELADA]);

/** Una fila del selector: una OC de la búsqueda, o la ya elegida tal como la guardó el formulario. */
type OcOption =
  | { kind: "result"; oc: PurchaseOrder }
  | { kind: "current"; summary: SelectedPurchaseOrderSummary };

const optionId = (option: OcOption) => (option.kind === "result" ? option.oc.id : option.summary.id);

/**
 * Contenido con la búsqueda — se monta solo mientras el diálogo está abierto,
 * así que `GET /compras/ordenes/?search=&estatus=&con_proveedor=true&limit=`
 * corre bajo demanda. La selección es *tentativa* hasta "Confirmar selección".
 */
function PurchaseOrderSelectorContent({
  selectedOc,
  onConfirm,
  onCancel,
}: {
  selectedOc: SelectedPurchaseOrderSummary | null;
  onConfirm: (oc: PurchaseOrder) => void;
  onCancel: () => void;
}) {
  const [tentative, setTentative] = useState<OcOption | null>(
    selectedOc ? { kind: "current", summary: selectedOc } : null,
  );
  const { search, setSearch, isSearching, purchaseOrders, total, hasResults, isInitialError, refetch } =
    usePurchaseOrderSearchField({ estatus: SELECTABLE_ESTATUS, conProveedor: true });
  const results: OcOption[] = purchaseOrders.map((oc) => ({ kind: "result", oc }));

  return (
    <>
      <DialogHeader
        title="Seleccionar Orden de Compra"
        subtitle="La factura toma el proveedor, la moneda y la sucursal de la orden elegida"
        statusColor="indigo"
      />

      <ServerSearchSelectList<OcOption>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por folio, proveedor o referencia..."
        results={results}
        pinned={tentative ? [tentative] : []}
        getKey={optionId}
        isSelected={(option) => optionId(option) === (tentative ? optionId(tentative) : null)}
        onSelect={setTentative}
        renderIndicator={renderRadioIndicator}
        renderContent={(option) =>
          option.kind === "current" ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {option.summary.folio}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {option.summary.proveedorNombre || "—"} · Elegida
              </p>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {option.oc.folio ?? `OC #${option.oc.id}`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {option.oc.proveedor_nombre ?? "—"}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">
                <p>{option.oc.estatus_label}</p>
                <p>
                  {/* `fecha_oc` es fecha-calendario: `timeZone: "UTC"` evita pintar
                      el día anterior al oeste de Greenwich. */}
                  {formatShortDate(option.oc.fecha_oc, { timeZone: "UTC" })} ·{" "}
                  {option.oc.moneda_codigo}
                </p>
              </div>
            </div>
          )
        }
        hasResults={hasResults}
        isInitialError={isInitialError}
        isSearching={isSearching}
        onRetry={() => void refetch()}
        total={total}
        emptyMessage="No hay órdenes de compra no canceladas y con proveedor."
        noResultsMessage="No se encontraron órdenes de compra"
        errorMessage="Error al buscar las órdenes de compra."
      />

      <div className="flex items-center justify-end gap-3 pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (!tentative) return;
            // La ya elegida no es un cambio: el formulario la conserva tal cual.
            if (tentative.kind === "current") onCancel();
            else onConfirm(tentative.oc);
          }}
          disabled={tentative === null}
        >
          Confirmar selección
        </Button>
      </div>
    </>
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
  selectedOc,
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
          selectedOc={selectedOc}
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

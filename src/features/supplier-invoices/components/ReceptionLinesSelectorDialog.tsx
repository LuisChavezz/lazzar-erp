"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { MultiSelectPickerDialogContent } from "@/src/components/MultiSelectPickerDialogContent";
import { formatExactQuantityValue, formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { usePurchaseOrder } from "@/src/features/purchase-orders/hooks/usePurchaseOrder";
import { unitsToQty } from "../schemas/supplier-invoice.schema";
import {
  sumarFacturadoPorRecepcionDetalle,
  useSupplierInvoicesByRecepcion,
} from "../hooks/useSupplierInvoicesByRecepcion";
import {
  buildReceptionLineOptions,
  type ReceptionLineOption,
} from "../utils/receptionLineOptions";

interface ReceptionLinesSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocId: number;
  recepcionId: number;
  /** Código ISO de la moneda de la OC, para formatear precios. */
  monedaCodigo: string;
  /** `recepcion_detalle` que la factura ya tiene: se excluyen de la lista. */
  alreadySelectedIds: number[];
  onConfirm: (options: ReceptionLineOption[]) => void;
}

function ReceptionLinesSelectorContent({
  ocId,
  recepcionId,
  monedaCodigo,
  alreadySelectedIds,
  onConfirm,
  onCancel,
}: Omit<ReceptionLinesSelectorDialogProps, "open" | "onOpenChange"> & {
  onCancel: () => void;
}) {
  const oc = usePurchaseOrder(ocId > 0 ? ocId : null);
  // Lo ya facturado de esta recepción, para el tope de doble facturación. Es un
  // bloqueo SUAVE: ver `useSupplierInvoicesByRecepcion`.
  const facturas = useSupplierInvoicesByRecepcion(recepcionId);

  const isLoading = oc.isLoading || facturas.isLoading;
  // Si la consulta de facturas falla NO se ofrece nada: sin ella el tope sería
  // "todo lo recibido", y eso es justamente la doble facturación que se quiere
  // evitar. Mejor un error visible que un tope falso.
  const isError = oc.isError || facturas.isError;

  const recepcion = oc.purchaseOrder?.recepciones.find((r) => r.id === recepcionId);
  const opciones =
    oc.purchaseOrder && recepcion
      ? buildReceptionLineOptions(
          oc.purchaseOrder,
          recepcion,
          sumarFacturadoPorRecepcionDetalle(facturas.facturas),
        )
      : { disponibles: [], agotadas: 0, noVinculables: 0 };

  const items = opciones.disponibles.filter(
    (option) => !alreadySelectedIds.includes(option.recepcionDetalle.id),
  );

  const moneda = monedaCodigo ? { currency: monedaCodigo } : undefined;

  const avisos: string[] = [];
  if (opciones.agotadas > 0) {
    avisos.push(
      `${opciones.agotadas} ${opciones.agotadas === 1 ? "partida ya está facturada" : "partidas ya están facturadas"} por completo`,
    );
  }
  if (opciones.noVinculables > 0) {
    avisos.push(
      `${opciones.noVinculables} ${opciones.noVinculables === 1 ? "partida no corresponde" : "partidas no corresponden"} a un renglón de la orden de compra`,
    );
  }

  return (
    <MultiSelectPickerDialogContent<ReceptionLineOption>
      title="Seleccionar Partidas de la Recepción"
      subtitle={
        avisos.length > 0
          ? `Solo partidas con cantidad por facturar. ${avisos.join("; ")}.`
          : "Solo partidas con cantidad por facturar"
      }
      statusColor="indigo"
      items={items}
      isLoading={isLoading}
      isError={isError}
      loadingTitle="Cargando partidas"
      loadingMessage="Obteniendo lo recibido y lo ya facturado..."
      errorMessage="No se pudo calcular lo ya facturado de esta recepción. Intenta de nuevo."
      searchPlaceholder="Buscar por producto..."
      filterPredicate={(option, term) =>
        `${option.recepcionDetalle.producto_nombre} ${option.ocDetalle.descripcion ?? ""}`
          .toLowerCase()
          .includes(term)
      }
      getKey={(option) => option.recepcionDetalle.id}
      emptyMessage={
        alreadySelectedIds.length > 0
          ? "Ya agregaste todas las partidas disponibles de esta recepción."
          : "Esta recepción no tiene partidas por facturar."
      }
      noResultsMessage="No se encontraron partidas"
      countLabel={{ singular: "partida seleccionada", plural: "partidas seleccionadas" }}
      renderContent={(option) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {option.recepcionDetalle.producto_nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recibido {formatExactQuantityValue(unitsToQty(option.recibidaUnits))}
              {option.facturadaUnits > 0 &&
                ` · Ya facturado ${formatExactQuantityValue(unitsToQty(option.facturadaUnits))}`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Por facturar</p>
            <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">
              {formatExactQuantityValue(unitsToQty(option.disponibleUnits))}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              {/* Sin `precio` la llave no llega (rol sin visibilidad financiera). */}
              {option.ocDetalle.precio !== undefined
                ? `${formatMoneyValueOrDash(option.ocDetalle.precio, moneda)} c/u`
                : "Precio no visible"}
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
 * ReceptionLinesSelectorDialog — partidas de la factura.
 *
 * Selector MÚLTIPLE sobre las partidas de la recepción elegida, cada una cruzada
 * con su renglón de OC (de ahí salen `oc_detalle` y el precio) y descontada de lo
 * ya facturado (ver `buildReceptionLineOptions`). Entrega las opciones completas
 * para que el formulario siembre cada renglón sin volver a buscar nada.
 */
export function ReceptionLinesSelectorDialog({
  open,
  onOpenChange,
  ...rest
}: ReceptionLinesSelectorDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      title=""
      maxWidth="680px"
      showCloseButton={false}
    >
      {open && (
        <ReceptionLinesSelectorContent
          {...rest}
          onConfirm={(options) => {
            rest.onConfirm(options);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </MainDialog>
  );
}

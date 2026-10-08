"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { getPedidoEstatusConfig } from "../constants/pedidoStatus";
import type { PedidoActiveKpi } from "../interfaces/pedido-kpis.interface";
import { OrderBadge } from "./OrderSheetPrimitives";
import { PedidoFolioLink } from "./PedidoFolioLink";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";

/**
 * "Mostrando X de N" (descripción del diálogo). El backend corta la lista en 20
 * filas ordenadas por importe y no hay endpoint para el resto, así que no hay
 * "ver todos": con menos filas que `total` se dice que son las de mayor importe.
 */
function getDescription(kpi: PedidoActiveKpi | undefined): string {
  if (!kpi?.disponible || kpi.drill_down.length === 0) return "Sin pedidos activos para mostrar.";
  const shown = kpi.drill_down.length;
  if (shown < kpi.total) return `Mostrando los ${shown} pedidos de mayor importe de ${kpi.total}`;
  return `Mostrando ${shown} de ${kpi.total} pedido${kpi.total === 1 ? "" : "s"}`;
}

interface PedidoKpiDrillDownDialogProps {
  open: boolean;
  /** Bloque ACTUAL de la consulta: un refetch con el diálogo abierto se refleja sin reabrirlo. */
  kpi: PedidoActiveKpi | undefined;
  onClose: () => void;
}

/**
 * Drill-down de "Pedidos activos": las filas que devolvió el backend, cada una
 * con enlace al detalle 360° (`?from=sales`, cuyo "Volver" regresa a Mis
 * pedidos). El importe va SIN símbolo: el payload no trae la moneda del pedido.
 */
export function PedidoKpiDrillDownDialog({ open, kpi, onClose }: PedidoKpiDrillDownDialogProps) {
  const rows = kpi?.disponible ? kpi.drill_down : [];
  return (
    <MainDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Pedidos activos"
      description={getDescription(kpi)}
      maxWidth="720px"
    >
      {rows.length === 0 ? (
        <EmptyLines>Sin pedidos activos para mostrar.</EmptyLines>
      ) : (
        <LineItemsTable
          head={
            <>
              <th className={TH_CLASS}>Folio</th>
              <th className={TH_CLASS}>Cliente</th>
              <th className={TH_CLASS}>Estatus</th>
              <th className={`${TH_CLASS} text-right`}>Total</th>
            </>
          }
        >
          {rows.map((pedido) => (
            <tr key={pedido.id}>
              <td className={TD_CLASS}>
                <PedidoFolioLink
                  pedidoId={pedido.id}
                  folio={pedido.folio}
                  from="sales"
                  className="font-mono font-medium text-slate-700 dark:text-slate-200"
                />
              </td>
              <td className={TD_CLASS}>{textOrDash(pedido.cliente_nombre)}</td>
              <td className={`${TD_CLASS} whitespace-nowrap`}>
                {/* Mismo badge que el detalle 360° (`OrderProgressSheet`). */}
                <OrderBadge config={getPedidoEstatusConfig(pedido.estatus)} />
              </td>
              <td className={`${TD_CLASS} text-right tabular-nums whitespace-nowrap`}>
                {formatMoneyValue(pedido.gran_total, NO_CURRENCY_FORMAT)}
              </td>
            </tr>
          ))}
        </LineItemsTable>
      )}
    </MainDialog>
  );
}

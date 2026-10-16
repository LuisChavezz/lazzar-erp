"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatKpiCurrencyAmount, plural } from "@/src/utils/kpiFormat";
import { getPedidoEstatusConfig } from "../constants/pedidoStatus";
import type { PedidoActiveKpi } from "../interfaces/pedido-kpis.interface";
import { OrderBadge } from "./OrderSheetPrimitives";
import { PedidoFolioLink } from "./PedidoFolioLink";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";
const NOTE_CLASS = "mt-2 text-xs text-slate-500 dark:text-slate-400";

/**
 * "Mostrando X de N" (descripción del diálogo). El backend corta la lista en 20
 * filas y no hay endpoint para el resto, así que no hay "ver todos". Ordena por
 * `gran_total` comparando el número sin convertir monedas: con la lista cortada
 * se dice tal cual, para no afirmar que son "los de mayor importe".
 */
function getDescription(kpi: PedidoActiveKpi | undefined): string {
  if (!kpi?.disponible || kpi.drill_down.length === 0) return "Sin pedidos activos para mostrar.";
  const shown = kpi.drill_down.length;
  const total = kpi.drill_down_total;
  const pedidos = `${total} ${plural(total, "pedido activo", "pedidos activos")}`;
  if (kpi.drill_down_truncado) {
    return `Mostrando ${shown} de ${pedidos}, ordenados por total sin convertir monedas`;
  }
  return `Mostrando ${shown} de ${pedidos}`;
}

/**
 * Aviso cuando el corte deja fuera TODOS los pedidos de una moneda que la
 * tarjeta sí muestra (el backend ordena por `gran_total` sin convertir, así que
 * una moneda de importes chicos puede no entrar en las 20 filas). Sin corte, o
 * con todas las monedas presentes en la lista, no hay aviso.
 */
function getMissingCurrenciesNote(kpi: PedidoActiveKpi | undefined): string | null {
  if (!kpi?.disponible || !kpi.drill_down_truncado) return null;
  const missing = kpi.por_moneda
    .map((fila) => fila.moneda)
    .filter((moneda) => !kpi.drill_down.some((pedido) => pedido.moneda === moneda));
  if (missing.length === 0) return null;
  const monedas = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} y ${missing.at(-1)}`;
  return `Los pedidos en ${monedas} no aparecen en esta lista: quedaron fuera de las ${kpi.drill_down.length} filas que se muestran.`;
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
 * pedidos). Cada importe va con el símbolo y el código de la moneda de SU pedido.
 */
export function PedidoKpiDrillDownDialog({ open, kpi, onClose }: PedidoKpiDrillDownDialogProps) {
  const rows = kpi?.disponible ? kpi.drill_down : [];
  const missingCurrenciesNote = getMissingCurrenciesNote(kpi);
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
        <>
          <LineItemsTable
            head={
              <>
                <th className={TH_CLASS}>Folio</th>
                <th className={TH_CLASS}>Cliente</th>
                <th className={TH_CLASS}>Estatus</th>
                <th className={TH_CLASS}>Moneda</th>
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
                <td className={TD_CLASS}>{pedido.moneda}</td>
                <td className={`${TD_CLASS} text-right tabular-nums whitespace-nowrap`}>
                  {formatKpiCurrencyAmount(pedido.gran_total, pedido.moneda)}
                </td>
              </tr>
            ))}
          </LineItemsTable>
          {missingCurrenciesNote ? <p className={NOTE_CLASS}>{missingCurrenciesNote}</p> : null}
        </>
      )}
    </MainDialog>
  );
}

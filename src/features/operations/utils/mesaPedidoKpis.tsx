import type { KpiCompactItem } from "@/src/components/KpiGrid";
import {
  BoxIcon,
  CheckCircleIcon,
  ClockIcon,
  ListaPreciosIcon,
  LockIcon,
  PedidosIcon,
} from "@/src/components/Icons";
import { CurrencyTotalsValue } from "@/src/components/CurrencyTotalsValue";
import type { CurrencyTotal } from "@/src/utils/currencyTotals";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { hiddenAmountCard } from "@/src/features/purchase-orders/utils/kpiAmountCards";
import { HIDDEN_PEDIDO_AMOUNTS_REASON } from "@/src/features/orders/constants/pedidoKpis";
import type { PedidoKpisMesa } from "@/src/features/orders/interfaces/pedido-list.interface";

/** Valor por moneda de `kpis-mesa/` (código ISO del backend; nunca se suman monedas). */
const valorPorMoneda = (kpis: PedidoKpisMesa): CurrencyTotal[] =>
  kpis.por_moneda.map((fila) => ({
    moneda: fila.moneda,
    total: safeParseAmount(String(fila.valor ?? 0)),
    ...(fila.moneda ? {} : { etiqueta: `Moneda ${fila.moneda_id}` }),
  }));

/**
 * Tarjetas de Mesa de Control a partir de `kpis-mesa/`, el MISMO conjunto que
 * la tabla con los mismos filtros y búsqueda. `total` excluye los cancelados
 * (= por confirmar + confirmados); el conteo `cancelados` del backend no se
 * pinta. Seis tarjetas en dos filas de tres (`MESA_CONTROL_KPI_COLUMNS`): la
 * primera, el embudo de confirmación; la segunda, lo detenido (retenidos y sin
 * surtir) y el valor.
 */
export const buildMesaPedidoKpis = (kpis: PedidoKpisMesa): KpiCompactItem[] => {
  const pct = (n: number) => (kpis.total ? Math.round((n / kpis.total) * 100) : 0);
  const count = (n: number) => n.toLocaleString("es-MX");
  const valorBase = { label: "Valor total", icon: ListaPreciosIcon };
  return [
    {
      label: "Total pedidos",
      value: count(kpis.total),
      icon: PedidosIcon,
      iconClass: "text-sky-500",
      detail: "En mesa de control · sin cancelados",
      hideProgress: true,
    },
    {
      label: "Por confirmar",
      value: count(kpis.por_confirmar),
      icon: ClockIcon,
      iconClass: "text-amber-500",
      progress: pct(kpis.por_confirmar),
      detail: `${pct(kpis.por_confirmar)}% del total · fecha pendiente`,
    },
    {
      label: "Confirmados",
      value: count(kpis.confirmados),
      icon: CheckCircleIcon,
      iconClass: "text-cyan-500",
      progress: pct(kpis.confirmados),
      detail: `${pct(kpis.confirmados)}% del total · con fecha`,
    },
    {
      label: "Retenidos",
      value: count(kpis.retenidos),
      icon: LockIcon,
      iconClass: "text-orange-500",
      progress: pct(kpis.retenidos),
      detail: `${pct(kpis.retenidos)}% del total · congelados`,
      info: "Pedidos vigentes que Mesa de Control retuvo: no se surten, empacan, despachan ni generan órdenes hasta liberarlos.",
    },
    {
      label: "Sin surtir",
      value: count(kpis.sin_surtir),
      icon: BoxIcon,
      iconClass: "text-amber-500",
      progress: pct(kpis.sin_surtir),
      detail: `${pct(kpis.sin_surtir)}% del total · sin picking`,
      info: "Pedidos programados, no cancelados y sin un solo picking vivo: trabajo que Mesa ya liberó y almacén aún no toma. Incluye los retenidos.",
    },
    !kpis.puede_ver_importes
      ? hiddenAmountCard(valorBase, HIDDEN_PEDIDO_AMOUNTS_REASON)
      : {
          ...valorBase,
          value: <CurrencyTotalsValue totals={valorPorMoneda(kpis)} />,
          iconClass: "text-emerald-500",
          hideProgress: true,
          info: "Suma del total con IVA de los pedidos por moneda; cada moneda se muestra por separado.",
        },
  ];
};

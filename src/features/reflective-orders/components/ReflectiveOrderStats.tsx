"use client";

import {
  ClipboardListIcon,
  LayersIcon,
  PedidosIcon,
  RulerIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { computeReflectiveOrderKpis } from "../utils/reflective-orders.utils";
import type { ReflectiveOrder } from "../interfaces/reflective-order.interface";

/**
 * KPIs del listado de Órdenes de Reflejante, derivados por completo de
 * `ReflectiveOrder[]` ya cargado por `useReflectiveOrders()` — sin fetch
 * propio. Se gatea `!isLoading && !showError` en el llamador
 * (`ReflectiveOrdersView`), mismo patrón que `EmbroideryStats`/`PackingStats`:
 * sin ese gate, `orders` arrancaría en `[]` y las tarjetas mostrarían ceros que
 * se leerían como datos reales durante la carga inicial.
 *
 * Lo que NO se muestra, y por qué:
 *
 *  - DESGLOSE POR ESTATUS: `estatus_reflejante` es siempre `1` (Pendiente) —
 *    las dos rutas de alta lo dejan en ese valor y no existe endpoint de
 *    transición (`PUT`/`PATCH` → 405), así que seis de los siete cubos serían
 *    permanentemente cero. Misma decisión, y por la misma razón, que
 *    `EmbroideryStats`/`PickingStats`.
 *
 *  - DESGLOSE POR PRIORIDAD: técnicamente calculable, pero aquí el sesgo es
 *    aún más fuerte que en bordado —donde ya se excluyó por este motivo—: la
 *    generación automática desde ventas escribe `prioridad=1` LITERAL (no un
 *    default que alguien pueda cambiar), y el alta de producción toma el mismo
 *    `IntegerField(default=1)`. Un desglose leería "Alta" para prácticamente
 *    todo el listado por inercia del origen, no por urgencia real — y un número
 *    sesgado se lee como señal verdadera, lo que engaña más que uno constante.
 *
 *  - METROS DE REFLEJANTE: sería EL indicador de consumo de material del
 *    módulo, pero `detalles[].metros` llega `0` en todas las órdenes por las
 *    dos rutas de alta (ver `ReflectiveOrderLine`). Una tarjeta clavada en
 *    "0 m" se lee como "no se consume material", que es falso: nadie lo
 *    calcula todavía. Entra cuando el backend lo puebla.
 *
 *  - TIEMPO DE CICLO / ÓRDENES VENCIDAS: `fecha_fin` es siempre `null` y el
 *    modelo NO tiene ningún campo de fecha compromiso (solo
 *    `fecha_inicio`/`fecha_fin`), a diferencia de picking, que sí construye su
 *    KPI de vencidos sobre `fecha_limite`. El concepto no está vacío, está
 *    ausente del modelo.
 */
export function ReflectiveOrderStats({ items }: { items: ReflectiveOrder[] }) {
  const kpis = computeReflectiveOrderKpis(items);

  const cards: KpiItem[] = [
    {
      label: "Total de Órdenes",
      value: String(kpis.totalOrdenes),
      icon: RulerIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Listado cargado",
      status: "neutral",
    },
    {
      // `formatQuantityValue` es EXACTAMENTE el mismo formateador que usa la
      // columna "Prendas" del listado (ver `ReflectiveOrderColumns`), así que
      // la suma de la tabla y esta tarjeta no pueden divergir en formato.
      label: "Total de Prendas",
      value: formatQuantityValue(kpis.totalPrendas),
      icon: LayersIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Piezas por aplicar",
    },
    {
      label: "Renglones de Detalle",
      value: String(kpis.totalRenglones),
      icon: ClipboardListIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Combinaciones producto/talla",
    },
    {
      label: "Pedidos Distintos",
      value: String(kpis.totalPedidos),
      icon: PedidosIcon,
      iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-500",
      subLabel: "Pedidos que abarca el listado",
    },
  ];

  return <KpiGrid items={cards} />;
}

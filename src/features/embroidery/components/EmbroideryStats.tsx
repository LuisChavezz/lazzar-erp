"use client";

import {
  ClipboardListIcon,
  LayersIcon,
  PedidosIcon,
  ScissorsIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { computeEmbroideryKpis } from "../utils/embroidery.utils";
import type { EmbroideryOrder } from "../interfaces/embroidery.interface";

/**
 * KPIs del listado de Órdenes de Bordado, derivados por completo de
 * `EmbroideryOrder[]` ya cargado por `useEmbroideryOrders()` — sin fetch
 * propio. Se gatea `!isLoading && !showError` en el llamador
 * (`EmbroideryView`), mismo patrón que `PickingStats`/`PackingStats`: sin ese
 * gate, `orders` arrancaría en `[]` y las tarjetas mostrarían ceros que se
 * leerían como datos reales durante la carga inicial.
 *
 * Lo que NO se muestra, y por qué:
 *
 *  - DESGLOSE POR ESTATUS: `estatus_bordado` es siempre `1` (Pendiente) —
 *    no existe endpoint de transición (`PUT`/`PATCH` → 405), así que seis de
 *    los siete cubos serían permanentemente cero. Misma decisión, y por la
 *    misma razón, que `PickingStats` (que documenta explícitamente por qué
 *    omite su desglose de estatus).
 *
 *  - TIEMPO DE CICLO / "días para completar": `fecha_fin` es siempre `null`,
 *    nada la fija. No hay marca de término en ningún campo.
 *
 *  - ÓRDENES VENCIDAS: a diferencia de picking (que sí tiene `fecha_limite` y
 *    construye su KPI de vencidos sobre ella), `OrdenesBordado` NO tiene NINGÚN
 *    campo de fecha compromiso — solo `fecha_inicio`/`fecha_fin`. El concepto
 *    no está vacío, está ausente del modelo.
 *
 *  - DESGLOSE POR PRIORIDAD: técnicamente calculable, pero `prioridad` toma su
 *    valor por defecto del backend (`IntegerField(default=1)`, que bajo la
 *    convención de etiquetas del proyecto se lee "Alta") y el formulario de
 *    alta lo preselecciona. Un desglose leería mayoritariamente "Alta" por
 *    inercia del default, no por urgencia real — un número sesgado se lee como
 *    señal verdadera, y eso engaña más que uno constante.
 */
export function EmbroideryStats({ items }: { items: EmbroideryOrder[] }) {
  const kpis = computeEmbroideryKpis(items);

  const cards: KpiItem[] = [
    {
      label: "Total de Órdenes",
      value: String(kpis.totalOrdenes),
      icon: ScissorsIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Listado cargado",
      status: "neutral",
    },
    {
      // `formatQuantityValue` es EXACTAMENTE el mismo formateador que usa la
      // columna "Prendas" del listado (ver `EmbroideryOrderColumns`), así que
      // la suma de la tabla y esta tarjeta no pueden divergir en formato.
      label: "Total de Prendas",
      value: formatQuantityValue(kpis.totalPrendas),
      icon: LayersIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Piezas por bordar",
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

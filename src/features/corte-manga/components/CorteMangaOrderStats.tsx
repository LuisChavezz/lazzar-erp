"use client";

import {
  ClipboardListIcon,
  LayersIcon,
  PedidosIcon,
  SliceIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { computeCorteMangaOrderKpis } from "../utils/corte-manga-orders.utils";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

/**
 * KPIs del listado de Órdenes de Corte de Manga, derivados por completo de
 * `CorteMangaOrder[]` ya cargado por `useCorteMangaOrders()` — sin fetch
 * propio. Se gatea `!isLoading && !showError` en el llamador
 * (`CorteMangaOrdersView`), mismo patrón que
 * `ReflectiveOrderStats`/`EmbroideryStats`: sin ese gate, `orders` arrancaría
 * en `[]` y las tarjetas mostrarían ceros que se leerían como datos reales
 * durante la carga inicial.
 *
 * Las cuatro métricas son las MISMAS que las de reflejante, y no por copia: son
 * las únicas cuatro que este modelo puede sostener sin inventar un campo. Todas
 * salen de datos que OCM tiene de verdad (`orders.length`, `pedido`,
 * `detalles[]`, `detalles[].cantidad`), no de campos propios del reflejante
 * —OCM no tiene `metros`, `tipo_reflejante` ni `posicion`—.
 *
 * Lo que NO se muestra, y por qué:
 *
 *  - DESGLOSE POR ESTATUS: `estatus_corte` es siempre `1` (Pendiente) — está en
 *    los `read_only_fields` del serializer, así que ninguna ruta de alta puede
 *    escribir otro valor, y no existe endpoint de transición (`PUT`/`PATCH` →
 *    405): seis de los siete cubos serían permanentemente cero. Misma decisión,
 *    y por la misma razón, que `ReflectiveOrderStats`/`EmbroideryStats`.
 *
 *  - DESGLOSE POR PRIORIDAD: técnicamente calculable, pero sesgado hasta ser
 *    inútil: la única ruta de alta viva toma `data.get("prioridad", 1)` y el
 *    modelo declara `IntegerField(default=1)`, así que un desglose leería
 *    "Alta" para prácticamente todo el listado por inercia del default, no por
 *    urgencia real — y un número sesgado se lee como señal verdadera, lo que
 *    engaña más que uno constante. Mismo criterio que bordado y reflejante.
 *
 *  - CONFIGURACIÓN DE CORTE (`detalles[].configuracion`): sería EL indicador
 *    propio del módulo —qué tipo de corte lleva cada prenda—, pero llega `null`
 *    en todas las órdenes: la única ruta de alta viva no lo escribe, y las dos
 *    que sí lo hacían están deshabilitadas (ver `CorteMangaOrderLine`). Una
 *    tarjeta clavada en cero se lee como "ninguna prenda lleva configuración",
 *    que es falso: nadie la captura todavía. Entra cuando el backend la pueble.
 *
 *  - TIEMPO DE CICLO / ÓRDENES VENCIDAS: `fecha_fin` es siempre `null` y el
 *    modelo NO tiene ningún campo de fecha compromiso (solo
 *    `fecha_inicio`/`fecha_fin`), a diferencia de picking, que sí construye su
 *    KPI de vencidos sobre `fecha_limite`. El concepto no está vacío, está
 *    ausente del modelo.
 */
export function CorteMangaOrderStats({ items }: { items: CorteMangaOrder[] }) {
  const kpis = computeCorteMangaOrderKpis(items);

  const cards: KpiItem[] = [
    {
      label: "Total de Órdenes",
      value: String(kpis.totalOrdenes),
      icon: SliceIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Listado cargado",
      status: "neutral",
    },
    {
      // `formatQuantityValue` es EXACTAMENTE el mismo formateador que usa la
      // columna "Prendas" del listado (ver `CorteMangaOrderColumns`), así que
      // la suma de la tabla y esta tarjeta no pueden divergir en formato.
      label: "Total de Prendas",
      value: formatQuantityValue(kpis.totalPrendas),
      icon: LayersIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Piezas por cortar",
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

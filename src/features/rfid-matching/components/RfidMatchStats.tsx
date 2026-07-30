"use client";

import {
  QrCodeIcon,
  ClipboardListIcon,
  CheckCircleIcon,
  BoxIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { computeRfidMatchKpis } from "../utils/rfid-matching.utils";
import type { RfidMatch } from "../interfaces/rfid-matching.interface";

/**
 * KPIs del listado de encuadres, derivados por completo de `RfidMatch[]` ya
 * cargado por `useRfidMatches()` — sin fetch propio, igual que `PickingStats`.
 *
 * Se gatea `!isLoading && !isError` en el llamador (`RfidMatchesView`), mismo
 * patrón que `PickingStats`/`OrderStats`: sin ese gate, `items` arrancaría en
 * `[]` y las tarjetas mostrarían ceros que se leerían como datos reales
 * durante la carga inicial. Aquí la "carga" es instantánea —los registros
 * viven en memoria—, pero el cableado se conserva para que cambiar el
 * `queryFn` de `useRfidMatches` por un endpoint real no reintroduzca ese
 * parpadeo.
 */
export function RfidMatchStats({ items }: { items: RfidMatch[] }) {
  const kpis = computeRfidMatchKpis(items);

  const cards: KpiItem[] = [
    {
      label: "Total de Encuadres",
      value: String(kpis.totalMatches),
      icon: QrCodeIcon,
      iconBgClass: "bg-indigo-50 dark:bg-indigo-500/10",
      iconClass: "text-indigo-500",
      trendLabel: "Listado cargado",
      status: "neutral",
    },
    {
      label: "Pendientes",
      value: String(kpis.pendientes),
      icon: ClipboardListIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Por conciliar",
      status: kpis.pendientes > 0 ? "negative" : "positive",
    },
    {
      label: "Aceptados en QA",
      value: String(kpis.aceptados),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "Conteo validado",
      status: "positive",
      // Sin encuadres no hay 0% que dibujar: la barra se deja llena, igual que
      // el resto de tarjetas sin `progress`.
      progress:
        kpis.totalMatches > 0
          ? (kpis.aceptados / kpis.totalMatches) * 100
          : undefined,
    },
    {
      label: "Unidades por Leer",
      value: String(kpis.unidadesPorLeer),
      icon: BoxIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      // Solo cuenta faltantes de encuadres PENDIENTES: lo aceptado ya cerró su
      // conteo, su diferencia dejó de ser trabajo por hacer.
      trendLabel: "En encuadres pendientes",
      status: kpis.unidadesPorLeer > 0 ? "negative" : "positive",
    },
  ];

  return <KpiGrid items={cards} />;
}

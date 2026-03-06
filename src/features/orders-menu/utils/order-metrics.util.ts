import React from "react";
import {
  OrdenesIcon,
  ListaPreciosIcon,
  ClockIcon,
  ProduccionIcon,
  ViewIcon,
  CheckCircleIcon,
} from "@/src/components/Icons";

export interface OrderMetricItem {
  label: string;
  value: string | number;
  footer: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: "sky" | "blue" | "emerald" | "amber" | "violet" | "indigo";
}

const monthIndexMap: Record<string, number> = {
  ene: 0,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
  dec: 11,
};

const parseLooseDate = (value: string) => {
  if (!value) return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 3) {
    const day = Number(parts[0]);
    const monthKey = parts[1].toLowerCase().slice(0, 3);
    const year = Number(parts[2]);
    const month = monthIndexMap[monthKey];
    if (Number.isFinite(day) && Number.isFinite(year) && Number.isFinite(month)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLatestDate = (data: { fecha: string }[]) =>
  data.reduce<Date | null>((latest, item) => {
    const parsed = parseLooseDate(item.fecha);
    if (!parsed) return latest;
    if (!latest || parsed > latest) return parsed;
    return latest;
  }, null);

const isWithinLastWeek = (date: Date, reference: Date) => {
  const end = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return date >= start && date <= end;
};

export function buildOrderMetrics(
  data: { estatus: string; total: number; piezas: number; fecha: string }[]
): OrderMetricItem[] {
  const activeStatuses = ["Pendiente", "En proceso", "En revisión", "Demorado", "Acción requerida"];
  const totalActivos = data.filter((item) => activeStatuses.includes(item.estatus)).length;
  const enProceso = data.filter((item) => item.estatus === "En proceso").length;
  const demorado = data.filter((item) => item.estatus === "Demorado").length;
  const completado = data.filter((item) => item.estatus === "Completado").length;
  const accionRequerida = data.filter((item) => item.estatus === "Acción requerida").length;

  const latestDate = getLatestDate(data);
  const cargaSemanal = latestDate
    ? data.reduce((acc, item) => {
        const parsed = parseLooseDate(item.fecha);
        if (!parsed) return acc;
        if (!isWithinLastWeek(parsed, latestDate)) return acc;
        return acc + (item.piezas || 0);
      }, 0)
    : 0;

  return [
    {
      label: "Total activos",
      value: totalActivos,
      footer: "Órdenes abiertas",
      icon: OrdenesIcon,
      color: "sky",
    },
    {
      label: "En proceso",
      value: enProceso,
      footer: "Ejecución actual",
      icon: ProduccionIcon,
      color: "blue",
    },
    {
      label: "Demorado",
      value: demorado,
      footer: "Fuera de tiempo",
      icon: ClockIcon,
      color: "amber",
    },
    {
      label: "Completos",
      value: completado,
      footer: "Órdenes cerradas",
      icon: CheckCircleIcon,
      color: "emerald",
    },
    {
      label: "Acción requerida",
      value: accionRequerida,
      footer: "Atención inmediata",
      icon: ViewIcon,
      color: "violet",
    },
    {
      label: "Carga semanal",
      value: cargaSemanal.toLocaleString("es-MX"),
      footer: "Piezas últimos 7 días",
      icon: ListaPreciosIcon,
      color: "indigo",
    },
  ];
}

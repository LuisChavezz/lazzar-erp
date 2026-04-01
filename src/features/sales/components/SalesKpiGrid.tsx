"use client";

import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import {
  ClientesIcon,
  TrendingUpIcon,
  PedidosIcon,
  OrdenesIcon,
} from "@/src/components/Icons";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { useQuotes } from "@/src/features/quotes/hooks/useQuotes";
import { Quote } from "@/src/features/quotes/interfaces/quote.interface";

const parseOrderCreatedAt = (value?: string | null) => {
  if (!value) return null;
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  if (normalizedValue.includes("/")) {
    const [rawDatePart, rawTimePart] = normalizedValue.split(" ");
    const [day, month, year] = rawDatePart.split("/").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const [hours = 0, minutes = 0, seconds = 0] = (rawTimePart ?? "")
      .split(":")
      .map((part) => Number(part));
    const date = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoOnlyDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoOnlyDateMatch) {
    const [, yearRaw, monthRaw, dayRaw] = isoOnlyDateMatch;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLast30DaysOrdersCount = (quotes: Quote[], now: Date) => {
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - 29);

  const rangeEnd = new Date(now);
  rangeEnd.setHours(23, 59, 59, 999);

  return quotes.filter((quote) => {
    const createdAt = parseOrderCreatedAt(quote.created_at);
    return createdAt ? createdAt >= rangeStart && createdAt <= rangeEnd : false;
  }).length;
};

export const SalesKpiGrid = () => {
  const { customers, isLoading: isCustomersLoading } = useCustomers();
  const { quotes, isLoading: isOrdersLoading } = useQuotes();

  const now = new Date();
  const totalCustomers = customers.length;
  const activeOrdersLast30Days = getLast30DaysOrdersCount(quotes, now);
  const isLoading = isCustomersLoading || isOrdersLoading;

  const items: KpiItem[] = [
    {
      label: "Clientes Activos",
      value: isLoading ? "..." : String(totalCustomers),
      icon: ClientesIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Últimos 30 días",
      status: "positive",
    },
    {
      label: "Nuevos este mes",
      value: isLoading ? "..." : String(totalCustomers),
      icon: TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      subLabel: "Clientes nuevos",
      status: "positive",
    },
    {
      label: "Pedidos del mes",
      value: isLoading ? "..." : String(activeOrdersLast30Days),
      icon: PedidosIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      subLabel: "Activos",
      status: "positive",
    },
    {
      label: "Pedidos críticos",
      value: isLoading ? "..." : "0",
      icon: OrdenesIcon,
      iconBgClass: "bg-rose-50 dark:bg-rose-500/10",
      iconClass: "text-rose-500",
      subLabel: "Atención inmediata",
      status: "negative",
    },
  ];

  return <KpiGrid items={items} />;
};

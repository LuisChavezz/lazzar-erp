"use client";

import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import {
  ErrorIcon,
  ListaPreciosIcon,
  FacturacionIcon,
  ClockIcon,
} from "../../../components/Icons";
import { useInvoices } from "../hooks/useInvoices";
import { Factura } from "../interfaces/invoice.interface";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { parseLocalDate } from "@/src/utils/formatDate";

const isCancelled = (status: string) => status === "Cancelada";

/** Una factura sigue pendiente de cobro si no está pagada ni cancelada. */
const isPending = (status: string) =>
  status !== "Pagada" && status !== "Cancelada";

/** Está vencida si su estatus lo indica o venció y sigue pendiente de cobro. */
const isOverdue = (invoice: Factura, today: Date) => {
  if (invoice.estatus === "Vencida") return true;
  if (!isPending(invoice.estatus)) return false;
  const dueDate = parseLocalDate(invoice.fecha_vencimiento);
  if (!dueDate) return false;
  return dueDate < today;
};

type CurrencyTotals = {
  invoiced: number;
  invoicedCount: number;
  receivable: number;
  pendingCount: number;
  overdue: number;
  overdueCount: number;
  count: number;
};

const emptyTotals = (): CurrencyTotals => ({
  invoiced: 0,
  invoicedCount: 0,
  receivable: 0,
  pendingCount: 0,
  overdue: 0,
  overdueCount: 0,
  count: 0,
});

export const InvoiceStats = () => {
  const { invoices, hasLoaded, isLoading, isError } = useInvoices();

  // Solo ocultamos por completo los KPIs cuando la consulta nunca cargó con
  // éxito; un error de refetch transitorio no debe borrar las tarjetas ya
  // cargadas, aunque el conjunto cargado estuviera vacío.
  if (isError && !hasLoaded) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Una sola pasada: acumulamos importes y conteos por moneda (no tiene sentido
  // sumar monedas distintas en un mismo total) y un conteo global de emitidas.
  // Las canceladas se excluyen de los importes y del conteo de emitidas.
  const totalsByCurrency = new Map<string, CurrencyTotals>();
  let emittedCount = 0;

  for (const invoice of invoices) {
    const amount = safeParseAmount(invoice.total);
    const cancelled = isCancelled(invoice.estatus);
    const pending = isPending(invoice.estatus);
    const overdue = isOverdue(invoice, today);

    if (!cancelled) emittedCount += 1;

    const bucket = totalsByCurrency.get(invoice.moneda_nombre) ?? emptyTotals();
    bucket.count += 1;
    if (!cancelled) {
      bucket.invoiced += amount;
      bucket.invoicedCount += 1;
    }
    if (pending) {
      bucket.receivable += amount;
      bucket.pendingCount += 1;
    }
    if (overdue) {
      bucket.overdue += amount;
      bucket.overdueCount += 1;
    }
    totalsByCurrency.set(invoice.moneda_nombre, bucket);
  }

  // Moneda dominante = la que agrupa más facturas. Importes y sus conteos
  // asociados se muestran solo para esa moneda; si hay más de una, lo
  // indicamos en la tarjeta para que el conteo y el importe describan la
  // misma población.
  let dominantCurrency = "";
  let totals = emptyTotals();
  for (const [currency, bucket] of totalsByCurrency) {
    if (bucket.count > totals.count) {
      dominantCurrency = currency;
      totals = bucket;
    }
  }
  const currencyNote =
    totalsByCurrency.size > 1
      ? `Solo ${dominantCurrency || "moneda principal"}`
      : undefined;

  const money = (value: number) =>
    formatCurrency(value, { maximumFractionDigits: 0 });

  // Mientras carga mostramos un marcador en lugar de ceros que parecerían reales.
  const ph = "—";

  const items: KpiItem[] = [
    {
      label: "Total Facturado",
      value: isLoading ? ph : money(totals.invoiced),
      subLabel: isLoading ? undefined : currencyNote,
      icon: ListaPreciosIcon,
      iconBgClass: "bg-blue-50 dark:bg-blue-500/10",
      iconClass: "text-blue-500",
      trendLabel: isLoading ? undefined : `${totals.invoicedCount} Facturas`,
      status: "positive",
    },
    {
      label: "Por Cobrar",
      value: isLoading ? ph : money(totals.receivable),
      subLabel: isLoading ? undefined : currencyNote,
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: isLoading ? undefined : `${totals.pendingCount} Pendientes`,
      status: "neutral",
    },
    {
      label: "Vencido",
      value: isLoading ? ph : money(totals.overdue),
      subLabel: isLoading ? undefined : currencyNote,
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: isLoading ? undefined : `${totals.overdueCount} Vencidas`,
      status: "negative",
    },
    {
      label: "Facturas Emitidas",
      value: isLoading ? ph : String(emittedCount),
      icon: FacturacionIcon,
      iconBgClass: "bg-purple-50 dark:bg-purple-500/10",
      iconClass: "text-purple-500",
      trendLabel: isLoading ? undefined : "Total",
      status: "positive",
    },
  ];

  return <KpiGrid items={items} />;
};

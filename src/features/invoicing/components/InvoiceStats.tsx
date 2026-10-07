"use client";

import { KpiCard, type KpiItem } from "@/src/components/KpiGrid";
import {
  ErrorIcon,
  ListaPreciosIcon,
  FacturacionIcon,
  ClockIcon,
  PencilSquareIcon,
} from "../../../components/Icons";
import { useInvoices } from "../hooks/useInvoices";
import { Invoice } from "../interfaces/invoice.interface";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { parseLocalDate } from "@/src/utils/formatDate";

/**
 * Una factura está por cobrar solo si está EMITIDA: el Borrador aún no es un
 * comprobante en firme (no genera CxC) y la cancelada no se cobra.
 */
const isReceivable = (invoice: Invoice) => invoice.estatus === INVOICE_STATUS.EMITIDA;

/** Vencida = por cobrar y con `fecha_vencimiento` (fecha-calendario) ya pasada. */
const isOverdue = (invoice: Invoice, today: Date) => {
  if (!isReceivable(invoice)) return false;
  const dueDate = parseLocalDate(invoice.fecha_vencimiento);
  if (!dueDate) return false;
  return dueDate < today;
};

type CurrencyTotals = {
  invoiced: number;
  receivable: number;
  overdue: number;
};

const emptyTotals = (): CurrencyTotals => ({
  invoiced: 0,
  receivable: 0,
  overdue: 0,
});

export const InvoiceStats = () => {
  const { invoices, hasLoaded, isLoading, isError } = useInvoices();

  // Solo ocultamos por completo los KPIs cuando la consulta nunca cargó con
  // éxito; un error de refetch transitorio no debe borrar las tarjetas ya
  // cargadas, aunque el conjunto cargado estuviera vacío.
  if (isError && !hasLoaded) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Una sola pasada: acumulamos importes por moneda (no tiene sentido sumar
  // monedas distintas en un mismo total) y conteos globales, que sí tienen
  // sentido agregados sin importar la moneda de cada factura. Las canceladas
  // se excluyen de los importes; "Total facturado" incluye los borradores
  // (sus piezas ya están apartadas), "Por cobrar" y "Vencido" no.
  const totalsByCurrency = new Map<string, CurrencyTotals>();
  let invoicedCount = 0;
  let emittedCount = 0;
  let draftCount = 0;
  let receivableCount = 0;
  let overdueCount = 0;

  for (const invoice of invoices) {
    const amount = safeParseAmount(invoice.total);
    const cancelled = invoice.estatus === INVOICE_STATUS.CANCELADA;
    const receivable = isReceivable(invoice);
    const overdue = isOverdue(invoice, today);

    if (!cancelled) invoicedCount += 1;
    if (invoice.estatus === INVOICE_STATUS.EMITIDA) emittedCount += 1;
    if (invoice.estatus === INVOICE_STATUS.BORRADOR) draftCount += 1;
    if (receivable) receivableCount += 1;
    if (overdue) overdueCount += 1;

    const bucket = totalsByCurrency.get(invoice.moneda_nombre) ?? emptyTotals();
    if (!cancelled) bucket.invoiced += amount;
    if (receivable) bucket.receivable += amount;
    if (overdue) bucket.overdue += amount;
    totalsByCurrency.set(invoice.moneda_nombre, bucket);
  }

  const currencyEntries = Array.from(totalsByCurrency.entries());

  // Cada KPI monetario muestra un total por cada moneda presente en el
  // conjunto, separados por "·" — ninguna moneda queda oculta. Con una sola
  // moneda esto se reduce a una sola línea, igual que antes.
  const money = (pick: (totals: CurrencyTotals) => number) =>
    currencyEntries.length > 0
      ? currencyEntries
          .map(([currency, totals]) =>
            formatCurrency(pick(totals), { currency, maximumFractionDigits: 0 }),
          )
          .join(" · ")
      : formatCurrency(0, { maximumFractionDigits: 0 });

  // Mientras carga mostramos un marcador en lugar de ceros que parecerían reales.
  const ph = "—";

  const items: KpiItem[] = [
    {
      label: "Total Facturado",
      value: isLoading ? ph : money((t) => t.invoiced),
      icon: ListaPreciosIcon,
      iconBgClass: "bg-blue-50 dark:bg-blue-500/10",
      iconClass: "text-blue-500",
      trendLabel: isLoading ? undefined : `${invoicedCount} Facturas`,
      status: "positive",
    },
    {
      label: "Por Cobrar",
      value: isLoading ? ph : money((t) => t.receivable),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: isLoading ? undefined : `${receivableCount} Pendientes`,
      status: "neutral",
    },
    {
      label: "Vencido",
      value: isLoading ? ph : money((t) => t.overdue),
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: isLoading ? undefined : `${overdueCount} Vencidas`,
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
    {
      label: "Borradores",
      value: isLoading ? ph : String(draftCount),
      icon: PencilSquareIcon,
      iconBgClass: "bg-slate-100 dark:bg-slate-500/10",
      iconClass: "text-slate-500",
      trendLabel: isLoading ? undefined : "Sin emitir",
      status: "neutral",
    },
  ];

  // Grilla propia (no `KpiGrid`, fija en 4 columnas) para que las CINCO
  // tarjetas quepan en una fila en pantallas anchas.
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch gap-4"
      role="list"
    >
      {items.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
};

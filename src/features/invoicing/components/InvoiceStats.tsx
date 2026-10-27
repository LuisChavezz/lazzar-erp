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
import type { InvoiceListRow } from "../interfaces/invoice.interface";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { createCurrencyTotals, type CurrencyTotal } from "@/src/utils/currencyTotals";
import { CurrencyTotalsValue, showsCurrencyCodes } from "@/src/components/CurrencyTotalsValue";
import { parseLocalDate } from "@/src/utils/formatDate";
import { plural } from "@/src/utils/plural";

/**
 * Una factura está por cobrar solo si está EMITIDA: el Borrador aún no es un
 * comprobante en firme (no genera CxC) y la cancelada no se cobra.
 */
const isReceivable = (invoice: InvoiceListRow) => invoice.estatus === INVOICE_STATUS.EMITIDA;

/** Vencida = por cobrar y con `fecha_vencimiento` (fecha-calendario) ya pasada. */
const isOverdue = (invoice: InvoiceListRow, today: Date) => {
  if (!isReceivable(invoice)) return false;
  const dueDate = parseLocalDate(invoice.fecha_vencimiento);
  if (!dueDate) return false;
  return dueDate < today;
};

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
  // Cada indicador registra la moneda de TODA factura (con 0 si no aporta), así
  // que los tres listan las mismas monedas, ordenadas por código
  // (`currencyTotals`, igual que CxC).
  const invoiced = createCurrencyTotals();
  const receivable = createCurrencyTotals();
  const overdue = createCurrencyTotals();
  let invoicedCount = 0;
  let emittedCount = 0;
  let draftCount = 0;
  let receivableCount = 0;
  let overdueCount = 0;

  for (const invoice of invoices) {
    const amount = safeParseAmount(invoice.total);
    const cancelled = invoice.estatus === INVOICE_STATUS.CANCELADA;
    const isReceivableInvoice = isReceivable(invoice);
    const isOverdueInvoice = isOverdue(invoice, today);
    // `moneda_nombre` trae el código ISO (`moneda.codigo_iso`), pese al nombre.
    const moneda = invoice.moneda_nombre || null;

    if (!cancelled) invoicedCount += 1;
    if (invoice.estatus === INVOICE_STATUS.EMITIDA) emittedCount += 1;
    if (invoice.estatus === INVOICE_STATUS.BORRADOR) draftCount += 1;
    if (isReceivableInvoice) receivableCount += 1;
    if (isOverdueInvoice) overdueCount += 1;

    invoiced.add(moneda, cancelled ? 0 : amount);
    receivable.add(moneda, isReceivableInvoice ? amount : 0);
    overdue.add(moneda, isOverdueInvoice ? amount : 0);
  }

  // Cada KPI monetario muestra un total por moneda, un bloque por moneda con
  // su código (`CurrencyTotalsValue`, que oculta las que dan cero si otra
  // tiene importe). Con una sola moneda, una sola cifra igual que
  // antes. Sin facturas no hay moneda que afirmar: 0 sin símbolo (EC-600).
  // Si el valor lleva código de moneda la insignia va debajo de los bloques
  // (`stackTrend`), que compartiendo fila se recortarían ("USD 7,…").
  const money = (totals: CurrencyTotal[]) => (
    <CurrencyTotalsValue totals={totals} options={{ maximumFractionDigits: 0 }} />
  );

  const invoicedTotals = invoiced.list();
  const receivableTotals = receivable.list();
  const overdueTotals = overdue.list();

  // Mientras carga mostramos un marcador en lugar de ceros que parecerían reales.
  const ph = "—";

  const items: KpiItem[] = [
    {
      label: "Total Facturado",
      value: isLoading ? ph : money(invoicedTotals),
      stackTrend: !isLoading && showsCurrencyCodes(invoicedTotals),
      icon: ListaPreciosIcon,
      iconBgClass: "bg-blue-50 dark:bg-blue-500/10",
      iconClass: "text-blue-500",
      trendLabel: isLoading ? undefined : `${invoicedCount} ${plural(invoicedCount, "Factura", "Facturas")}`,
      status: "positive",
    },
    {
      label: "Por Cobrar",
      value: isLoading ? ph : money(receivableTotals),
      stackTrend: !isLoading && showsCurrencyCodes(receivableTotals),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: isLoading ? undefined : `${receivableCount} ${plural(receivableCount, "Pendiente", "Pendientes")}`,
      status: "neutral",
    },
    {
      label: "Vencido",
      value: isLoading ? ph : money(overdueTotals),
      stackTrend: !isLoading && showsCurrencyCodes(overdueTotals),
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: isLoading ? undefined : `${overdueCount} ${plural(overdueCount, "Vencida", "Vencidas")}`,
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

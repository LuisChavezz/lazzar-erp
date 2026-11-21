"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/src/components/StatusBadge";
import { EmptyLines, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { useRouteAccess } from "@/src/hooks/useRouteAccess";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { formatAmountNoCurrency } from "@/src/utils/formatCurrency";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { ReceiptDetailDialog } from "@/src/features/receipts/components/ReceiptDetailDialog";
import {
  getReceiptEstatusLabel,
  RECEIPT_STATUS_CONFIG,
} from "@/src/features/receipts/constants/receiptStatus";
import { FACTURA_PROVEEDOR_ESTATUS_CONFIG } from "@/src/features/supplier-invoices/constants/supplierInvoiceStatus";
import { supplierInvoicesHref } from "@/src/features/supplier-invoices/utils/supplierInvoicesListQuery";
import type { SalidaMaquila } from "../interfaces/salida-maquila.interface";
import {
  FACTURA_CANCELADA,
  RECEPCION_CANCELADA,
  salidaMaquilaDocumentoEtiqueta,
} from "../utils/salidaMaquilaDocumentos";

/** Rutas cuya regla de acceso decide si un folio enlaza (`R-WMS-RECEPCIONES`, `R-CONTABILIDAD`). */
const RECEPCIONES_PATH = "/wms/receipts";
const FACTURAS_PROVEEDOR_PATH = "/finance/supplier-invoices";

const linkClass =
  "font-mono text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer";
const plainClass = "font-mono text-sm font-semibold text-slate-800 dark:text-white";

/**
 * Recepciones con que regresó la SM y las facturas de maquila que nacieron de
 * ellas (nucleo-erp #1239, EC-919). Siempre se listan con folio y estatus; las
 * canceladas van atenuadas, no ocultas.
 *
 * - El folio de una recepción abre su detalle solo con acceso a Recepciones
 *   (`R-WMS-RECEPCIONES`, la regla de `/wms/receipts`).
 * - El de una factura lleva a Facturas de proveedor filtrado por la SM y con
 *   esa factura abierta, solo con acceso a Finanzas (`R-CONTABILIDAD`).
 * - El importe de una factura solo sale si el backend manda `total` (lo omite
 *   sin `R-PRODUCCION-COSTOS`).
 */
export function SalidaMaquilaDocumentos({ salida }: { salida: SalidaMaquila }) {
  const { isPending, user } = useRouteAccess();
  const canOpenReceipts = !isPending && canAccessRoute(RECEPCIONES_PATH, user);
  const canOpenInvoices = !isPending && canAccessRoute(FACTURAS_PROVEEDOR_PATH, user);
  const [receiptId, setReceiptId] = useState<number | null>(null);

  const recepciones = salida.recepciones;
  const facturas = salida.facturas_proveedor;
  // Un backend anterior a #1239 no manda ninguna de las dos: no hay qué mostrar.
  if (recepciones === undefined && facturas === undefined) return null;

  const folioRecepcion = new Map((recepciones ?? []).map((r) => [r.id, salidaMaquilaDocumentoEtiqueta(r)]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <SectionTitle>Recepciones</SectionTitle>
        {!recepciones || recepciones.length === 0 ? (
          <EmptyLines>Aún no regresa nada en WMS.</EmptyLines>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            {recepciones.map((r) => {
              const etiqueta = salidaMaquilaDocumentoEtiqueta(r);
              const label = getReceiptEstatusLabel(r.estatus);
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${
                    r.estatus === RECEPCION_CANCELADA ? "opacity-50" : ""
                  }`}
                >
                  {canOpenReceipts ? (
                    <button
                      type="button"
                      className={linkClass}
                      title="Ver detalle"
                      onClick={() => setReceiptId(r.id)}
                    >
                      {etiqueta}
                    </button>
                  ) : (
                    <span className={plainClass}>{etiqueta}</span>
                  )}
                  <StatusBadge status={label} config={RECEIPT_STATUS_CONFIG} />
                  <span className="ml-auto text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {r.fecha_recepcion ? formatShortDateTime(r.fecha_recepcion) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <SectionTitle>Facturas de maquila</SectionTitle>
        {!facturas || facturas.length === 0 ? (
          <EmptyLines>Sin facturas: nacen al recibir la SM.</EmptyLines>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            {facturas.map((f) => {
              const etiqueta = salidaMaquilaDocumentoEtiqueta(f);
              const total = f.total ?? null;
              return (
                <li
                  key={f.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${
                    f.estatus === FACTURA_CANCELADA ? "opacity-50" : ""
                  }`}
                >
                  {canOpenInvoices ? (
                    <Link
                      href={supplierInvoicesHref(null, { salidaMaquilaId: salida.id, facturaId: f.id })}
                      className={linkClass}
                      title="Ver factura"
                    >
                      {etiqueta}
                    </Link>
                  ) : (
                    <span className={plainClass}>{etiqueta}</span>
                  )}
                  <StatusBadge status={f.estatus} config={FACTURA_PROVEEDOR_ESTATUS_CONFIG} />
                  {f.recepcion !== null && (
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {folioRecepcion.get(f.recepcion) ?? `#${f.recepcion}`}
                    </span>
                  )}
                  {total !== null && (
                    <span className="ml-auto text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                      {formatAmountNoCurrency(total)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ReceiptDetailDialog
        receiptId={receiptId}
        open={receiptId !== null}
        onOpenChange={(open) => !open && setReceiptId(null)}
      />
    </div>
  );
}

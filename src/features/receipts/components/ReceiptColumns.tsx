"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { FolioButton } from "@/src/components/FolioButton";
import { tipoCompraLabel } from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
import { formatShortDate } from "@/src/utils/formatDate";
import { getMexicoTimeHHMM, MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import type { Receipt } from "../interfaces/receipt.interface";
import { getReceiptEstatusLabel } from "../constants/receiptStatus";
import { receiptTipoOrigenLabel } from "../constants/receiptOrigin";
import { RECEIPT_ALCANCE_LABEL, receiptAlcance } from "../utils/receiptAlcance";
import {
  receiptInspeccionLabel,
  receiptPedidosText,
} from "../utils/receiptInspeccion";
import { exportNum } from "@/src/utils/listExport";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { ReceiptStatusTracker } from "./ReceiptStatusTracker";

const columnHelper = createColumnHelper<Receipt>();

/** Folio de lo que se recibió: la OC, la OP o la SM. */
export const receiptOrigenFolio = (r: Receipt): string =>
  r.orden_compra_folio ?? r.op_folio ?? r.salida_maquila_folio ?? "";

/** "Jesús Alberto Ibarra Morales" → "Jesús Ibarra": nombre y primer apellido. */
const nombreCorto = (nombre: string): string => {
  const p = nombre.trim().split(/\s+/);
  if (p.length <= 2) return p.join(" ");
  return `${p[0]} ${p[p.length - 2]}`;
};

const ORIGEN_TONE: Record<string, string> = {
  OC: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30",
  OP: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-500/30",
  SM: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
};

/**
 * Columnas del listado WMS de recepciones. Sin columna de acciones: la única
 * acción es ver el detalle y vive en el folio (`onViewDetail`; el diálogo, uno
 * solo, está en `ReceiptView`).
 *
 * Los accessors devuelven TEXTO con todo lo que muestra la celda, para que la
 * búsqueda global encuentre el folio de origen, la remisión, el almacén…
 */
export const getReceiptColumns = ({
  onViewDetail,
}: {
  onViewDetail: (receipt: Receipt) => void;
}) =>
  [
    // ── Recepción: folio + cuándo ──────────────────────────────────────
    columnHelper.accessor((r) => `${r.folio} ${r.usuario_nombre ?? ""}`, {
      id: "folio",
      header: "Recepción",
      sortingFn: (a, b) =>
        (a.original.folio ?? "").localeCompare(b.original.folio ?? "", "es", {
          numeric: true,
        }),
      cell: ({ row }) => (
        <span className="flex flex-col items-start leading-tight">
          <FolioButton
            folio={row.original.folio}
            onClick={() => onViewDetail(row.original)}
          />
          {row.original.fecha_recepcion && (
            <span className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {formatShortDate(row.original.fecha_recepcion, {
                timeZone: MEXICO_TIME_ZONE,
              })}
              {row.original.fecha_recepcion.includes("T") &&
                ` · ${getMexicoTimeHHMM(row.original.fecha_recepcion)}`}
            </span>
          )}
          {row.original.usuario_nombre && (
            <span
              className="mt-0.5 max-w-40 truncate text-[11px] text-slate-400 dark:text-slate-500"
              title={`Registró: ${row.original.usuario_nombre}`}
            >
              por {nombreCorto(row.original.usuario_nombre)}
            </span>
          )}
        </span>
      ),
    }),

    // ── Pedido(s) ligado(s): el principal + "+N" ──────────────────────
    columnHelper.accessor((r) => receiptPedidosText(r.pedidos), {
      id: "pedido",
      header: "Pedido",
      cell: ({ row }) => {
        const pedidos = row.original.pedidos ?? [];
        if (pedidos.length === 0)
          return (
            <span className="text-sm text-slate-300 dark:text-slate-600">
              —
            </span>
          );
        const [principal, ...otros] = pedidos;
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <PedidoFolioLink
              pedidoId={principal.id}
              folio={principal.folio}
              from="receipts"
              className="font-mono text-[13px] font-semibold text-slate-700 dark:text-slate-200"
            />
            {otros.length > 0 && (
              <span
                className="rounded-full bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                title={receiptPedidosText(otros)}
              >
                +{otros.length}
              </span>
            )}
          </span>
        );
      },
    }),

    // ── Origen: tipo + folio (+ MP/PT o el origen de la SM) ───────────
    columnHelper.accessor(
      (r) =>
        `${receiptTipoOrigenLabel(r.tipo_origen)} ${receiptOrigenFolio(r)} ${r.salida_maquila_origen_folio ?? ""}`,
      {
        id: "origen",
        header: "Origen",
        cell: ({ row }) => {
          const r = row.original;
          const folio = receiptOrigenFolio(r);
          const detalle =
            r.tipo_origen === "SM"
              ? r.salida_maquila_origen_folio &&
                `de ${r.salida_maquila_origen_folio}`
              : r.orden_compra_tipo_compra
                ? tipoCompraLabel(r.orden_compra_tipo_compra)
                : r.salida_maquila_folio
                  ? `regreso de ${r.salida_maquila_folio}`
                  : null;
          return (
            <span className="flex items-center gap-2 min-w-0">
              <span
                title={receiptTipoOrigenLabel(r.tipo_origen)}
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                  ORIGEN_TONE[r.tipo_origen] ??
                  "bg-slate-100 text-slate-600 ring-slate-200"
                }`}
              >
                {r.tipo_origen}
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {folio || "—"}
                </span>
                {detalle && (
                  <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {detalle}
                  </span>
                )}
              </span>
            </span>
          );
        },
      },
    ),

    // ── Proveedor / almacén destino ───────────────────────────────────
    // Remisión y factura van aquí, bajo el proveedor que las emitió.
    columnHelper.accessor(
      (r) =>
        `${r.proveedor_nombre ?? ""} ${r.almacen_nombre ?? ""} ${r.remision ?? ""} ${r.factura_referencia ?? ""}`,
      {
        id: "proveedor_nombre",
        header: "Proveedor / Almacén",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex min-w-0 max-w-56 flex-col leading-tight">
              <span
                className={`truncate text-sm ${
                  r.proveedor_nombre
                    ? "font-medium text-slate-800 dark:text-slate-100"
                    : "italic text-slate-400"
                }`}
                title={r.proveedor_nombre ?? undefined}
              >
                {r.proveedor_nombre || "Interno"}
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3 w-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 21V9l9-6 9 6v12M7 21v-8h10v8" />
                </svg>
                {r.almacen_nombre || "—"}
              </span>
              {(r.remision || r.factura_referencia) && (
                <span className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {r.remision && (
                    <>
                      Rem.{" "}
                      <b className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {r.remision}
                      </b>
                    </>
                  )}
                  {r.remision && r.factura_referencia && " · "}
                  {r.factura_referencia && (
                    <>
                      Fact.{" "}
                      <b className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {r.factura_referencia}
                      </b>
                    </>
                  )}
                </span>
              )}
            </span>
          );
        },
      },
    ),

    // ── Piezas recibidas + resultado de calidad ───────────────────────
    columnHelper.accessor((r) => exportNum(r.piezas_recibidas), {
      id: "piezas",
      header: "Piezas",
      meta: { align: "right" },
      cell: ({ row }) => {
        const r = row.original;
        const piezas = exportNum(r.piezas_recibidas);
        const renglones = r.renglones ?? 0;
        const inspeccionada = Boolean(r.inspeccion_estado);
        const rechazadas = exportNum(r.piezas_rechazadas);
        return (
          <span className="flex flex-col items-end leading-tight tabular-nums">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {piezas.toLocaleString("es-MX", { maximumFractionDigits: 4 })}{" "}
              <span className="text-[11px] font-normal text-slate-400">
                pzas
              </span>
            </span>
            {renglones > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {renglones} {renglones === 1 ? "renglón" : "renglones"}
              </span>
            )}
            {inspeccionada && (
              <span
                className="mt-0.5 text-[11px] font-semibold"
                title={receiptInspeccionLabel(r.inspeccion_estado)}
              >
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ {exportNum(r.piezas_aprobadas)}
                </span>
                {rechazadas > 0 && (
                  <span className="ml-1.5 text-rose-600 dark:text-rose-400">
                    ✕ {rechazadas}
                  </span>
                )}
              </span>
            )}
          </span>
        );
      },
    }),

    // ── Estatus como tracker de pasos ─────────────────────────────────
    // El valor es la ETIQUETA: la búsqueda ("calidad", "cerrada") y el orden
    // trabajan sobre lo que se ve.
    columnHelper.accessor(
      (row) => {
        const alcance = receiptAlcance(row);
        return `${getReceiptEstatusLabel(row.estatus)}${alcance ? ` ${RECEIPT_ALCANCE_LABEL[alcance]}` : ""} ${receiptInspeccionLabel(row.inspeccion_estado)}`;
      },
      {
        id: "estatus",
        header: "Estatus",
        cell: ({ row }) => <ReceiptStatusTracker receipt={row.original} />,
      },
    ),
  ] as ColumnDef<Receipt>[];

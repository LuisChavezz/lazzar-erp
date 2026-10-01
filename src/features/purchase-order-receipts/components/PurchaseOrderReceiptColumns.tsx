"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type { DataTableFilterOption } from "@/src/components/DataTable";
import { ColumnHeaderFilter } from "@/src/components/ColumnHeaderFilter";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { formatLocalDate } from "@/src/utils/formatDate";
import { PurchaseOrderReceiptDetailDialog } from "./PurchaseOrderReceiptDetailDialog";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import {
  getReceiptEstatusLabel,
  RECEIPT_STATUS_CONFIG,
} from "@/src/features/receipts/constants/receiptStatus";

// ── Filtro exacto por columna ────────────────────────────────────────────────
// Mismo criterio que `PurchaseOrderColumns.tsx`: el valor a comparar es un
// campo crudo de `row.original` (estatus/proveedor), no lo que la columna
// muestra tal cual (el folio+remisión concatenados, el nombre traducido…).
const exactFilterFn =
  <K extends keyof PurchaseOrderReceipt>(pick: (row: PurchaseOrderReceipt) => PurchaseOrderReceipt[K]) =>
  (row: { original: PurchaseOrderReceipt }, _columnId: string, filterValue: string) => {
    if (!filterValue) return true;
    return String(pick(row.original)) === filterValue;
  };

/**
 * Celda de la OC de origen. Enlaza al detalle de la orden solo si el usuario
 * tiene `R-COMPRAS-OC`, que es lo que exige esa ruta en `routePermissions`
 * (`/procurement/purchase-orders`); sin él el proxy lo redirigiría, así que el
 * folio se pinta como texto. `?from=` hace que el "Volver" del detalle regrese
 * a Recepciones (ver `purchaseOrderDetailOrigins`).
 */
const PurchaseOrderFolioCell = ({ receipt }: { receipt: PurchaseOrderReceipt }) => {
  const { data: session } = useSession();

  if (!hasPermission("R-COMPRAS-OC", session?.user)) {
    return (
      <span className="font-mono text-slate-700 dark:text-slate-200">
        {receipt.orden_compra_folio}
      </span>
    );
  }

  return (
    <Link
      href={purchaseOrderDetailHref(receipt.orden_compra, "purchase-order-receipts")}
      className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
      title="Ver orden de compra"
    >
      {receipt.orden_compra_folio}
    </Link>
  );
};

/**
 * Celda de Folio: punto de estatus (color y etiqueta del mismo
 * `RECEIPT_STATUS_CONFIG` que usa WMS/Recepciones) + folio + mini-pills de
 * estatus y de remisión (esta se omite cuando no hay remisión capturada). El folio ABRE el mismo
 * diálogo de detalle que antes vivía detrás de "Ver Detalles" en la columna
 * Acciones — esta vista no tiene página propia de detalle (es un `MainDialog`,
 * no una ruta), así que a diferencia de Órdenes de Compra/Pedidos el folio no
 * navega, abre el diálogo directamente. Con un solo ítem de menú posible
 * ("Ver Detalles"), la columna Acciones entera sobraba.
 */
const FolioCell = ({ receipt }: { receipt: PurchaseOrderReceipt }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const estatusLabel = getReceiptEstatusLabel(receipt.estatus);
  const estatusCfg = RECEIPT_STATUS_CONFIG[estatusLabel];

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${estatusCfg?.dot ?? "bg-slate-400"}`}
        title={estatusLabel}
        aria-hidden="true"
      />
      <div className="flex flex-col items-start gap-1 min-w-0">
        <button
          type="button"
          onClick={() => setIsDetailOpen(true)}
          className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          title="Ver detalle"
        >
          {receipt.folio || "—"}
        </button>
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${
              estatusCfg?.cls ?? "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
            }`}
          >
            {estatusLabel}
          </span>
          {receipt.remision && (
            <span
              className="inline-flex max-w-32 items-center truncate px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
              title={`Remisión: ${receipt.remision}`}
            >
              {receipt.remision}
            </span>
          )}
        </div>
      </div>
      <PurchaseOrderReceiptDetailDialog
        receiptId={isDetailOpen ? receipt.id : null}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
};

export interface CreatePurchaseOrderReceiptColumnsOptions {
  statusOptions: DataTableFilterOption[];
  supplierOptions: DataTableFilterOption[];
}

/**
 * Fábrica de columnas — no un arreglo estático como antes, porque los
 * filtros de encabezado (Estatus, Proveedor) necesitan las opciones
 * construidas a partir de TODO el listado (`PurchaseOrderReceiptsFilter.ts`),
 * que `PurchaseOrderReceiptList` recalcula con `useMemo`.
 *
 * Vista de Compras (solo lectura) sobre recepciones tipo OC.
 * `PurchaseOrderReceipt` afirma que proveedor/orden de compra siempre están
 * presentes en esta vista filtrada server-side, así que sus columnas no
 * necesitan fallback `|| "—"`.
 */
export const createPurchaseOrderReceiptColumns = ({
  statusOptions,
  supplierOptions,
}: CreatePurchaseOrderReceiptColumnsOptions): ColumnDef<PurchaseOrderReceipt>[] => [
  // Folio+remisión+estatus concatenados en el `accessorFn` (con `?? ""` por el
  // mismo motivo de búsqueda global que el resto de columnas de listado
  // nullable del proyecto) para que el buscador encuentre por cualquiera de
  // los tres (p. ej. "calidad"), aunque el `cell` pinte su propio layout desde
  // `row.original`. El folio va primero, así que el orden sigue siendo por folio.
  {
    id: "folio",
    accessorFn: (row) =>
      `${row.folio ?? ""} ${row.remision ?? ""} ${getReceiptEstatusLabel(row.estatus)}`.trim(),
    meta: { label: "Folio" },
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Folio</span>
        <ColumnHeaderFilter
          column={column}
          options={[{ value: undefined, label: "Todos" }, ...statusOptions]}
          label="estatus"
        />
      </div>
    ),
    filterFn: exactFilterFn((row) => row.estatus),
    cell: ({ row }) => <FolioCell receipt={row.original} />,
  },
  {
    accessorKey: "orden_compra_folio",
    header: "Orden de Compra",
    cell: ({ row }) => <PurchaseOrderFolioCell receipt={row.original} />,
  },
  {
    accessorKey: "proveedor_nombre",
    meta: { label: "Proveedor" },
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Proveedor</span>
        <ColumnHeaderFilter
          column={column}
          options={[{ value: undefined, label: "Todos" }, ...supplierOptions]}
          label="proveedor"
        />
      </div>
    ),
    filterFn: exactFilterFn((row) => row.proveedor),
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200">
        {row.original.proveedor_nombre}
      </span>
    ),
  },
  {
    accessorKey: "almacen_nombre",
    header: "Almacén",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.almacen_nombre || "—"}
      </span>
    ),
  },
  {
    accessorKey: "fecha_recepcion",
    header: "Fecha de Recepción",
    cell: ({ row }) => (
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        {formatLocalDate(row.original.fecha_recepcion)}
      </span>
    ),
  },
];

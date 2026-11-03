"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronRightIcon } from "@/src/components/Icons";
import { ColumnHeaderFilter } from "@/src/components/ColumnHeaderFilter";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { formatLocalDate } from "@/src/utils/formatDate";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { ColumnHeaderDateRangeFilter } from "@/src/components/ColumnHeaderDateRangeFilter";
import { SupplierCatalogHeaderFilter } from "@/src/features/suppliers/components/SupplierCatalogHeaderFilter";
import { usePurchaseOrderReceiptRowActionsContext } from "../hooks/usePurchaseOrderReceiptRowActions";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { createTipoCompraColumn } from "@/src/features/receipts/components/TipoCompraColumn";
import {
  getReceiptEstatusLabel,
  RECEIPT_STATUS_CONFIG,
} from "@/src/features/receipts/constants/receiptStatus";
import { RECEIPT_ESTATUS_VALUES } from "../hooks/usePurchaseOrderReceiptsTable";

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
 * ("Ver Detalles"), la columna Acciones entera sobraba. El diálogo vive en
 * `PurchaseOrderReceiptList` (la celda solo avisa por contexto): una celda se
 * desmonta al refrescar, paginar u ordenar.
 */
const FolioCell = ({ receipt }: { receipt: PurchaseOrderReceipt }) => {
  const { onViewDetail } = usePurchaseOrderReceiptRowActionsContext();
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
          onClick={() => onViewDetail(receipt)}
          className="group inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          title="Ver detalle"
        >
          {receipt.folio || "—"}
          <ChevronRightIcon
            className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
            aria-hidden="true"
          />
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
    </div>
  );
};

/** Los estatus del backend con su punto de color: el menú es la leyenda. */
const ESTATUS_OPTIONS = [
  ALL_FILTER_OPTION,
  ...RECEIPT_ESTATUS_VALUES.map((estatus) => {
    const label = getReceiptEstatusLabel(Number(estatus));
    return { value: estatus, label, dotClassName: RECEIPT_STATUS_CONFIG[label]?.dot };
  }),
];

/**
 * Columnas del listado de recepciones de compra, para la tabla en MODO
 * SERVIDOR (`usePurchaseOrderReceiptsTable`): el backend filtra, busca, ordena
 * y pagina, así que ninguna columna filtra en memoria.
 *
 * - `meta.serverSort` = el campo de `ordering` del backend (lista blanca en
 *   `purchaseOrderReceiptsTable`); `meta.serverFilter` = la clave del filtro
 *   que controla el encabezado de esa columna.
 * - Las opciones de los filtros son fijas o salen del catálogo de proveedores,
 *   nunca de las filas: la tabla solo tiene una página.
 * - Orden de compra y almacén ordenan pero no filtran: el endpoint no acepta
 *   esos filtros.
 *
 * Vista de Compras (solo lectura) sobre recepciones tipo OC.
 * `PurchaseOrderReceipt` afirma que proveedor/orden de compra siempre están
 * presentes en esta vista filtrada server-side, así que sus columnas no
 * necesitan fallback `|| "—"`.
 */
export const purchaseOrderReceiptColumns: ColumnDef<PurchaseOrderReceipt>[] = [
  // Folio + estatus + remisión en una celda; el filtro de encabezado es por
  // ESTATUS (el punto de color vive aquí) y la columna ordena por `folio`.
  {
    id: "folio",
    accessorFn: (row) => row.folio ?? "",
    meta: { label: "Folio", serverSort: "folio", serverFilter: "estatus" },
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Folio</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_OPTIONS} label="estatus" />
      </div>
    ),
    cell: ({ row }) => <FolioCell receipt={row.original} />,
  },
  {
    accessorKey: "orden_compra_folio",
    header: "Orden de Compra",
    meta: { label: "Orden de Compra", serverSort: "orden_compra__folio" },
    cell: ({ row }) => <PurchaseOrderFolioCell receipt={row.original} />,
  },
  // Columna compartida con la vista de WMS (ver `TipoCompraColumn.tsx`). En
  // modo servidor su filtro va a `?tipo_compra=` (MP/PT, mismos valores que
  // sus opciones fijas); `filterFn` queda inerte (`manualFiltering`).
  {
    ...createTipoCompraColumn<PurchaseOrderReceipt>(),
    meta: {
      label: "Tipo de compra",
      serverSort: "orden_compra__tipo_compra",
      serverFilter: "tipo_compra",
    },
  },
  {
    accessorKey: "proveedor_nombre",
    meta: { label: "Proveedor", serverSort: "proveedor__nombre", serverFilter: "proveedor" },
    header: ({ column }) => <SupplierCatalogHeaderFilter column={column} title="Proveedor" />,
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200">
        {row.original.proveedor_nombre}
      </span>
    ),
  },
  {
    accessorKey: "almacen_nombre",
    header: "Almacén",
    meta: { label: "Almacén", serverSort: "almacen__nombre" },
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.almacen_nombre || "—"}
      </span>
    ),
  },
  // Rango libre de fechas sobre el día de `fecha_recepcion`.
  {
    accessorKey: "fecha_recepcion",
    meta: { label: "Fecha de Recepción", serverSort: "fecha_recepcion" },
    header: () => (
      <div className="flex items-center gap-1.5">
        <span>Fecha de Recepción</span>
        <ColumnHeaderDateRangeFilter
          label="fecha de recepción"
          fromKey="fecha_desde"
          toKey="fecha_hasta"
        />
      </div>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        {formatLocalDate(row.original.fecha_recepcion)}
      </span>
    ),
  },
];

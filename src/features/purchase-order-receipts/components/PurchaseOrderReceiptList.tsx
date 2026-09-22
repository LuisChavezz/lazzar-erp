"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataTableVisibleColumn } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { createPurchaseOrderReceiptColumns } from "./PurchaseOrderReceiptColumns";
import { buildReceiptStatusOptions, buildReceiptSupplierOptions } from "./PurchaseOrderReceiptsFilter";
import { usePurchaseOrderReceipts } from "../hooks/usePurchaseOrderReceipts";
import { usePurchaseOrderReceiptCsvExport } from "../hooks/usePurchaseOrderReceiptCsvExport";
import { usePurchaseOrderReceiptPdfExport } from "../hooks/usePurchaseOrderReceiptPdfExport";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

export const PurchaseOrderReceiptList = () => {
  const { receipts, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    usePurchaseOrderReceipts();

  // Un refetch fallido transitorio no debe descartar la tabla ya cargada;
  // solo se trata como error "de pantalla completa" si nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  // ── Opciones de los filtros de encabezado ─────────────────────────────────
  // Alimentan los desplegables de Folio (Estatus) y Proveedor dentro de
  // `createPurchaseOrderReceiptColumns` (ver `ColumnHeaderFilter`).
  const statusOptions = useMemo(() => buildReceiptStatusOptions(receipts), [receipts]);
  const supplierOptions = useMemo(() => buildReceiptSupplierOptions(receipts), [receipts]);
  const columns = useMemo(
    () => createPurchaseOrderReceiptColumns({ statusOptions, supplierOptions }),
    [statusOptions, supplierOptions],
  );

  // ── Exportar (Excel/PDF) ──────────────────────────────────────────────────
  // Exportan lo que el usuario está VIENDO (`onVisibleRowsChange`/
  // `onVisibleColumnsChange`: ya filtrado/ordenado). Mismo patrón que
  // `PurchaseOrderView`.
  const [visibleReceipts, setVisibleReceipts] = useState<PurchaseOrderReceipt[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<
    DataTableVisibleColumn<PurchaseOrderReceipt>[]
  >([]);
  usePurchaseOrderReceiptCsvExport(visibleReceipts, visibleColumns);
  usePurchaseOrderReceiptPdfExport(visibleReceipts, visibleColumns);

  return (
    <div className="h-full flex flex-col min-h-0">
    <DataTable
      columns={columns}
      data={receipts}
      baseDataCount={receipts.length}
      searchPlaceholder="Buscar por folio, orden de compra o proveedor..."
      searchAlwaysExpanded
      density="compact"
      framed
      // El cuerpo de la tabla llena su contenedor (que `page.tsx` acota a la
      // altura del viewport) en vez de reservar un alto fijo sin importar
      // cuántas filas haya — evita el scroll de página. Mismo criterio que
      // `SupplierList`/`OrderListView` (variant procurement).
      fillHeight
      defaultPageSize={20}
      onVisibleRowsChange={setVisibleReceipts}
      onVisibleColumnsChange={setVisibleColumns}
      actionButton={
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="success"
            size="icon"
            onClick={() => document.dispatchEvent(new CustomEvent("purchase-order-receipts:exportCSV"))}
            title="Exportar a Excel (CSV)"
            aria-label="Exportar recepciones a Excel"
          >
            <ExportCsvIcon className="w-4 h-4 shrink-0" />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={() => document.dispatchEvent(new CustomEvent("purchase-order-receipts:exportPDF"))}
            title="Exportar a PDF"
            aria-label="Exportar recepciones a PDF"
          >
            <ExportPdfIcon className="w-4 h-4 shrink-0" />
          </Button>
        </div>
      }
      onRefetch={refetch}
      isRefetching={isFetching}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las recepciones"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando recepciones"
    />
    </div>
  );
};

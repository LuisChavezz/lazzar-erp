"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable, type DataTableVisibleColumn } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon } from "@/src/components/Icons";
import { purchaseOrderReceiptColumns } from "./PurchaseOrderReceiptColumns";
import { PurchaseOrderReceiptDetailDialog } from "./PurchaseOrderReceiptDetailDialog";
import { PurchaseOrderReceiptRowActionsProvider } from "../hooks/usePurchaseOrderReceiptRowActions";
import {
  PURCHASE_ORDER_RECEIPTS_KEY,
  usePurchaseOrderReceiptsTable,
} from "../hooks/usePurchaseOrderReceiptsTable";
import { usePurchaseOrderReceiptCsvExport } from "../hooks/usePurchaseOrderReceiptCsvExport";
import { usePurchaseOrderReceiptPdfExport } from "../hooks/usePurchaseOrderReceiptPdfExport";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

/**
 * Recepciones de compra (origen OC) en MODO SERVIDOR: filtros, búsqueda,
 * orden y paginación los resuelve el backend y su estado vive en la URL
 * (`usePurchaseOrderReceiptsTable`). Por eso la página que lo monta lo
 * envuelve en `<Suspense>`. La vista de WMS (`ReceiptView`) sigue leyendo el
 * listado completo con su propia consulta.
 */
export const PurchaseOrderReceiptList = () => {
  const table = usePurchaseOrderReceiptsTable();
  const queryClient = useQueryClient();

  // ── Detalle ───────────────────────────────────────────────────────────────
  // El diálogo vive AQUÍ y no en la celda del folio: la celda se desmonta al
  // refrescar, paginar, ordenar o filtrar (y la fila puede salir de la página),
  // y el diálogo se cerraría con ella. Se guarda el id de la recepción —el
  // diálogo consulta su propio detalle— y `open` va aparte para que el
  // contenido no se vacíe durante la animación de cierre.
  const [detailReceiptId, setDetailReceiptId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ── Exportar (Excel/PDF) ──────────────────────────────────────────────────
  // Exportan TODO lo que cumple los criterios vigentes, no solo la página
  // visible: las filas se piden al backend al hacer clic (`fetchAllRows`).
  // Las columnas son las visibles, por `onVisibleColumnsChange`.
  const [visibleColumns, setVisibleColumns] = useState<
    DataTableVisibleColumn<PurchaseOrderReceipt>[]
  >([]);
  usePurchaseOrderReceiptCsvExport(table.fetchAllRows, visibleColumns);
  usePurchaseOrderReceiptPdfExport(table.fetchAllRows, visibleColumns);

  // Sin `fillHeight` ni contenedor de altura acotada: la página monta los
  // indicadores ENCIMA de esta lista y hace scroll normal (mismo cambio que la
  // lista de OP al recibir sus indicadores).
  return (
    <PurchaseOrderReceiptRowActionsProvider
      value={{
        onViewDetail: (receipt) => {
          setDetailReceiptId(receipt.id);
          setIsDetailOpen(true);
        },
      }}
    >
      <DataTable
        columns={purchaseOrderReceiptColumns}
        {...table.tableProps}
        // Invalida el PREFIJO y no solo la página: refresca también los
        // indicadores (`["purchase-order-receipts", "kpis"]`) que la página
        // monta encima, para que tarjetas y tabla muestren el mismo momento.
        onRefetch={() => queryClient.invalidateQueries({ queryKey: PURCHASE_ORDER_RECEIPTS_KEY })}
        // Identidad de la fila por registro, no por posición en la página.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por folio, orden de compra o proveedor..."
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
        emptyMessage="Aún no hay recepciones registradas"
        errorTitle="Error al cargar las recepciones"
        loadingAriaLabel="Cargando recepciones"
      />

      <PurchaseOrderReceiptDetailDialog
        receiptId={detailReceiptId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </PurchaseOrderReceiptRowActionsProvider>
  );
};

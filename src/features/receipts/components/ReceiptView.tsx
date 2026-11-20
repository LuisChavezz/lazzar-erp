"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableHandle } from "@/src/components/DataTable";
import { ListExportButtons } from "@/src/components/ListExportButtons";
import { useListExport } from "@/src/hooks/useListExport";
import { ListTabs } from "@/src/components/ListTabs";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { receiptTipoOrigenLabel } from "../constants/receiptOrigin";
import { getReceiptEstatusLabel } from "../constants/receiptStatus";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ReceiptStepManager } from "./ReceiptStepManager";
import { useReceipts } from "../hooks/useReceipts";
import { getReceiptColumns } from "./ReceiptColumns";
import { ReceiptDetailDialog } from "./ReceiptDetailDialog";
import { RECEIPT_EXPORT_COLUMNS } from "../utils/receiptExport";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { receiptFlowSubtitle } from "../utils/receiptCandidates";
import type { ReceiptOrderCandidate } from "../interfaces/receipt-onboarding.interface";
import type { Receipt } from "../interfaces/receipt.interface";

// ─── View ──────────────────────────────────────────────────────────────────

type ReceiptTab = "pendientes" | "completas" | "canceladas";

/** 1 Borrador, 3 Parcial, 4 En calidad → pendientes; 2 Recibida, 5 Cerrada → completas; 6 → canceladas. */
const receiptTabOf = (estatus: number): ReceiptTab =>
  estatus === 6 ? "canceladas" : estatus === 2 || estatus === 5 ? "completas" : "pendientes";

export function ReceiptView() {
  const {
    data: receipts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReceipts();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Pendientes: aún en proceso (borrador, parcial, en calidad). Completas:
  // recibidas o cerradas. Canceladas aparte para no mezclarlas con lo hecho.
  const [tab, setTab] = useState<ReceiptTab>("pendientes");
  const porTab = (t: ReceiptTab) => receipts.filter((r) => receiptTabOf(r.estatus) === t);
  const visibles = porTab(tab);
  // Lo elegido en el paso 1, solo para el subtítulo del diálogo (OC, OP o SM).
  const [selectedCandidate, setSelectedCandidate] = useState<ReceiptOrderCandidate | null>(null);
  // Al cerrar, el asistente se desmonta y vuelve a empezar sin selección.
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setSelectedCandidate(null);
  };

  // Ver el listado exige `R-WMS-RECEPCIONES` (ver `routePermissions`); dar de
  // alta exige además `C-WMS-RECEPCIONES`. `hasPermission` ya cortocircuita
  // para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-RECEPCIONES", session?.user);
  // Un solo diálogo de detalle para toda la tabla (no uno por fila).
  const [detailId, setDetailId] = useState<number | null>(null);
  const columns = getReceiptColumns({ onViewDetail: (r) => setDetailId(r.id) });

  // Excel/PDF: EXACTAMENTE las filas que deja ver la tabla (pestaña, filtros
  // de encabezado, búsqueda y orden).
  const tableRef = useRef<DataTableHandle<Receipt>>(null);
  const { exportCsv, exportPdf } = useListExport({
    getRows: () => tableRef.current?.getFilteredRows() ?? [],
    columns: RECEIPT_EXPORT_COLUMNS,
    title: "Recepciones",
    fileName: "recepciones",
    summary: (rows) => `${rows.length} recepci${rows.length === 1 ? "ón" : "ones"}`,
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* ── KPIs — pending implementation ─────────────────────────────── */}

      {/* ── Table ──────────────────────────────────────────────────────────
          La tabla se monta SIEMPRE: su cuerpo alterna carga/error/tabla y su
          toolbar (con "Nueva Recepción") permanece disponible. El estado de
          error ofrece "Reintentar" vía `onErrorRetry` —misma capacidad que el
          `ErrorDisplay` que antes se mostraba a pantalla completa, pero
          conservando el toolbar—. `fillHeight`: el cuerpo llena el
          contenedor de altura acotada que da `wms/receipts/page.tsx`, en vez
          de reservar un alto fijo sin importar cuántas filas haya. */}
      <ListTabs
        ariaLabel="Recepciones por estado"
        value={tab}
        onChange={setTab}
        isReady={!isLoading}
        tabs={[
          { key: "pendientes", label: "Pendientes", count: porTab("pendientes").length },
          { key: "completas", label: "Completas", count: porTab("completas").length },
          { key: "canceladas", label: "Canceladas", count: porTab("canceladas").length },
        ]}
      />
      <div className="h-2 shrink-0" />
      <DataTable
        key={tab}
        ref={tableRef}
        columns={withHeaderFilters(columns, visibles, {
          folio: { type: "month", get: (r) => r.fecha_recepcion, filterLabel: "mes de recepción" },
          pedido: {
            type: "distinct",
            get: (r) => r.pedidos?.[0]?.folio,
            searchable: true,
            emptyOption: "Sin pedido",
            filterLabel: "pedido",
          },
          origen: {
            type: "distinct",
            get: (r) => r.tipo_origen,
            label: (r) => receiptTipoOrigenLabel(r.tipo_origen),
            filterLabel: "tipo de origen",
          },
          proveedor_nombre: {
            type: "distinct",
            get: (r) => r.proveedor_nombre,
            searchable: true,
            emptyOption: "Interno (sin proveedor)",
            filterLabel: "proveedor",
          },
          piezas: { type: "presence", get: (r) => Number(r.piezas_rechazadas) || 0, con: "Con rechazos", sin: "Sin rechazos", filterLabel: "rechazos" },
          estatus: { type: "distinct", get: (r) => r.estatus, label: (r) => getReceiptEstatusLabel(r.estatus) },
        })}
        data={visibles}
        searchPlaceholder="Buscar recepción, pedido, OC, OP, proveedor..."
        fillHeight
        onRefetch={refetch}
        isRefetching={isFetching}
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar recepciones"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando recepciones"
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
          <ListExportButtons
            subject="recepciones"
            onExcel={() => void exportCsv()}
            onPdf={() => void exportPdf()}
          />
          {canCreate && (
          <MainDialog
            title={
              <DialogHeader
                title="Nueva Recepción"
                subtitle={receiptFlowSubtitle(selectedCandidate)}
                statusColor="sky"
              />
            }
            open={isDialogOpen}
            onOpenChange={handleDialogOpenChange}
            maxWidth="640px"
            showCloseButton={true}
            trigger={
              <Button
                variant="primary"
                rounded="full"
                onClick={() => setIsDialogOpen(true)}
              >
                + Nueva Recepción
              </Button>
            }
          >
            <ReceiptStepManager
              onClose={() => handleDialogOpenChange(false)}
              onSelectionChange={setSelectedCandidate}
            />
          </MainDialog>
          )}
          </div>
        }
      />
      <ReceiptDetailDialog
        receiptId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableHandle } from "@/src/components/DataTable";
import { ListExportButtons } from "@/src/components/ListExportButtons";
import { useListExport } from "@/src/hooks/useListExport";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getShipmentColumns, shipmentContenido, shipmentTransporteLabel } from "./ShippingColumns";
import { ShippingDetailDialog } from "./ShippingDetailDialog";
import { ShippingForm } from "./ShippingForm";
import { useShipments } from "../hooks/useShipments";
import type { Shipment } from "../interfaces/shipping.interface";
import { SHIPPING_EXPORT_COLUMNS } from "../utils/shippingExport";

/**
 * Vista de Envíos: el listado (`GET /wms/despachos/`) con filtros por
 * encabezado y la captura de un envío nuevo en el toolbar. El detalle se abre
 * desde el folio del embarque; su estado vive aquí, nunca en la celda (las
 * celdas se desmontan al ordenar, paginar o filtrar).
 *
 * `DataTable` se monta SIEMPRE: alterna internamente solo su área de datos,
 * así el toolbar —y `ShippingForm`— siguen visibles durante la carga y el error.
 */
export function ShippingView() {
  const { shipments, isLoading, isError, error, hasLoaded, refetch, isFetching } = useShipments();

  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-ENVIO", session?.user);
  const showError = isInitialLoadError(isError, hasLoaded);

  const [detalle, setDetalle] = useState<Shipment | null>(null);
  const dialog = useDialogSession(detalle !== null, detalle);

  // Excel/PDF: EXACTAMENTE las filas que deja ver la tabla (filtros, búsqueda y orden).
  const tableRef = useRef<DataTableHandle<Shipment>>(null);
  const { exportCsv, exportPdf } = useListExport({
    getRows: () => tableRef.current?.getFilteredRows() ?? [],
    columns: SHIPPING_EXPORT_COLUMNS,
    title: "Envíos",
    fileName: "envios",
    summary: (rows) => `${rows.length} envío${rows.length === 1 ? "" : "s"}`,
  });

  // La fecha solo existe si el backend la manda (ver `Shipment.fecha_creacion`).
  const conFecha = shipments.some((s) => Boolean(s.fecha_creacion));
  const columns = withHeaderFilters(getShipmentColumns({ onOpenDetail: setDetalle }, conFecha), shipments, {
    ...(conFecha && { fecha_creacion: { type: "month" as const, get: (r: Shipment) => r.fecha_creacion } }),
    cliente: {
      type: "distinct",
      filterLabel: "cliente",
      get: (r) => r.cliente_nombre,
      searchable: true,
    },
    transporte: {
      type: "distinct",
      filterLabel: "transporte",
      get: (r) => shipmentTransporteLabel(r),
    },
    guia: { type: "presence", get: (r) => r.guia, con: "Con guía", sin: "Sin guía" },
    contenido: {
      type: "range",
      get: (r) => shipmentContenido(r).piezas,
      ranges: [
        { value: "1-50", label: "1 a 50 pzas", min: 1, max: 50 },
        { value: "51-200", label: "51 a 200 pzas", min: 51, max: 200 },
        { value: "201+", label: "Más de 200 pzas", min: 201 },
      ],
    },
  });

  return (
    <div className="h-full flex flex-col min-h-0">
      <DataTable
        ref={tableRef}
        columns={columns}
        data={shipments}
        searchPlaceholder="Buscar embarque, pedido, cliente, guía, paquetería o chofer..."
        getRowId={(row) => String(row.id)}
        // El cuerpo llena el contenedor de altura acotada que da `wms/shipping/page.tsx`.
        fillHeight
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay envíos registrados."
        // Ver el listado exige `R-WMS-ENVIO`; dar de alta exige además `C-WMS-ENVIO`.
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            <ListExportButtons subject="envíos" onExcel={() => void exportCsv()} onPdf={() => void exportPdf()} />
            {canCreate && <ShippingForm />}
          </div>
        }
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los envíos"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando envíos"
      />
      {/* Sin fetch propio: la fila ya trae el despacho completo (listado y
          detalle comparten `DespachoSerializer`). */}
      {dialog.snapshot && (
        <ShippingDetailDialog
          key={dialog.id}
          shipment={dialog.snapshot}
          open={detalle !== null}
          onOpenChange={(open) => !open && setDetalle(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableHandle } from "@/src/components/DataTable";
import { ListExportButtons } from "@/src/components/ListExportButtons";
import { useListExport } from "@/src/hooks/useListExport";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { getShipmentColumns, shipmentPiezasVigentes, shipmentTransporteLabel } from "./ShippingColumns";
import { ShippingDetailDialog } from "./ShippingDetailDialog";
import { ShippingForm } from "./ShippingForm";
import { useShipments } from "../hooks/useShipments";
import type { Shipment, ShipmentEstado } from "../interfaces/shipping.interface";
import { SHIPPING_EXPORT_COLUMNS, shippingExportSummary } from "../utils/shippingExport";
import { SHIPMENT_ESTADO_PARAM, parseShipmentEstadoParam, withShipmentEstadoParam } from "../utils/shipmentEstadoParam";

type EstadoFilter = ShipmentEstado | "TODOS";

/** Filtro de estado del listado (`?estado=`, en el backend). */
const ESTADO_OPTIONS: { value: EstadoFilter; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "ACTIVO", label: "Activos" },
  { value: "CANCELADO", label: "Cancelados" },
];

/**
 * Vista de Envíos: el listado (`GET /wms/despachos/`) con filtros por
 * encabezado, el filtro de estado (`?estado=`, en el backend, EC-945) y la
 * captura de un envío nuevo en el toolbar. El filtro de estado vive en la URL
 * (`?estado=ACTIVO|CANCELADO`; "Todos" sin parámetro), así que la página que lo
 * monta lo envuelve en `<Suspense>`. El detalle se abre
 * desde el folio del embarque; su estado vive aquí, nunca en la celda (las
 * celdas se desmontan al ordenar, paginar o filtrar).
 *
 * `DataTable` se monta SIEMPRE: alterna internamente solo su área de datos,
 * así el toolbar —y `ShippingForm`— siguen visibles durante la carga y el error.
 */
export function ShippingView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const estadoParam = parseShipmentEstadoParam(searchParams.get(SHIPMENT_ESTADO_PARAM));
  const estado: EstadoFilter = estadoParam ?? "TODOS";
  // `history.replaceState`, como los listados en modo servidor: cambiar el filtro
  // no es navegar (Atrás regresa a la pantalla anterior) y Next sincroniza
  // `useSearchParams` con él.
  const setEstado = (value: EstadoFilter) => {
    const qs = withShipmentEstadoParam(searchParams.toString(), value === "TODOS" ? null : value);
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };
  const { shipments, isLoading, isError, error, hasLoaded, refetch, isFetching } = useShipments(estadoParam);

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
    summary: shippingExportSummary,
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
      // Un envío cancelado no entra en ningún rango: sus piezas regresaron al almacén.
      get: shipmentPiezasVigentes,
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
        // Otro estado es otro conjunto: vuelve a la página 1 sin tocar orden ni búsqueda.
        paginationResetKey={estado}
        // El cuerpo llena el contenedor de altura acotada que da `wms/shipping/page.tsx`.
        fillHeight
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay envíos registrados."
        // Ver el listado exige `R-WMS-ENVIO`; dar de alta exige además `C-WMS-ENVIO`.
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            <SegmentedControl
              options={ESTADO_OPTIONS}
              value={estado}
              onChange={setEstado}
              className="[&>button]:px-3! [&>button]:py-1.5!"
            />
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
          // La fila VIVA del listado si sigue en él (tras cancelar trae el nuevo
          // estado); si no, la copia de cuando se abrió.
          shipment={shipments.find((row) => row.id === dialog.snapshot?.id) ?? dialog.snapshot}
          open={detalle !== null}
          onOpenChange={(open) => !open && setDetalle(null)}
        />
      )}
    </div>
  );
}

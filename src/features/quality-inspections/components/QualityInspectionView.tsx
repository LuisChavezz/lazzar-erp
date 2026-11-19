"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { ListTabs } from "@/src/components/ListTabs";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useReceipts } from "@/src/features/receipts/hooks/useReceipts";
import { useQualityInspectionOnboarding } from "../hooks/useQualityInspectionOnboarding";
import { useQualityInspections } from "../hooks/useQualityInspections";
import {
  getQualityDoneColumns,
  getQualityPendingColumns,
  QUALITY_ESTADO_CFG,
  type QualityDoneRow,
  type QualityPendingRow,
} from "./QualityInspectionColumns";
import { QualityInspectionDialog } from "./QualityInspectionDialog";
import { QualityInspectionResultDialog } from "./QualityInspectionResultDialog";
import type { QualityInspection, QualityPedidoRef, QualityPendingReception } from "../interfaces/quality-inspection.interface";

/** Tope de `recepciones_pendientes` en el backend (`recepciones_qs[:50]`). */
const BACKEND_PENDING_LIMIT = 50;

type Tab = "pendientes" | "inspeccionadas";

const TIPO_LABEL: Record<string, string> = { OC: "Orden de compra", OP: "Orden de producción", SM: "Salida a maquila" };

export function QualityInspectionView() {
  const [tab, setTab] = useState<Tab>("pendientes");
  const { data, isLoading, isError, error, refetch, isFetching } = useQualityInspectionOnboarding();
  const done = useQualityInspections();
  // El onboarding no trae el folio de origen (OC/OP/SM) ni el nombre del
  // almacén; el listado de recepciones sí. Si aún no carga, la columna queda en "—".
  const { data: receipts } = useReceipts();
  const receiptById = new Map((receipts ?? []).map((r) => [r.id, r]));
  const origenDe = (id: number) => {
    const r = receiptById.get(id) as
      | (NonNullable<typeof receipts>[number] & { salida_maquila_folio?: string | null })
      | undefined;
    return r?.orden_compra_folio ?? r?.op_folio ?? r?.salida_maquila_folio ?? "";
  };

  // nucleo-erp #1272: `pedidos` (principal primero); `pedido_id` solo si aún no llega el arreglo.
  const pedidosDe = (x: { pedidos?: QualityPedidoRef[]; pedido_id?: number | null; pedido_folio?: string | null }) =>
    x.pedidos ?? (x.pedido_id ? [{ id: x.pedido_id, folio: x.pedido_folio ?? null }] : []);

  const recepciones = data?.recepciones_pendientes ?? [];
  const inspectores = data?.inspectores ?? [];

  // Ver la bandeja exige `R-WMS-CALIDAD`; registrar exige además `C-WMS-CALIDAD`
  // (solo control de interfaz: el backend no valida permisos de Calidad).
  const { data: session } = useSession();
  const canSubmit = hasPermission("C-WMS-CALIDAD", session?.user);

  // Diálogos aquí, no en la celda: la fila sale de "Pendientes" al registrar.
  const [selected, setSelected] = useState<QualityPendingReception | null>(null);
  const [viewing, setViewing] = useState<QualityInspection | null>(null);

  const pendingRows: QualityPendingRow[] = recepciones.map((r) => ({
    reception: r,
    id: r.id,
    folio: r.folio,
    pedidos: pedidosDe(r),
    pedido: pedidosDe(r).map((p) => p.folio ?? "").join(" "),
    tipo_origen: r.tipo_origen,
    proveedor_nombre: r.proveedor_nombre ?? "",
    origen: r.origen_folio ?? origenDe(r.id),
    almacen: r.almacen_nombre ?? receiptById.get(r.id)?.almacen_nombre ?? "",
    fecha_recepcion: r.fecha_recepcion,
    piezas: r.detalle.reduce((acc, d) => acc + (Number(d.cantidad_recibida) || 0), 0),
    renglones: r.detalle.length,
  }));

  const doneRows: QualityDoneRow[] = done.inspecciones.map((i) => {
    const rec = receiptById.get(i.recepcion);
    return {
      inspection: i,
      id: i.id,
      recepcion_folio: i.recepcion_folio,
      pedidos: pedidosDe(i),
      pedido: pedidosDe(i).map((p) => p.folio ?? "").join(" "),
      tipo_origen: rec?.tipo_origen ?? "",
      origen: origenDe(i.recepcion),
      proveedor_nombre: rec?.proveedor_nombre ?? "",
      inspector: i.inspector_nombre ?? "",
      fecha: i.fecha,
      estado: i.estado,
      aprobadas: i.detalles.reduce((acc, d) => acc + (Number(d.cantidad_aprobada) || 0), 0),
      rechazadas: i.detalles.reduce((acc, d) => acc + (Number(d.cantidad_rechazada) || 0), 0),
    };
  });

  // Filtros estilo Excel en cada encabezado (en memoria: la lista llega completa).
  const tipoLabel = (r: { tipo_origen: string }) => TIPO_LABEL[r.tipo_origen] ?? r.tipo_origen;
  const pendingColumns = withHeaderFilters(getQualityPendingColumns({ onInspect: setSelected }), pendingRows, {
    folio: { type: "month", get: (r) => r.fecha_recepcion, filterLabel: "mes de recepción" },
    pedido: { type: "distinct", get: (r) => r.pedidos[0]?.folio, searchable: true, emptyOption: "Sin pedido" },
    origen: { type: "distinct", get: (r) => r.tipo_origen, label: tipoLabel, filterLabel: "tipo de origen" },
    proveedor_nombre: { type: "distinct", get: (r) => r.proveedor_nombre, searchable: true, emptyOption: "Interno" },
  });
  const doneColumns = withHeaderFilters(getQualityDoneColumns({ onOpen: setViewing }), doneRows, {
    recepcion_folio: { type: "month", get: (r) => r.fecha, filterLabel: "mes de inspección" },
    pedido: { type: "distinct", get: (r) => r.pedidos[0]?.folio, searchable: true, emptyOption: "Sin pedido" },
    origen: { type: "distinct", get: (r) => r.tipo_origen, label: tipoLabel, filterLabel: "tipo de origen" },
    proveedor_nombre: { type: "distinct", get: (r) => r.proveedor_nombre, searchable: true, emptyOption: "Interno" },
    estado: { type: "distinct", get: (r) => r.estado, label: (r) => QUALITY_ESTADO_CFG[r.estado]?.label ?? r.estado },
    rechazadas: { type: "presence", get: (r) => r.rechazadas, con: "Con rechazos", sin: "Sin rechazos" },
    inspector: { type: "distinct", get: (r) => r.inspector, searchable: true },
  });

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      <ListTabs
        ariaLabel="Recepciones de calidad"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "pendientes", label: "Por inspeccionar", count: recepciones.length },
          { key: "inspeccionadas", label: "Inspeccionadas", count: done.inspecciones.length },
        ]}
        isReady={tab === "pendientes" ? !isLoading : done.hasLoaded}
      />

      {tab === "pendientes" ? (
        <>
          {recepciones.length >= BACKEND_PENDING_LIMIT && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Se muestran las {BACKEND_PENDING_LIMIT} recepciones más recientes en espera de calidad;
              las anteriores aparecerán conforme se inspeccionen estas.
            </p>
          )}
          <DataTable
            key="pendientes"
            columns={pendingColumns}
            data={pendingRows}
            getRowId={(row) => String(row.id)}
            searchPlaceholder="Buscar pedido, recepción, OC, OP..."
            fillHeight
            onRefetch={refetch}
            isRefetching={isFetching}
            isLoading={isLoading}
            isError={isError}
            errorTitle="Error al cargar las recepciones en espera de calidad"
            errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
            onErrorRetry={refetch}
            loadingAriaLabel="Cargando recepciones en espera de calidad"
            emptyMessage="No hay recepciones en espera de calidad."
          />
        </>
      ) : (
        <DataTable
          key="inspeccionadas"
          columns={doneColumns}
          data={doneRows}
          getRowId={(row) => String(row.id)}
          searchPlaceholder="Buscar pedido, recepción, OC, inspector..."
          fillHeight
          onRefetch={done.refetch}
          isRefetching={done.isFetching}
          isLoading={done.isLoading}
          isError={done.isInitialError}
          errorTitle="Error al cargar las inspecciones"
          errorMessage={extractErrorMessage(done.error, "No se pudo cargar la información.")}
          onErrorRetry={done.refetch}
          loadingAriaLabel="Cargando inspecciones"
          emptyMessage="Aún no hay inspecciones registradas."
        />
      )}

      <QualityInspectionDialog
        reception={selected}
        inspectores={inspectores}
        canSubmit={canSubmit}
        onClose={() => setSelected(null)}
      />
      <QualityInspectionResultDialog inspection={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

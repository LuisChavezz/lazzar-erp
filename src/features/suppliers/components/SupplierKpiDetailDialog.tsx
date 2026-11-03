"use client";

import type { ReactNode } from "react";
import { Tabs } from "@radix-ui/themes";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useSupplierKpiDetail } from "../hooks/useSupplierKpiDetail";
import type { SupplierKpiDetail, SupplierKpiFactor } from "../interfaces/supplier-kpi-detail.interface";
import {
  getSupplierPriceColumns,
  SUPPLIER_FULFILLMENT_COLUMNS,
  SUPPLIER_PUNCTUALITY_COLUMNS,
  SUPPLIER_QUALITY_COLUMNS,
} from "./SupplierKpiDetailColumns";

/** Proveedor cuyo detalle se abre: lo que el ranking ya sabe de él. */
export interface SupplierKpiDetailTarget {
  id: number;
  nombre: string;
}

const TABS: { factor: SupplierKpiFactor; label: string }[] = [
  { factor: "puntualidad", label: "Puntualidad" },
  { factor: "calidad", label: "Calidad" },
  { factor: "cumplimiento", label: "Cumplimiento" },
  { factor: "precio", label: "Precio" },
];

const TAB_TRIGGER_CLASS = "cursor-pointer! text-slate-900! dark:text-white!";

function Note({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{children}</p>;
}

interface FactorTableProps<F extends SupplierKpiFactor> {
  query: ReturnType<typeof useSupplierKpiDetail<F>>;
  columns: ColumnDef<SupplierKpiDetail<F>["registros"][number]>[];
  getRowId: (record: SupplierKpiDetail<F>["registros"][number]) => string;
  emptyMessage: string;
  /** Aclaración fija del factor, sobre la tabla. */
  note?: ReactNode;
}

/**
 * Tabla de un factor. La tabla se monta siempre (toolbar incluido) y su cuerpo
 * alterna entre carga, error, vacío y filas. Un 404/403 (el proveedor ya no
 * está disponible) no ofrece "Reintentar": la respuesta ya es definitiva.
 */
function FactorTable<F extends SupplierKpiFactor>({
  query,
  columns,
  getRowId,
  emptyMessage,
  note,
}: FactorTableProps<F>) {
  const { data, isLoading, isFetching, isInitialError, isNotFound, refetch } = query;
  return (
    <>
      {note}
      {data?.truncado && (
        <Note>
          Mostrando {data.registros.length} de {data.total} registros.
        </Note>
      )}
      <DataTable
        columns={columns}
        data={data?.registros ?? []}
        getRowId={getRowId}
        searchPlaceholder="Buscar..."
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        isError={isInitialError || isNotFound}
        errorTitle={isNotFound ? "Proveedor no disponible" : "No se pudo cargar el detalle"}
        errorMessage={
          isNotFound
            ? "El proveedor se dio de baja o ya no es visible para tu usuario."
            : "Intenta de nuevo en unos momentos."
        }
        onErrorRetry={isNotFound ? undefined : () => void refetch()}
        onRefetch={() => refetch()}
        isRefetching={isFetching}
      />
    </>
  );
}

function PunctualityTab({ supplierId }: { supplierId: number }) {
  return (
    <FactorTable
      query={useSupplierKpiDetail(supplierId, "puntualidad")}
      columns={SUPPLIER_PUNCTUALITY_COLUMNS}
      getRowId={(record) => String(record.recepcion_id)}
      emptyMessage="El proveedor no tiene recepciones de órdenes de compra."
      note={
        <Note>
          Las recepciones “Sin fecha prometida” son de OCs sin fecha de entrega estimada: no cuentan para el
          puntaje.
        </Note>
      }
    />
  );
}

function QualityTab({ supplierId }: { supplierId: number }) {
  return (
    <FactorTable
      query={useSupplierKpiDetail(supplierId, "calidad")}
      columns={SUPPLIER_QUALITY_COLUMNS}
      getRowId={(record) => String(record.id)}
      emptyMessage="Calidad no ha rechazado material de este proveedor."
      note={<Note>Solo los renglones rechazados por Calidad; lo aprobado no se lista.</Note>}
    />
  );
}

function FulfillmentTab({ supplierId }: { supplierId: number }) {
  return (
    <FactorTable
      query={useSupplierKpiDetail(supplierId, "cumplimiento")}
      columns={SUPPLIER_FULFILLMENT_COLUMNS}
      getRowId={(record) => `${record.oc_id}-${record.unidad_id ?? "sin-unidad"}`}
      emptyMessage="Ninguna orden de compra del proveedor tiene cantidades pendientes."
      note={<Note>OCs con faltante por unidad de medida: recibido neto (menos lo rechazado) contra lo ordenado.</Note>}
    />
  );
}

function PriceTab({ supplierId }: { supplierId: number }) {
  const query = useSupplierKpiDetail(supplierId, "precio");
  // El permiso lo dice ESTA respuesta; mientras no llega, sin columnas de importe.
  const canSeeAmounts = query.data?.puede_ver_importes ?? false;
  return (
    <FactorTable
      query={query}
      columns={getSupplierPriceColumns(canSeeAmounts)}
      getRowId={(record) => String(record.id)}
      emptyMessage="No hay líneas facturadas con precio distinto al pactado."
      note={
        <>
          <Note>
            Líneas de factura con precio distinto al pactado en la OC, misma moneda. Cada importe va en la moneda de
            su fila.
          </Note>
          {query.data && !canSeeAmounts && (
            <Note>Importes no visibles: tu usuario no tiene permiso para ver precios.</Note>
          )}
        </>
      }
    />
  );
}

interface SupplierKpiDetailDialogProps {
  open: boolean;
  supplier: SupplierKpiDetailTarget | null;
  onClose: () => void;
}

/**
 * Detalle del scorecard de UN proveedor: una pestaña por factor del puntaje
 * (`kpis-detalle/?factor=…`). `Tabs.Content` de Radix desmonta la pestaña
 * inactiva, así que solo se consulta el factor que se ve. Cada apertura monta
 * contenido nuevo (`useDialogSession`): vuelve a la primera pestaña.
 */
export function SupplierKpiDetailDialog({ open, supplier, onClose }: SupplierKpiDetailDialogProps) {
  const session = useDialogSession(open, supplier);
  const target = session.snapshot;
  return (
    <MainDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={target ? target.nombre || `Proveedor #${target.id}` : ""}
      description="Registros detrás de cada factor del puntaje"
      maxWidth="960px"
    >
      {target && (
        <Tabs.Root key={session.id} defaultValue="puntualidad">
          <Tabs.List>
            {TABS.map(({ factor, label }) => (
              <Tabs.Trigger key={factor} value={factor} className={TAB_TRIGGER_CLASS}>
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <div className="mt-4">
            <Tabs.Content value="puntualidad">
              <PunctualityTab supplierId={target.id} />
            </Tabs.Content>
            <Tabs.Content value="calidad">
              <QualityTab supplierId={target.id} />
            </Tabs.Content>
            <Tabs.Content value="cumplimiento">
              <FulfillmentTab supplierId={target.id} />
            </Tabs.Content>
            <Tabs.Content value="precio">
              <PriceTab supplierId={target.id} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      )}
    </MainDialog>
  );
}

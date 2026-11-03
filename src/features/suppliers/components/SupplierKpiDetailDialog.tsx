"use client";

import type { ReactNode } from "react";
import { Tabs } from "@radix-ui/themes";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useSupplierKpiDetail } from "../hooks/useSupplierKpiDetail";
import type { SupplierKpiDetail, SupplierKpiFactor } from "../interfaces/supplier-kpi-detail.interface";
import { supplierKpiDetailRejection } from "../utils/supplierKpiDetailError";
import {
  getSupplierFulfillmentColumns,
  getSupplierPriceColumns,
  getSupplierPunctualityColumns,
  getSupplierQualityColumns,
} from "./SupplierKpiDetailColumns";

// Sin callbacks: una sola instancia por módulo, estable entre renders.
const PUNCTUALITY_COLUMNS = getSupplierPunctualityColumns();
const QUALITY_COLUMNS = getSupplierQualityColumns();
const FULFILLMENT_COLUMNS = getSupplierFulfillmentColumns();
const PRICE_COLUMNS_WITH_AMOUNTS = getSupplierPriceColumns(true);
const PRICE_COLUMNS_WITHOUT_AMOUNTS = getSupplierPriceColumns(false);

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
 * alterna entre carga, error, vacío y filas. Ni un 404/403 (el proveedor ya no
 * está disponible) ni otro 4xx (la consulta se rechazó, con el motivo del
 * backend) ofrecen "Reintentar": la misma petición daría la misma respuesta.
 */
function FactorTable<F extends SupplierKpiFactor>({
  query,
  columns,
  getRowId,
  emptyMessage,
  note,
}: FactorTableProps<F>) {
  const { data, isLoading, isFetching, isInitialError, isNotFound, error, refetch } = query;
  const rejection = isInitialError ? supplierKpiDetailRejection(error) : undefined;
  let errorTitle = "No se pudo cargar el detalle";
  let errorMessage = rejection ?? "Intenta de nuevo en unos momentos.";
  if (isNotFound) {
    errorTitle = "Proveedor no disponible";
    errorMessage = "El proveedor se dio de baja o ya no es visible para tu usuario.";
  }
  return (
    <>
      {note}
      {/* Sin "Mostrando…": esa palabra ya la usa el paginador de la tabla. */}
      {data?.truncado && (
        <Note>
          Lista recortada: incluye {data.registros.length} de los {data.total} registros de este factor.
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
        errorTitle={errorTitle}
        errorMessage={errorMessage}
        onErrorRetry={isNotFound || rejection !== undefined ? undefined : () => void refetch()}
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
      columns={PUNCTUALITY_COLUMNS}
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
      columns={QUALITY_COLUMNS}
      getRowId={(record) => String(record.id)}
      // Vacío es un resultado válido: la pestaña solo lista rechazos.
      emptyMessage="Sin rechazos registrados."
      note={<Note>Solo los renglones rechazados por Calidad; lo aprobado no se lista.</Note>}
    />
  );
}

function FulfillmentTab({ supplierId }: { supplierId: number }) {
  return (
    <FactorTable
      query={useSupplierKpiDetail(supplierId, "cumplimiento")}
      columns={FULFILLMENT_COLUMNS}
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
      columns={canSeeAmounts ? PRICE_COLUMNS_WITH_AMOUNTS : PRICE_COLUMNS_WITHOUT_AMOUNTS}
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

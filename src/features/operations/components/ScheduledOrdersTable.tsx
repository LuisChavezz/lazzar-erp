'use client';

import { DataTable } from '@/src/components/DataTable';
import type { ScheduledParcialidadRow } from '../interfaces/scheduled-parcialidad.interface';
import { getScheduledOrderColumns } from './ScheduledOrderColumns';

interface ScheduledOrdersTableProps {
  parcialidades: ScheduledParcialidadRow[];
  onRefetch?: () => void | Promise<unknown>;
  isRefetching?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

// Tabla de "Pedidos programados" — hermana de `OperationsOrderTable`, solo
// lectura, con UNA fila por parcialidad (`rowId` = pedido + índice).
export function ScheduledOrdersTable({
  parcialidades,
  onRefetch,
  isRefetching,
  isLoading,
  isError,
  errorMessage,
}: ScheduledOrdersTableProps) {
  const columns = getScheduledOrderColumns();

  return (
    <DataTable
      columns={columns}
      data={parcialidades}
      baseDataCount={parcialidades.length}
      getRowId={(row) => row.rowId}
      searchPlaceholder="Folio, OC, cliente, destino…"
      emptyMessage="No hay parcialidades programadas."
      onRefetch={onRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar pedidos programados"
      errorMessage={errorMessage}
      onErrorRetry={onRefetch ? () => void onRefetch() : undefined}
      loadingAriaLabel="Cargando pedidos programados"
    />
  );
}

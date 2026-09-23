'use client';

import { useMemo } from 'react';
import { DataTable } from '@/src/components/DataTable';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import {
  buildOperationsOrderColumns,
  type OperationsOrderColumnCallbacks,
} from './OperationsOrderColumns';

interface OperationsOrderTableProps extends OperationsOrderColumnCallbacks {
  orders: PedidoListItem[];
  onRefetch?: () => void | Promise<unknown>;
  isRefetching?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

// Tabla de la Mesa de Control de Pedidos — usa DataTable con columnas dedicadas
export function OperationsOrderTable({
  orders,
  onViewDetail,
  onEditMesaControl,
  onProgramar,
  onRefetch,
  isRefetching,
  isLoading,
  isError,
  errorMessage,
}: OperationsOrderTableProps) {
  // Los callbacks son estables; el useMemo evita recrear el array de columnas
  // en cada render del componente padre.
  const columns = useMemo(
    () =>
      buildOperationsOrderColumns({ onViewDetail, onEditMesaControl, onProgramar }),
    [onViewDetail, onEditMesaControl, onProgramar],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      baseDataCount={orders.length}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      onRefetch={onRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar pedidos"
      errorMessage={errorMessage}
      onErrorRetry={onRefetch ? () => void onRefetch() : undefined}
      loadingAriaLabel="Cargando pedidos"
    />
  );
}

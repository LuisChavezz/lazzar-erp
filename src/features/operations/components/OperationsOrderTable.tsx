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
}

// Tabla de la Mesa de Control de Pedidos — usa DataTable con columnas dedicadas
export function OperationsOrderTable({
  orders,
  onConfirmDate,
  onViewDetail,
  onEditMesaControl,
  onProgramar,
  onRefetch,
  isRefetching,
}: OperationsOrderTableProps) {
  // Los callbacks son estables; el useMemo evita recrear el array de columnas
  // en cada render del componente padre.
  const columns = useMemo(
    () =>
      buildOperationsOrderColumns({ onConfirmDate, onViewDetail, onEditMesaControl, onProgramar }),
    [onConfirmDate, onViewDetail, onEditMesaControl, onProgramar],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      baseDataCount={orders.length}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      framed
      searchAlwaysExpanded
      defaultPageSize={20}
      density="compact"
      fillHeight
      onRefetch={onRefetch}
      isRefetching={isRefetching}
      isLoadingOverlay={isRefetching}
    />
  );
}

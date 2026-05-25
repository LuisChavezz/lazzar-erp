'use client';

import { useMemo } from 'react';
import { DataTable } from '@/src/components/DataTable';
import type { OrderControl } from '../types/order-control.types';
import {
  buildOperationsOrderColumns,
  type OperationsOrderColumnCallbacks,
} from './OperationsOrderColumns';

interface OperationsOrderTableProps extends OperationsOrderColumnCallbacks {
  orders: OrderControl[];
}

// Tabla de la Mesa de Control de Pedidos — usa DataTable con columnas dedicadas
export function OperationsOrderTable({
  orders,
  onConfirmDate,
  onRelease,
}: OperationsOrderTableProps) {
  // Los setters de estado son referencias estables; el useMemo evita recrear
  // el array de columnas en cada render del componente padre.
  const columns = useMemo(
    () => buildOperationsOrderColumns({ onConfirmDate, onRelease }),
    [onConfirmDate, onRelease],
  );

  return (
    <DataTable
      columns={columns}
      data={orders}
      searchPlaceholder="Buscar por folio, cliente u OC..."
    />
  );
}

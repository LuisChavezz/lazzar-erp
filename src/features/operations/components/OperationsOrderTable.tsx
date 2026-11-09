'use client';

import { DataTable } from '@/src/components/DataTable';
import type { usePedidosTable } from '@/src/features/orders/hooks/usePedidosTable';
import {
  buildOperationsOrderColumns,
  type OperationsOrderColumnCallbacks,
} from './OperationsOrderColumns';
import { MESA_CONTROL_KPI_LIST } from '../constants/listHeight';

interface OperationsOrderTableProps extends OperationsOrderColumnCallbacks {
  /** `tableProps` de `usePedidosTable` (modo servidor). */
  tableProps: ReturnType<typeof usePedidosTable>['tableProps'];
  /** ¿Se montan la columna, el filtro y el orden de importe? */
  showAmounts: boolean;
  /** "Actualizar datos": la lista y los indicadores juntos. */
  onRefetch?: () => Promise<unknown>;
}

/**
 * Tabla de la Mesa de Control de Pedidos en MODO SERVIDOR. Se monta SIEMPRE:
 * carga, error y vacío los alterna `DataTable` en su cuerpo, con el toolbar y
 * los filtros de encabezado montados.
 */
export function OperationsOrderTable({
  tableProps,
  showAmounts,
  onProgramar,
  onCancel,
  onRefetch,
}: OperationsOrderTableProps) {
  const columns = buildOperationsOrderColumns({ onProgramar, onCancel }, { showAmounts });

  return (
    <DataTable
      columns={columns}
      {...tableProps}
      onRefetch={onRefetch ?? tableProps.onRefetch}
      // Identidad de la fila por registro, no por posición en la página.
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar por folio, cliente u OC..."
      fillHeight
      fillHeightBodyClassName={MESA_CONTROL_KPI_LIST.body}
      emptyMessage="No hay pedidos en mesa de control"
      errorTitle="Error al cargar pedidos"
      loadingAriaLabel="Cargando pedidos"
    />
  );
}

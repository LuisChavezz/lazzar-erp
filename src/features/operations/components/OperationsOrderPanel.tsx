'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import KpiGrid, { type KpiCompactItem } from '@/src/components/KpiGrid';
import {
  CheckCircleIcon,
  ClockIcon,
  ListaPreciosIcon,
  PedidosIcon,
} from '@/src/components/Icons';
import { CurrencyTotalsValue } from '@/src/components/CurrencyTotalsValue';
import type { CurrencyTotal } from '@/src/utils/currencyTotals';
import { safeParseAmount } from '@/src/utils/formatCurrency';
import { hiddenAmountCard } from '@/src/features/purchase-orders/utils/kpiAmountCards';
import { ORDERS_QUERY_KEY } from '@/src/features/orders/constants/ordersQueryKeys';
import {
  usePedidoAmountsVisibility,
  usePedidoKpisMesa,
  usePedidosTable,
} from '@/src/features/orders/hooks/usePedidosTable';
import type { PedidoKpisMesa } from '@/src/features/orders/interfaces/pedido-list.interface';
import type { PedidoListItem } from '@/src/features/orders/interfaces/order.interface';
import { mesaPedidosTable } from '@/src/features/orders/utils/pedidoListParams';
import { PedidoProgramacionDialog } from '@/src/features/orders/components/PedidoProgramacionDialog';
import { PedidoCancelDialog } from '@/src/features/orders/components/PedidoCancelDialog';
import { OperationsOrderTable } from './OperationsOrderTable';
import { MESA_CONTROL_KPI_LIST } from '../constants/listHeight';

/** Valor por moneda de `kpis-mesa/` (código ISO del backend; nunca se suman monedas). */
const valorPorMoneda = (kpis: PedidoKpisMesa): CurrencyTotal[] =>
  kpis.por_moneda.map((fila) => ({
    moneda: fila.moneda,
    total: safeParseAmount(String(fila.valor ?? 0)),
    ...(fila.moneda ? {} : { etiqueta: `Moneda ${fila.moneda_id}` }),
  }));

/**
 * Tarjetas de Mesa de Control a partir de `kpis-mesa/`, el MISMO conjunto que
 * la tabla con los mismos filtros y búsqueda. `total` excluye los cancelados
 * (= por confirmar + confirmados); el conteo `cancelados` del backend no se
 * pinta. Sin respuesta todavía, cada tarjeta dice "—" en vez de un cero que se
 * leería como real.
 */
const buildKpis = (kpis: PedidoKpisMesa | undefined): KpiCompactItem[] => {
  const pct = (n: number) => (kpis && kpis.total ? Math.round((n / kpis.total) * 100) : 0);
  const count = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('es-MX'));
  const valorBase = { label: 'Valor total', icon: ListaPreciosIcon };
  return [
    {
      label: 'Total pedidos',
      value: count(kpis?.total),
      icon: PedidosIcon,
      iconClass: 'text-sky-500',
      detail: 'En mesa de control · sin cancelados',
      hideProgress: true,
    },
    {
      label: 'Por confirmar',
      value: count(kpis?.por_confirmar),
      icon: ClockIcon,
      iconClass: 'text-amber-500',
      progress: pct(kpis?.por_confirmar ?? 0),
      detail: `${pct(kpis?.por_confirmar ?? 0)}% del total · fecha pendiente`,
    },
    {
      label: 'Confirmados',
      value: count(kpis?.confirmados),
      icon: CheckCircleIcon,
      iconClass: 'text-cyan-500',
      progress: pct(kpis?.confirmados ?? 0),
      detail: `${pct(kpis?.confirmados ?? 0)}% del total · con fecha`,
    },
    kpis && !kpis.puede_ver_importes
      ? hiddenAmountCard(valorBase, 'Tu rol no tiene acceso a los importes de los pedidos.')
      : {
          ...valorBase,
          value: kpis ? <CurrencyTotalsValue totals={valorPorMoneda(kpis)} /> : '—',
          iconClass: 'text-emerald-500',
          hideProgress: true,
          info: 'Suma del total con IVA de los pedidos por moneda; cada moneda se muestra por separado.',
        },
  ];
};

/**
 * Mesa de Control de Pedidos en MODO SERVIDOR: filtros, búsqueda, orden y
 * página los resuelve el backend y viven en la URL (`mesaPedidosTable`), así
 * que la página lo envuelve en `<Suspense>`. Los indicadores salen de
 * `kpis-mesa/` con los mismos criterios que la tabla.
 */
export function OperationsOrderPanel() {
  const table = usePedidosTable({
    definition: mesaPedidosTable,
    queryKey: ORDERS_QUERY_KEY,
    toastId: 'mesa-pedidos-table-refetch-error',
  });
  const kpis = usePedidoKpisMesa(table.criteria);
  const showAmounts = usePedidoAmountsVisibility(table.rows);
  const queryClient = useQueryClient();

  // El estado del diálogo vive aquí, no en la celda, para que sobreviva si el
  // renglón sale de la página o de la vista filtrada.
  const [selectedOrderForSchedule, setSelectedOrderForSchedule] =
    useState<PedidoListItem | null>(null);
  // Al cancelarse, la fila SALE del listado: por eso el diálogo vive aquí y se
  // monta siempre (`PedidoCancelDialog` conserva su copia del pedido).
  const [selectedOrderForCancel, setSelectedOrderForCancel] =
    useState<PedidoListItem | null>(null);

  // "Actualizar datos" relee la lista y los indicadores juntos, para que
  // tarjetas y tabla no muestren cifras de momentos distintos.
  const { onRefetch } = table.tableProps;
  const handleRefetch = onRefetch
    ? () =>
        Promise.all([
          onRefetch(),
          queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, 'kpis-mesa'] }),
        ])
    : undefined;

  return (
    // Altura según la ventana y el ancho del listado (`listHeight.ts`): con
    // espacio, los KPIs conservan su alto y la tabla llena el resto
    // (`fillHeight`) y scrollea por dentro, sin scroll de página; en laptops la
    // tabla mide ~7 filas y la página scrollea. El contenedor exterior es el que
    // mide la container query del umbral.
    <div className={MESA_CONTROL_KPI_LIST.container}>
    <div className={`${MESA_CONTROL_KPI_LIST.panel} flex flex-col gap-4`}>
      {/* Indicadores con consulta PROPIA: si fallan, la tabla y su toolbar
          siguen; un refetch fallido conserva las cifras y avisa por toast. */}
      <div className="shrink-0">
        <KpiGrid compact items={buildKpis(kpis.data)} />
      </div>

      <div className={MESA_CONTROL_KPI_LIST.region}>
      <OperationsOrderTable
        tableProps={table.tableProps}
        showAmounts={showAmounts}
        onProgramar={setSelectedOrderForSchedule}
        onCancel={setSelectedOrderForCancel}
        onRefetch={handleRefetch}
      />
      </div>

      {selectedOrderForSchedule && (
        <PedidoProgramacionDialog
          key={`schedule-${selectedOrderForSchedule.id}`}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForSchedule(null);
          }}
          order={selectedOrderForSchedule}
        />
      )}

      <PedidoCancelDialog
        pedido={selectedOrderForCancel}
        onClose={() => setSelectedOrderForCancel(null)}
      />
    </div>
    </div>
  );
}

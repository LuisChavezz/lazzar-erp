'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FilterHeader, type ColumnFilterOption } from '@/src/components/ColumnHeaderFilter';
import { surtidoPedidoColumns } from '@/src/features/order-fulfillment/components/SurtidoPedidoColumns';
import { SURTIDO_ETAPA_CONFIG } from '@/src/features/order-fulfillment/constants/surtidoEtapa';
import type { SurtidoPedido } from '@/src/features/order-fulfillment/interfaces/order-fulfillment.interface';
import { ALL_FILTER_OPTION } from '@/src/utils/columnFilterOptions';
import { ETAPAS_SURTIDO_COMPLETO } from '../constants/wmsOrdersTables';
import { WmsOrdersCatalogHeader } from './WmsOrdersCatalogHeader';

const ETAPA_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...ETAPAS_SURTIDO_COMPLETO.map((etapa) => ({ value: etapa, label: SURTIDO_ETAPA_CONFIG[etapa].label })),
];

type SurtidoColumn = ColumnDef<SurtidoPedido>;

/**
 * La misma columna con otro encabezado o `meta`. El spread de la unión de
 * `ColumnDef` no se estrecha solo; el cast solo reafirma la variante (accessor
 * o display) que ya tenía la columna base.
 */
const override = (column: SurtidoColumn, patch: Pick<SurtidoColumn, 'header' | 'meta'>): SurtidoColumn =>
  ({ ...column, ...patch }) as SurtidoColumn;

/**
 * Columnas de "Surtidos" en Pedidos de Almacén, en MODO SERVIDOR
 * (`useSurtidosTable`, EC-993): las del avance de surtido sin "Comprometidas"
 * (un pedido completo no tiene nada comprometido), con orden por folio y
 * cliente y filtros de cliente y etapa en el servidor. Las cifras no se
 * ordenan: el backend no las acepta en `ordering`. Las columnas base no se
 * tocan: las comparte la pantalla de avance de surtido, que no ordena. Sin
 * callbacks: "Por talla" y el origen del folio llegan por contexto
 * (`SurtidoPedidoRowActionsProvider`).
 */
export const getWmsSurtidoColumns = (): ColumnDef<SurtidoPedido>[] =>
  surtidoPedidoColumns
    .filter((c) => c.id !== 'comprometidas')
    .map((c): SurtidoColumn => {
      switch (c.id) {
        case 'pedido':
          return override(c, { meta: { ...c.meta, serverSort: 'folio' } });
        case 'cliente_nombre':
          return override(c, {
            meta: { ...c.meta, serverSort: 'cliente_nombre', serverFilter: 'cliente' },
            header: ({ column }) => (
              <WmsOrdersCatalogHeader
                column={column}
                tab="surtidos"
                catalogo="clientes"
                title="Cliente"
                label="cliente"
                searchable
              />
            ),
          });
        case 'etapa':
          return override(c, {
            meta: { ...c.meta, serverFilter: 'etapa' },
            header: ({ column }) => (
              <FilterHeader title="Etapa" column={column} options={ETAPA_FILTER_OPTIONS} label="etapa" />
            ),
          });
        default:
          return c;
      }
    });

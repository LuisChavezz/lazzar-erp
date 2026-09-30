"use client";

import { InventariosIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import {
  EmptyLines,
  HeaderStat,
  HeaderStatRow,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import type {
  InventoryPipelineOrder,
  InventoryPipelineRow,
  InventoryPipelineSize,
} from "../interfaces/inventory-pipeline.interface";

const TallasTable = ({ tallas }: { tallas: InventoryPipelineSize[] }) => {
  if (tallas.length === 0) {
    return <EmptyLines>Este producto no tiene desglose por talla.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium text-right">Disponible</th>
          <th className="px-3 py-2 font-medium text-right">En OP</th>
          <th className="px-3 py-2 font-medium text-right">Total</th>
        </>
      }
    >
      {tallas.map((talla) => (
        <tr key={talla.talla} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{talla.talla}</td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(talla.disponible)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(talla.enOp)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatExactQuantityValue(talla.total)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

/**
 * Órdenes abiertas (OP u OC). El backend no manda id ni cantidad por orden, así
 * que el folio no enlaza a nada y no hay columna de cantidad. `estatus` es el
 * `estatus_display` tal cual: texto plano, sin `StatusBadge` (no hay código de
 * estatus con el cual colorear).
 */
const OrdenesTable = ({
  ordenes,
  emptyMessage,
}: {
  ordenes: InventoryPipelineOrder[];
  emptyMessage: string;
}) => {
  if (ordenes.length === 0) {
    return <EmptyLines>{emptyMessage}</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Folio</th>
          <th className="px-3 py-2 font-medium">Estatus</th>
          <th className="px-3 py-2 font-medium">Entrega estimada</th>
          <th className="px-3 py-2 font-medium">Comentarios</th>
        </>
      }
    >
      {ordenes.map((orden, index) => (
        // Sin id en el contrato y el folio puede ser `null` (OC sin folio
        // asignado todavía): el índice desempata.
        <tr
          key={`${orden.folio ?? ""}-${index}`}
          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
            {textOrDash(orden.folio)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{textOrDash(orden.estatus)}</td>
          <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
            {formatLocalDate(orden.fechaEntregaEstimada)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {textOrDash(orden.comentarios)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface InventoryPipelineDetailDialogProps {
  /** La fila ya cargada por el listado: el reporte no tiene endpoint de
   *  detalle, así que el diálogo no hace fetch propio. */
  row: InventoryPipelineRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryPipelineDetailDialog({
  row,
  open,
  onOpenChange,
}: InventoryPipelineDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <InventariosIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              {textOrDash(row.descripcion)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {textOrDash(row.codigo)}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5">
          <HeaderStatRow>
            <HeaderStat label="Disponible">{formatExactQuantityValue(row.disponible)}</HeaderStat>
            <HeaderStat label="En OP">{formatExactQuantityValue(row.enOp)}</HeaderStat>
            <HeaderStat label="Total" bold>
              {formatExactQuantityValue(row.total)}
            </HeaderStat>
            <HeaderStat label="Compras pendientes">
              {formatExactQuantityValue(row.comprasPendientes)}
            </HeaderStat>
          </HeaderStatRow>
        </div>

        <div>
          <SectionTitle>Por talla</SectionTitle>
          <TallasTable tallas={row.tallas} />
        </div>

        <div>
          <SectionTitle>Órdenes de producción abiertas</SectionTitle>
          <OrdenesTable
            ordenes={row.ordenesProduccion}
            emptyMessage="No hay órdenes de producción abiertas para este producto."
          />
        </div>

        <div>
          <SectionTitle>Órdenes de compra abiertas</SectionTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Las compras pendientes ({formatExactQuantityValue(row.comprasPendientes)}) se reportan
            por producto; no se desglosan por talla.
          </p>
          <OrdenesTable
            ordenes={row.ordenesCompra}
            emptyMessage="No hay órdenes de compra abiertas para este producto."
          />
        </div>
      </div>
    </MainDialog>
  );
}

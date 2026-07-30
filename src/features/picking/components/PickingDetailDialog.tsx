"use client";

import type { ComponentType, SVGProps } from "react";
import {
  ChevronRightIcon,
  ExclamationTriangleIcon,
  PedidosIcon,
  RouteIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { PICKING_PRIORIDAD_CONFIG } from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { PICKING_TIPO_LABELS } from "../constants/pickingTipo";
import type { PickingDetalleLine, PickingRow } from "../interfaces/picking.interface";

/**
 * Colores del estatus de UNA LÍNEA (`PickingDetalleLine.estado`) — enum
 * propio, distinto del estatus del picking completo (`PICKING_STATUS_CONFIG`).
 * Se declara local a este diálogo (no en `constants/`) porque, a diferencia
 * del estatus de cabecera, ningún otro componente lo consume — es un detalle
 * de presentación de esta sola tabla, no un catálogo compartido.
 */
const LINE_ESTADO_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  SURTIDA: {
    label: "Surtida",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  PARCIAL: {
    label: "Parcial",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  FALTANTE: {
    label: "Faltante",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  CANCELADA: {
    label: "Cancelada",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

/** Nombre del producto/variante surtido en una línea. Solo uno de los dos
 *  pares viaja no-nulo por línea, nunca ambos. Mismo criterio que
 *  `StockTransferDetailDialog`. */
function lineaProductoNombre(linea: PickingDetalleLine): string {
  return linea.producto_variante_nombre ?? linea.producto_nombre ?? "—";
}

const LineasTable = ({ items }: { items: PickingDetalleLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Este picking no tiene líneas registradas.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto / Variante</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium text-right">Solicitada</th>
          <th className="px-3 py-2 font-medium text-right">Asignada</th>
          <th className="px-3 py-2 font-medium text-right">Surtida</th>
          <th className="px-3 py-2 font-medium text-right">Diferencia</th>
          <th className="px-3 py-2 font-medium">Estatus</th>
        </>
      }
    >
      {items.map((linea) => (
        <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {lineaProductoNombre(linea)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.talla_nombre ?? "—"}
          </td>
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatExactQuantityValue(linea.cantidad_solicitada)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(linea.cantidad_asignada)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(linea.cantidad_surtida)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatExactQuantityValue(linea.diferencia)}
          </td>
          <td className="px-3 py-2">
            <StatusBadge status={linea.estado} config={LINE_ESTADO_CONFIG} />
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

/**
 * Un eslabón de la cadena "Pedido → Origen → Destino": ícono, rótulo y valor.
 * El rótulo existe porque origen y destino son ambos nombres de almacén y sin
 * él no habría forma de saber cuál es cuál.
 */
const ChainStep = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <Icon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
        {value}
      </p>
    </div>
  </div>
);

interface PickingDetailDialogProps {
  /** La fila ya cargada por el listado — sin fetch propio (ver
   *  `Picking.picking_detalle`, presente tanto en listado como en detalle).
   *  Es la fila enriquecida (`PickingRow`), no el registro crudo, para que el
   *  diálogo marque el vencimiento con la MISMA definición que la tabla. */
  picking: PickingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PickingDetailDialog({ picking, open, onOpenChange }: PickingDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <RouteIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Picking
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {picking.folio}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Estatus">
            <StatusBadge status={picking.estado} config={PICKING_STATUS_CONFIG} />
          </InfoField>
          <InfoField label="Prioridad">
            <StatusBadge status={picking.prioridad} config={PICKING_PRIORIDAD_CONFIG} />
          </InfoField>
          {/* El backend manda el código crudo (`ORDER_PICKING`), sin etiqueta
              acompañante: se traduce con `PICKING_TIPO_LABELS`. */}
          <InfoField label="Tipo">{textOrDash(PICKING_TIPO_LABELS[picking.tipo])}</InfoField>
          <InfoField label="Operador">{textOrDash(picking.operador_nombre)}</InfoField>
          <InfoField label="Avance">
            <span className="tabular-nums">
              {picking.total_lineas_completas}/{picking.total_lineas} líneas
            </span>
          </InfoField>
          {/* Mismo resaltado de vencido que la columna "Fecha Límite" de la
              tabla, derivado de la misma `esta_vencida` (`isPickingVencido`). */}
          <InfoField label="Fecha Límite">
            {picking.fecha_limite ? (
              <span
                className={
                  picking.esta_vencida
                    ? "inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold"
                    : undefined
                }
              >
                {picking.esta_vencida && (
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                {formatShortDate(picking.fecha_limite)}
                {picking.esta_vencida && <span className="sr-only">(vencido)</span>}
              </span>
            ) : (
              "—"
            )}
          </InfoField>
          {picking.fecha_inicio && (
            <InfoField label="Inicio">
              <span className="tabular-nums">
                {formatShortDate(picking.fecha_inicio)} · {formatShortTime(picking.fecha_inicio)}
              </span>
            </InfoField>
          )}
          {picking.fecha_fin && (
            <InfoField label="Fin">
              <span className="tabular-nums">
                {formatShortDate(picking.fecha_fin)} · {formatShortTime(picking.fecha_fin)}
              </span>
            </InfoField>
          )}
          {picking.observaciones && (
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              {picking.observaciones}
            </InfoField>
          )}
        </div>

        {/* Pedido → almacén origen → almacén destino (apartados).
            El destino es información distinta del origen y CONVIVE con él: el
            origen es de donde se recolecta y el destino a dónde está PREVISTO
            llevar lo surtido —normalmente el almacén "APARTADOS", que el
            backend resuelve solo cuando el alta no lo especifica—. Sin
            rotularlos, dos nombres de almacén seguidos serían indistinguibles,
            de ahí las etiquetas. Se omite el tramo del destino si el registro
            no lo trae (pickings anteriores a la migración que lo introdujo).

            La cadena con flechas se lee como un movimiento, y registrar el
            picking NO mueve existencias (el backend solo guarda el documento:
            sin transferencia, sin reserva). De ahí la aclaración al pie — es
            más barata que quitar el destino, que sigue siendo dato real del
            registro. */}
        <div>
          <SectionTitle>Pedido y Almacenes</SectionTitle>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
            <ChainStep icon={PedidosIcon} label="Pedido" value={picking.pedido_folio} />
            <ChevronRightIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
            <ChainStep icon={WarehouseIcon} label="Origen" value={picking.almacen_nombre} />
            {picking.almacen_destino_nombre && (
              <>
                <ChevronRightIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
                <ChainStep
                  icon={WarehouseIcon}
                  label="Destino"
                  value={picking.almacen_destino_nombre}
                />
              </>
            )}
          </div>
          {picking.almacen_destino_nombre && (
            <p className="mt-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              El destino es informativo: el picking documenta el surtido, no
              traspasa existencias por sí mismo.
            </p>
          )}
        </div>

        {/* Líneas */}
        <div>
          <SectionTitle>Líneas del picking</SectionTitle>
          <LineasTable items={picking.picking_detalle} />
        </div>
      </div>
    </MainDialog>
  );
}

"use client";

import { useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useSession } from "next-auth/react";
import {
  ExclamationTriangleIcon,
  PedidosIcon,
  RouteIcon,
  TraspasosIcon,
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
import { hasPermission } from "@/src/utils/permissions";
import { plural } from "@/src/utils/plural";
import { PICKING_PRIORIDAD_CONFIG } from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { PICKING_TIPO_LABELS } from "../constants/pickingTipo";
import type { PickingDetalleLine, PickingRow } from "../interfaces/picking.interface";
import { isPickingTrasladable } from "../utils/picking.utils";
import { StockTransferDetailDialog } from "@/src/features/stock-transfers/components/StockTransferDetailDialog";
import { PickingTransferDialog } from "./PickingTransferDialog";

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
    return <EmptyLines>Este surtido no tiene líneas registradas.</EmptyLines>;
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
 * Un dato de la franja "Pedido · Ubicación actual · Traspaso": ícono, rótulo y
 * valor (texto o, para el folio de la TR, el botón que abre su detalle).
 */
const InfoStep = ({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <Icon className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
        {children}
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
              Detalle de Surtido
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {picking.folio}
            </p>
          </div>
        </div>
      }
    >
      <PickingDetailContent picking={picking} />
    </MainDialog>
  );
}

/**
 * Cuerpo del detalle de picking, extraído para que el diálogo original y el
 * envoltorio por id (`PickingDetailByIdDialog`) compartan un ÚNICO `MainDialog`
 * y solo intercambien el contenido (loader → cuerpo), sin remontar el modal.
 *
 * Aquí vive también la acción "Trasladar a otro almacén", así que está en los
 * dos lugares donde se abre el detalle (el listado de picking y el detalle del
 * pedido). Se ofrece con `C-WMS-PICKING` (el mismo código que da de alta un
 * surtido; `hasPermission` ya deja pasar al rol admin) y solo si el estatus es
 * trasladable. Tras un traslado exitoso ambos dueños reciben el `picking`
 * actualizado sin desmontar este cuerpo. Si el surtido deja de existir (404),
 * este cuerpo SÍ desaparece al refrescarse —y con él el diálogo—, por eso ese
 * error se avisa con un toast (ver `useTransferPicking`).
 */
export function PickingDetailContent({ picking }: { picking: PickingRow }) {
  const { data: session } = useSession();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferenciaId, setTransferenciaId] = useState(0);
  const [isTransferenciaOpen, setIsTransferenciaOpen] = useState(false);
  const openTransferencia = (id: number) => {
    if (id <= 0) return;
    setTransferenciaId(id);
    setIsTransferenciaOpen(true);
  };
  const canTransfer =
    hasPermission("C-WMS-PICKING", session?.user) && isPickingTrasladable(picking);

  return (
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
              {picking.total_lineas_completas}/{picking.total_lineas}{" "}
              {plural(picking.total_lineas, "línea", "líneas")}
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
          {/* `whitespace-pre-line`: cada traslado añade su nota en una línea
              nueva ("Trasladado de X a Y. …"). */}
          {picking.observaciones && (
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              <span className="whitespace-pre-line">{picking.observaciones}</span>
            </InfoField>
          )}
        </div>

        {/* Pedido · ubicación actual · traspaso.
            Crear el picking y cada traslado generan una transferencia (folio
            TR) que MUEVE las existencias, así que lo que importa es dónde
            están HOY las prendas: `almacen_actual`, resuelto por el backend.
            Origen y destino no lo describen tras un traslado (`almacen` pasa a
            ser el nuevo y `almacen_destino` queda en `null`).

            El folio es el de la TR que dejó las prendas ahí (la del alta o la
            del último traslado) y abre su detalle en un diálogo encima de
            este, sin navegar a /config (que exige R-CONFIGURACION). Sin TR
            (`transferencia` nulo) no se pinta. */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Pedido y Ubicación</SectionTitle>
            {canTransfer && (
              <button
                type="button"
                onClick={() => setIsTransferOpen(true)}
                className="mb-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 transition-colors"
              >
                <TraspasosIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Trasladar a otro almacén
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
            <InfoStep icon={PedidosIcon} label="Pedido">
              {picking.pedido_folio}
            </InfoStep>
            <InfoStep icon={WarehouseIcon} label="Ubicación actual">
              {picking.almacen_actual_nombre}
            </InfoStep>
            {picking.transferencia !== null && (
              <InfoStep icon={TraspasosIcon} label="Traspaso">
                <button
                  type="button"
                  onClick={() => openTransferencia(picking.transferencia ?? 0)}
                  className="font-mono hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
                  title="Ver detalle"
                >
                  {textOrDash(picking.transferencia_folio)}
                </button>
              </InfoStep>
            )}
          </div>
        </div>

        {/* Líneas */}
        <div>
          <SectionTitle>Líneas del surtido</SectionTitle>
          <LineasTable items={picking.picking_detalle} />
        </div>

        {/* Montado también mientras está abierto aunque la acción deje de
            ofrecerse: un 400 `estado` refresca el surtido (que sigue existiendo
            pero ya no es trasladable) y el motivo se lee en el banner del
            diálogo. Un 404 no llega aquí: el cuerpo entero desaparece. */}
        {(canTransfer || isTransferOpen) && (
          <PickingTransferDialog
            picking={picking}
            open={isTransferOpen}
            onOpenChange={setIsTransferOpen}
          />
        )}

        {/* El id se guarda al abrir: un traslado cambia `picking.transferencia`
            y el detalle abierto no debe saltar a otra TR. */}
        {transferenciaId > 0 && (
          <StockTransferDetailDialog
            transferId={transferenciaId}
            open={isTransferenciaOpen}
            onOpenChange={setIsTransferenciaOpen}
          />
        )}
      </div>
  );
}

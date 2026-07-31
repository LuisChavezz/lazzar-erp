"use client";

import { ScissorsIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  EMBROIDERY_PRIORITY_CONFIG,
  EMBROIDERY_STATUS_CONFIG,
  embroideryPriorityFallback,
} from "../constants/embroideryStatus";
import type {
  EmbroideryOrder,
  EmbroideryOrderLine,
} from "../interfaces/embroidery.interface";

/**
 * Columnas de `detalles`: SOLO las que llevan dato real hoy
 * (`producto_nombre`, `talla_nombre`, `cantidad`). `color_nombre` y
 * `posicion_bordado` son SIEMPRE `null` y `colores_hilo`/`puntadas` SIEMPRE
 * `0` en las órdenes de este módulo (nada las captura todavía) — no es un
 * valor nulo por-renglón como en Packing/Dispatch (donde SÍ se muestran con
 * `?? "—"": ahí la columna sí varía entre renglones), sino una columna
 * estructuralmente vacía para el 100% de los renglones. No hay precedente en
 * el proyecto para omitir una columna documentada por esa razón —Packing,
 * Dispatch y Picking siempre pintan el shape completo con `"—"` por
 * renglón—, así que esto es una decisión de criterio propia de este diálogo,
 * no una convención heredada: se prefiere una tabla legible con datos reales
 * sobre cuatro columnas de guiones repetidos en cada fila.
 */
const LineasTable = ({ items }: { items: EmbroideryOrderLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium text-right">Cantidad</th>
        </>
      }
    >
      {items.map((linea) => (
        <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {linea.producto_nombre ?? "—"}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {linea.talla_nombre ?? "—"}
          </td>
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatQuantityValue(linea.cantidad)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface EmbroideryOrderDetailDialogProps {
  /**
   * La orden ya resuelta por el padre, o `null` si el id abierto no existe en
   * la lista cargada.
   *
   * El disparador sigue siendo un `id` (`openOrderId` en `EmbroideryView`),
   * para poder abrirse desde puntos que solo tienen un id a la mano —el 409 de
   * duplicado, `orden_bordado_existente.id`, ver `parseEmbroideryOrderError.ts`—
   * y no únicamente desde una fila a la vista. Pero la BÚSQUEDA vive en el
   * padre, que ya tiene el arreglo: si se resolviera aquí con otro
   * `useEmbroideryOrders()`, el diálogo abriría una segunda suscripción a la
   * misma query y volvería a copiar y ordenar la lista completa en cada
   * render, solo para localizar un renglón que el padre ya tiene.
   *
   * SIN fetch propio en ninguno de los dos casos: listado y detalle comparten
   * `OrdenBordadoSerializer` en el backend (mismo `serializer_class` a nivel de
   * `ViewSet`, usado por `list` y `retrieve` sin `get_serializer_class` que lo
   * desvíe, confirmado contra el checkout de `nucleo-erp`), así que la fila del
   * listado ES el detalle completo.
   */
  order: EmbroideryOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbroideryOrderDetailDialog({
  order,
  open,
  onOpenChange,
}: EmbroideryOrderDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ScissorsIcon className="w-5 h-5 text-fuchsia-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Bordado
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {order ? order.folio_bordado : "No disponible"}
            </p>
          </div>
        </div>
      }
    >
      {/*
       * SIN fetch propio: sin llamada de red que pueda devolver un 404 real.
       * El equivalente aquí es que el padre no haya encontrado el id en la
       * lista — y como el listado usa el MISMO `get_queryset()` acotado por
       * empresa/sucursal que `retrieve` (confirmado arriba), esa ausencia
       * cubre exactamente los dos casos que el backend fusiona en un 404
       * real: la orden no existe, o existe pero fuera del alcance del
       * usuario. Un solo estado genérico para ambos, igual que pide el
       * contrato del endpoint.
       */}
      {!order ? (
        <ErrorState
          title="Orden de bordado no encontrada"
          message="No existe o no tienes acceso a esta orden de bordado."
        />
      ) : (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Estatus">
              <StatusBadge
                status={String(order.estatus_bordado)}
                config={EMBROIDERY_STATUS_CONFIG}
              />
            </InfoField>
            <InfoField label="Prioridad">
              <StatusBadge
                status={String(order.prioridad)}
                config={EMBROIDERY_PRIORITY_CONFIG}
                defaultConfig={embroideryPriorityFallback(order.prioridad)}
              />
            </InfoField>
            <InfoField label="Pedido">{textOrDash(order.pedido_folio)}</InfoField>
            <InfoField label="Inicio">
              <span className="tabular-nums">
                {formatShortDate(order.fecha_inicio)} · {formatShortTime(order.fecha_inicio)}
              </span>
            </InfoField>
            {/* `fecha_fin` es SIEMPRE `null` hoy (ningún endpoint la fija) —
                se muestra igual, sin ocultar el campo: `formatShortDate`/
                `formatShortTime` ya resuelven `null` al guion largo del
                proyecto, así que no hace falta un `if` especial. */}
            <InfoField label="Fin">
              <span className="tabular-nums">
                {formatShortDate(order.fecha_fin)} · {formatShortTime(order.fecha_fin)}
              </span>
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
              {textOrDash(order.observaciones)}
            </InfoField>
          </div>

          {/* Identificadores sin nombre resuelto — `empresa`/`sucursal`/
              `usuario_asignado` llegan como id crudo del backend (a
              diferencia de Picking/Packing/Dispatch, ninguno trae su
              `*_nombre`); resolverlos es otra tarea. Se rotulan como "ID X" +
              "#N" en vez de mostrar el número solo, mismo criterio que
              `UserDetails` ("ID Usuario" · "#{user.id}") y
              `DispatchDetailDialog` ("Envío #N"/"Transportista #N") para
              dejar claro que es un identificador, no un nombre. */}
          <div>
            <SectionTitle>Identificadores</SectionTitle>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
              <InfoField label="ID Empresa">
                <span className="font-mono">#{order.empresa}</span>
              </InfoField>
              <InfoField label="ID Sucursal">
                <span className="font-mono">#{order.sucursal}</span>
              </InfoField>
              <InfoField label="ID Usuario Asignado">
                <span className="font-mono">
                  {order.usuario_asignado !== null ? `#${order.usuario_asignado}` : "—"}
                </span>
              </InfoField>
            </div>
          </div>

          {/* Artículos */}
          <div>
            <SectionTitle>Artículos de la orden</SectionTitle>
            <LineasTable items={order.detalles} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}

"use client";

import { RulerIcon } from "@/src/components/Icons";
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
  REFLECTIVE_ORDER_PRIORITY_CONFIG,
  REFLECTIVE_ORDER_STATUS_CONFIG,
  reflectiveOrderPriorityFallback,
} from "../constants/reflectiveOrderStatus";
import type {
  ReflectiveOrder,
  ReflectiveOrderLine,
} from "../interfaces/reflective-order.interface";

/**
 * `metros` es un `FloatField(default=0)`: cuando nadie lo captura llega `0`, no
 * `null`. Un "0" pintado como número se lee como una medición real ("esta orden
 * no lleva cinta"), que es falso — nadie lo calcula todavía. Se trata el cero
 * como AUSENCIA y se pinta con el mismo guion largo que los campos nulos.
 *
 * Se descartan también los valores no finitos, mismo criterio defensivo que
 * `computeReflectiveOrderKpis` con `cantidad`.
 */
const metrosOrDash = (metros: number): string =>
  Number.isFinite(metros) && metros !== 0 ? `${formatQuantityValue(metros)} m` : "—";

/**
 * Columnas de `detalles`. A diferencia del diálogo de bordado —que OMITE las
 * columnas estructuralmente vacías—, aquí se pinta el shape COMPLETO con `"—"`
 * por renglón, que es la convención de Packing/Dispatch/Picking.
 *
 * El motivo es que en reflejante esas columnas NO están vacías para el 100% de
 * los renglones: `tipo_reflejante`, `posicion` y `color` SÍ los puebla la
 * generación automática desde ventas (los lee de
 * `PedidoDetalleTalla.reflejante_config`), y solo quedan en `null` cuando la
 * orden se creó desde este módulo, cuyo service construye el detalle sin ellos.
 * Es decir: varían por origen de la orden, exactamente el caso que la
 * convención del `"—"` por renglón resuelve. La excepción de bordado no aplica.
 *
 * `metros` es el único que hoy es constante (`0` por las dos rutas); se muestra
 * igual, como guion, por coherencia con las otras dos columnas del mismo grupo
 * — ocultarla sola dejaría el bloque "configuración del reflejante" a medias.
 */
const LineasTable = ({ items }: { items: ReflectiveOrderLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium">Color</th>
          <th className="px-3 py-2 font-medium">Tipo</th>
          <th className="px-3 py-2 font-medium">Posición</th>
          <th className="px-3 py-2 font-medium text-right">Metros</th>
          <th className="px-3 py-2 font-medium text-right">Cantidad</th>
        </>
      }
    >
      {items.map((linea) => (
        <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <td
            className="px-3 py-2 text-slate-700 dark:text-slate-200 max-w-40 truncate"
            title={linea.producto_nombre ?? undefined}
          >
            {textOrDash(linea.producto_nombre)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
            {textOrDash(linea.talla_nombre)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
            {textOrDash(linea.color_nombre)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
            {textOrDash(linea.tipo_reflejante)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
            {textOrDash(linea.posicion)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-slate-600 dark:text-slate-300">
            {metrosOrDash(linea.metros)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatQuantityValue(linea.cantidad)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface ReflectiveOrderDetailDialogProps {
  /**
   * La orden ya resuelta por el padre, o `null` si el id abierto no existe en
   * la lista cargada.
   *
   * El disparador sigue siendo un `id` (`openOrderId` en
   * `ReflectiveOrdersView`), para poder abrirse desde puntos que solo tienen un
   * id a la mano —el 409 de duplicado, `orden_reflejante_existente.id`, ver
   * `parseReflectiveOrderError.ts`— y no únicamente desde una fila a la vista.
   * Pero la BÚSQUEDA vive en el padre, que ya tiene el arreglo: si se
   * resolviera aquí con otro `useReflectiveOrders()`, el diálogo abriría una
   * segunda suscripción a la misma query y volvería a copiar y ordenar la lista
   * completa en cada render, solo para localizar un renglón que el padre ya
   * tiene.
   *
   * SIN fetch propio en ninguno de los dos casos: listado y detalle comparten
   * `OrdenReflejanteSerializer` en el backend (mismo `serializer_class` a nivel
   * de `ViewSet`, usado por `list` y `retrieve` sin `get_serializer_class` que
   * lo desvíe; el esquema OpenAPI referencia el mismo componente
   * `OrdenReflejante` en ambas respuestas), así que la fila del listado ES el
   * detalle completo.
   */
  order: ReflectiveOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReflectiveOrderDetailDialog({
  order,
  open,
  onOpenChange,
}: ReflectiveOrderDetailDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="880px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <RulerIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Reflejante
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {order ? order.folio_reflejante : "No disponible"}
            </p>
          </div>
        </div>
      }
    >
      {/*
       * SIN fetch propio: sin llamada de red que pueda devolver un 404 real.
       * El equivalente aquí es que el padre no haya encontrado el id en la
       * lista — y como el listado usa el MISMO `get_queryset()` acotado por
       * empresa/sucursal que `retrieve` (confirmado arriba), esa ausencia cubre
       * exactamente los dos casos que el backend fusiona en un 404 real: la
       * orden no existe, o existe pero fuera del alcance del usuario. Un solo
       * estado genérico para ambos, igual que pide el contrato del endpoint.
       */}
      {!order ? (
        <ErrorState
          title="Orden de reflejante no encontrada"
          message="No existe o no tienes acceso a esta orden de reflejante."
        />
      ) : (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Estatus">
              <StatusBadge
                status={String(order.estatus_reflejante)}
                config={REFLECTIVE_ORDER_STATUS_CONFIG}
              />
            </InfoField>
            <InfoField label="Prioridad">
              <StatusBadge
                status={String(order.prioridad)}
                config={REFLECTIVE_ORDER_PRIORITY_CONFIG}
                defaultConfig={reflectiveOrderPriorityFallback(order.prioridad)}
              />
            </InfoField>
            <InfoField label="Pedido">{textOrDash(order.pedido_folio)}</InfoField>
            {/* A diferencia de bordado —que solo recibe el id crudo y por eso lo
                relega al bloque de identificadores—, `OrdenReflejanteSerializer`
                resuelve el nombre del operador. Llega `null` en las órdenes
                generadas automáticamente desde ventas, que no asignan usuario. */}
            <InfoField label="Operador">{textOrDash(order.usuario_nombre)}</InfoField>
            {/* Empresa/Sucursal: antes vivían en un bloque aparte "Identificadores"
                como id crudo (`#1`) porque el backend no traía su nombre. Ahora que
                `empresa_nombre`/`sucursal_nombre` SÍ vienen resueltos (mismo criterio
                que `pedido_folio`/`usuario_nombre`), esa razón desaparece: se integran
                aquí como un campo normal más, igual que Operador. `textOrDash` cubre
                además el hueco temporal de que el backend DESPLEGADO todavía no manda
                estos dos campos (ver la nota de `ReflectiveOrder.empresa_nombre`) —
                mientras tanto se ve como "—", no como un id crudo ni como `undefined`
                literal. */}
            <InfoField label="Empresa">{textOrDash(order.empresa_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(order.sucursal_nombre)}</InfoField>
            <InfoField label="Inicio">
              <span className="tabular-nums">
                {formatShortDate(order.fecha_inicio)} · {formatShortTime(order.fecha_inicio)}
              </span>
            </InfoField>
            {/* `fecha_fin` es SIEMPRE `null` hoy (ningún endpoint la fija) — se
                muestra igual, sin ocultar el campo: `formatShortDate`/
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

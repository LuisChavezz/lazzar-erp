"use client";

import { InfoIcon, RulerIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { ErrorState } from "@/src/components/ErrorState";
import { Loader } from "@/src/components/Loader";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  REFLECTIVE_ORDER_COVERAGE_CONFIG,
  REFLECTIVE_ORDER_PRIORITY_CONFIG,
  REFLECTIVE_ORDER_STATUS_CONFIG,
  reflectiveOrderPriorityFallback,
} from "../constants/reflectiveOrderStatus";
import { useReflectiveOrderDetail } from "../hooks/useReflectiveOrderDetail";
import type {
  ReflectiveOrderDetailLine,
  ReflectiveOrderSibling,
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

/** Cantidad que puede llegar `null` del backend. `null` → guion largo. */
const quantityOrDash = (value: number | null) =>
  value === null ? "—" : formatQuantityValue(value);

/**
 * Renglones de la orden.
 *
 * Las cuatro cantidades hablan de cosas distintas y la tabla lo dice en la
 * cabecera, porque confundirlas es el error que este diálogo existe para evitar:
 *  - "En esta orden" (`cantidad`) → lo que programa ESTE documento.
 *  - "Programado" (`cantidad_asignada`) → lo que llevan TODAS las OR activas del
 *    pedido sobre esa línea, esta incluida. Es ≥ la anterior.
 *  - "Pedido" (`cantidad_pedido`) y "Pendiente" (`cantidad_pendiente`) → el
 *    contrato y su saldo.
 * La columna propia de la orden va resaltada; las otras tres, atenuadas: son
 * contexto del pedido, no de este documento.
 *
 * `tipo_reflejante`, `posicion` y `metros` se conservan con su `"—"` por
 * renglón (la convención de Packing/Dispatch/Picking, y no la excepción de
 * bordado de omitir columnas vacías) porque NO están vacías para el 100% de los
 * renglones: `tipo_reflejante`/`posicion` los puebla la generación automática
 * desde ventas y solo quedan en `null` cuando la orden se creó desde este
 * módulo, cuyo service construye el detalle sin ellos. Varían por ORIGEN de la
 * orden, que es exactamente el caso que la convención del `"—"` resuelve.
 *
 * `metros` es el único constante (`0` por las dos rutas); se muestra igual, como
 * guion, por coherencia con las otras dos del mismo grupo — ocultarla sola
 * dejaría el bloque "configuración del reflejante" a medias.
 */
const LineasTable = ({ items }: { items: ReflectiveOrderDetailLine[] }) => {
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
          <th className="px-3 py-2 font-medium text-right">En esta orden</th>
          <th className="px-3 py-2 font-medium text-right">Programado</th>
          <th className="px-3 py-2 font-medium text-right">Pedido</th>
          <th className="px-3 py-2 font-medium text-right">Pendiente</th>
        </>
      }
    >
      {items.map((linea) => (
        <tr
          key={linea.id}
          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
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
          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-slate-500 dark:text-slate-400">
            {quantityOrDash(linea.cantidad_asignada)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-slate-500 dark:text-slate-400">
            {quantityOrDash(linea.cantidad_pedido)}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-slate-500 dark:text-slate-400">
            {quantityOrDash(linea.cantidad_pendiente)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

/** Las otras OR activas del mismo pedido. Solo se monta si hay alguna. */
const SiblingOrders = ({ items }: { items: ReflectiveOrderSibling[] }) => (
  <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
    <ul className="space-y-1 text-xs">
      {items.map((hermana) => (
        <li key={hermana.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {/* Solo folio y fecha: no hay navegación cruzada entre detalles en
              este módulo y no se inventa una aquí. El folio identifica la orden
              y es buscable en la tabla. */}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {hermana.folio_reflejante}
          </span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {formatShortDate(hermana.fecha_inicio)} ·{" "}
            {formatShortTime(hermana.fecha_inicio)}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

interface ReflectiveOrderDetailDialogProps {
  /**
   * Id de la orden a consultar. `null` mantiene la consulta apagada.
   *
   * Este diálogo recibía la ORDEN ya resuelta por el padre contra la lista en
   * caché, apoyado en que `list` y `retrieve` compartían
   * `OrdenReflejanteSerializer`. Dejaron de compartirlo: el `retrieve` trae, y
   * la fila no, la parcialidad por línea
   * (`cantidad_pedido`/`cantidad_asignada`/`cantidad_pendiente`), el
   * `reflejante_config` crudo, `otras_ordenes_del_pedido` y
   * `reparto_por_talla_aproximado`. Ahora se abre por id y el diálogo trae su
   * propio detalle (ver `useReflectiveOrderDetail`).
   *
   * El disparador ya era un id, así que esto además resuelve sin caso especial
   * la apertura desde el enlace del 409 de duplicado
   * (`orden_reflejante_existente.id`, ver `parseReflectiveOrderError.ts`), que
   * nombra una orden que puede no estar en la lista cargada — antes ese camino
   * caía en el estado "no encontrada".
   */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReflectiveOrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: ReflectiveOrderDetailDialogProps) {
  const { data: order, isLoading, isError, error } = useReflectiveOrderDetail(orderId);

  // Porcentaje solo para mostrar; `cantidad_contratada` puede ser 0 (pedido sin
  // líneas de reflejante vivas) y dividir daría "∞%".
  const porcentaje =
    order && order.cantidad_contratada > 0
      ? Math.round((order.cantidad_cubierta / order.cantidad_contratada) * 100)
      : null;

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
              {order ? order.folio_reflejante : isError ? "Error al cargar" : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* El armazón del diálogo NO se sustituye por el loader ni por el error:
          se mantiene montado y solo cambia su contenido (mismo patrón que
          `EmbroideryOrderDetailDialog`/`StockTransferDetailDialog`). */}
      {isLoading && <Loader title="Cargando detalle de la orden..." className="py-16" />}

      {/* `isError` sin `hasLoaded`: aquí no hay refetch en segundo plano que
          proteger —la consulta se monta con el diálogo y muere con él—, así que
          un error siempre ES el de la carga inicial. El caso "no existe o no
          tienes acceso" llega por esta misma vía: el backend responde 404 y no
          403, porque su `get_queryset()` acotado por tenant no distingue un id
          ajeno de uno inexistente. */}
      {isError && (
        <ErrorState
          title="No se pudo cargar la orden de reflejante"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a ella o falló la conexión.",
          )}
        />
      )}

      {!isLoading && !isError && order && (
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
            <InfoField label="Empresa">{textOrDash(order.empresa_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(order.sucursal_nombre)}</InfoField>
            <InfoField label="Inicio">
              <span className="tabular-nums">
                {formatShortDate(order.fecha_inicio)} ·{" "}
                {formatShortTime(order.fecha_inicio)}
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

          {/* Cobertura sobre el pedido. `order` ya está garantizado no-nulo en
              esta rama —el bloque completo vive dentro de
              `!isLoading && !isError && order &&`—, así que no hace falta ningún
              gate propio: el trío llega siempre con el resto del detalle
              (`OrdenReflejanteRetrieveSerializer` hereda del de listado), venga
              la orden de la tabla o del enlace del 409 de duplicado. */}
          <div>
            <SectionTitle>Cobertura del pedido</SectionTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
              <StatusBadge
                status={String(order.cobertura_completa)}
                config={REFLECTIVE_ORDER_COVERAGE_CONFIG}
              />
              <span className="tabular-nums text-slate-700 dark:text-slate-200">
                <span className="font-semibold">
                  {formatQuantityValue(order.cantidad_cubierta)}
                </span>{" "}
                de {formatQuantityValue(order.cantidad_contratada)} piezas contratadas
                por el pedido
                {porcentaje !== null && ` · ${porcentaje}%`}
              </span>
              {!order.cobertura_completa && (
                <span className="text-slate-500 dark:text-slate-400">
                  El resto puede programarse en otras órdenes de reflejante.
                </span>
              )}
            </div>
          </div>

          {/* Otras OR del mismo pedido — solo si las hay. */}
          {order.otras_ordenes_del_pedido.length > 0 && (
            <div>
              <SectionTitle>Otras órdenes de este pedido</SectionTitle>
              <SiblingOrders items={order.otras_ordenes_del_pedido} />
            </div>
          )}

          {/* Reparto aproximado — solo cuando el backend lo marca; sin el gate
              sería un estado vacío permanente. */}
          {order.reparto_por_talla_aproximado && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
            >
              <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
                El pedido tiene piezas programadas sin talla identificable. El total por
                producto es exacto, pero el reparto <strong>por talla</strong> que se
                muestra abajo es aproximado.
              </p>
            </div>
          )}

          {/* Artículos */}
          <div>
            <SectionTitle>Artículos de la orden</SectionTitle>
            {/* El desglose NO es el del pedido completo: el backend solo itemiza
                las líneas que ESTA orden toca, así que las demás líneas de
                reflejante del pedido no aparecen aquí ni siquiera en cero.
                Decirlo evita leer la suma de la columna "Pedido" como el total
                contratado —que es el del bloque de cobertura de arriba—. */}
            <p className="-mt-1 mb-2 text-[11px] text-slate-500 dark:text-slate-400">
              Solo las líneas que incluye esta orden. Si el pedido tiene otras prendas por
              reflejar, no se listan aquí.
            </p>
            <LineasTable items={order.detalles} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}

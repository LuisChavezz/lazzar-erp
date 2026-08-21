"use client";

import { InfoIcon, ScissorsIcon } from "@/src/components/Icons";
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
import { resolveEmbroideryLineUbicaciones } from "../utils/resolveEmbroideryLineUbicaciones";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  EMBROIDERY_COVERAGE_CONFIG,
  EMBROIDERY_PRIORITY_CONFIG,
  EMBROIDERY_STATUS_CONFIG,
  embroideryPriorityFallback,
} from "../constants/embroideryStatus";
import { useEmbroideryOrderDetail } from "../hooks/useEmbroideryOrderDetail";
import type {
  EmbroideryOrderDetailLine,
  EmbroideryOrderSibling,
} from "../interfaces/embroidery.interface";
import { EmbroideryLineLocationPopover } from "./EmbroideryLineLocationPopover";

/** Cantidad que puede llegar `null` del backend. `null` → guion largo. */
const quantityOrDash = (value: number | null) =>
  value === null ? "—" : formatQuantityValue(value);

/**
 * Renglones de la orden.
 *
 * Las cuatro cantidades hablan de cosas distintas y la tabla lo dice en la
 * cabecera, porque confundirlas es el error que este diálogo existe para
 * evitar:
 *  - "En esta orden" (`cantidad`) → lo que programa ESTE documento.
 *  - "Programado" (`cantidad_asignada`) → lo que llevan TODAS las OB activas
 *    del pedido sobre esa línea, esta incluida. Es ≥ la anterior.
 *  - "Pedido" (`cantidad_pedido`) y "Pendiente" (`cantidad_pendiente`) → el
 *    contrato y su saldo.
 * La columna propia de la orden va resaltada; las otras tres, atenuadas: son
 * contexto del pedido, no de este documento.
 *
 * `color_nombre` y `posicion_bordado` sí se muestran —a diferencia de cuando se
 * escribió la versión anterior de este diálogo, hoy llegan poblados en parte de
 * los renglones, así que ocultarlos escondería dato real—, pero NO de la misma
 * forma:
 *  - `color_nombre` tiene columna propia y cae a `"—"` cuando falta.
 *  - `posicion_bordado` NO tiene columna: va dentro de la celda del producto
 *    (ver la nota de la cabecera). Con ubicaciones capturadas es la etiqueta del
 *    disparador del popover, que ya resuelve por su cuenta el caso nulo
 *    ("Detalle del bordado"); sin ninguna se pinta como texto plano y solo si el
 *    renglón lo trae. En ningún camino aparece un `"—"`: una posición ausente
 *    simplemente no ocupa espacio.
 *
 * OJO con `posicion_bordado` como dato: el service lo deriva de
 * `ubicaciones[0]`, igual que `colores_hilo` y `puntadas`. En una línea con
 * varios bordados describe SOLO el primero, así que no puede leerse como "la
 * posición de esta línea". Por eso, cuando hay más de una ubicación, el
 * disparador enumera todos los códigos y la celda añade un contador — y el
 * desglose completo, con la imagen de cada bordado, vive en el popover.
 */
const LineasTable = ({ items }: { items: EmbroideryOrderDetailLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          {/* La posición viaja DENTRO de la celda del producto, no en columna
              propia: son siete columnas en un diálogo de 900px y
              `LineItemsTable` —componente compartido, no se toca— solo tiene
              scroll vertical, así que una columna más se cobraría en celdas
              apretadas. Además es donde la puso el Paso 2 del alta. */}
          <th className="px-3 py-2 font-medium">Producto</th>
          <th className="px-3 py-2 font-medium">Talla</th>
          <th className="px-3 py-2 font-medium">Color</th>
          <th className="px-3 py-2 font-medium text-right">En esta orden</th>
          <th className="px-3 py-2 font-medium text-right">Programado</th>
          <th className="px-3 py-2 font-medium text-right">Pedido</th>
          <th className="px-3 py-2 font-medium text-right">Pendiente</th>
        </>
      }
    >
      {items.map((linea) => {
        // TODAS las ubicaciones del renglón, no `ubicaciones[0]`: hay líneas
        // reales con dos bordados (ver `resolveEmbroideryLineUbicaciones`, que
        // además explica por qué la fuente preferida es `configuracion` —la
        // foto congelada al emitir la orden— y no la lectura en vivo del
        // pedido). Misma regla que el Paso 2 del alta: sin NINGUNA ubicación
        // capturada no hay nada que abrir y se cae a la etiqueta plana.
        const ubicaciones = resolveEmbroideryLineUbicaciones(linea);

        return (
          <tr
            key={linea.id}
            className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
              <span className="block">{linea.producto_nombre ?? "—"}</span>
              {ubicaciones.length > 0 ? (
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <EmbroideryLineLocationPopover
                    ubicaciones={ubicaciones}
                    productoNombre={linea.producto_nombre ?? `Producto #${linea.producto}`}
                    tallaNombre={linea.talla_nombre}
                    colorNombre={linea.color_nombre}
                    posicionLabel={linea.posicion_bordado}
                  />
                  {/* Mismo distintivo que el Paso 2 del alta, y por el mismo
                      motivo: `posicion_bordado` es la columna escalar del
                      renglón y SIEMPRE describe solo la primera ubicación (el
                      service la deriva de `ubicaciones[0]`), así que sin este
                      contador una línea de dos bordados se leería como de uno.
                      Es lo único que delata la diferencia sin abrir el popover. */}
                  {ubicaciones.length > 1 && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                      {ubicaciones.length} bordados
                    </span>
                  )}
                </span>
              ) : (
                // Sin ubicación capturada no hay nada que abrir; la posición
                // se pinta plana y solo si el renglón la trae (llega poblada
                // en una minoría de las órdenes).
                linea.posicion_bordado && (
                  <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                    Posición: {linea.posicion_bordado}
                  </span>
                )
              )}
            </td>
            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
              {linea.talla_nombre ?? "—"}
            </td>
            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
              {linea.color_nombre ?? "—"}
            </td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
              {formatQuantityValue(linea.cantidad)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
              {quantityOrDash(linea.cantidad_asignada)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
              {quantityOrDash(linea.cantidad_pedido)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
              {quantityOrDash(linea.cantidad_pendiente)}
            </td>
          </tr>
        );
      })}
    </LineItemsTable>
  );
};

/** Las otras OB activas del mismo pedido. Solo se monta si hay alguna. */
const SiblingOrders = ({ items }: { items: EmbroideryOrderSibling[] }) => (
  <div className="rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3">
    <ul className="space-y-1 text-xs">
      {items.map((hermana) => (
        <li key={hermana.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {/* Solo folio y fecha: no hay navegación cruzada entre detalles en
              este módulo y no se inventa una aquí. El folio identifica la
              orden y es buscable en la tabla. */}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {hermana.folio_bordado}
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

interface EmbroideryOrderDetailDialogProps {
  /**
   * Id de la orden a consultar. `null` mantiene la consulta apagada.
   *
   * El diálogo se abre por id —no por el objeto de fila— para poder dispararse
   * también desde el enlace del 409 de duplicado
   * (`orden_bordado_existente.id`, ver `parseEmbroideryOrderError.ts`), que
   * nombra una orden que puede no estar en la lista cargada.
   */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbroideryOrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: EmbroideryOrderDetailDialogProps) {
  const { data: order, isLoading, isError, error } = useEmbroideryOrderDetail(orderId);

  // Porcentaje solo para mostrar; `cantidad_contratada` puede ser 0 (pedido sin
  // líneas de bordado vivas) y dividir daría "∞%".
  //
  // Sale de `order` —la consulta por id, la misma fuente que todo lo demás en
  // este diálogo—, ya no de una prop `coverage?` aparte: el `retrieve` declara
  // el trío de cobertura desde que `OrdenBordadoRetrieveSerializer` hereda de
  // `OrdenBordadoListSerializer` en el backend (ver
  // `EmbroideryOrderDetail`/`EmbroideryOrder`). Esto además resuelve sin caso
  // especial la apertura por el enlace del 409 de duplicado (un id que puede
  // no estar en la lista cargada): antes esa vía dejaba `coverage` en
  // `undefined` y el bloque se omitía; ahora `order` llega de su propia
  // petición por id sin depender de qué haya cargado la tabla.
  const porcentaje =
    order && order.cantidad_contratada > 0
      ? Math.round((order.cantidad_cubierta / order.cantidad_contratada) * 100)
      : null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ScissorsIcon className="w-5 h-5 text-fuchsia-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Bordado
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {order ? order.folio_bordado : isError ? "Error al cargar" : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* El armazón del diálogo NO se sustituye por el loader ni por el error:
          se mantiene montado y solo cambia su contenido (mismo patrón que
          `StockTransferDetailDialog`). */}
      {isLoading && (
        <Loader title="Cargando detalle de la orden..." className="py-16" />
      )}

      {/* `isError` sin `hasLoaded`: aquí no hay refetch en segundo plano que
          proteger —la consulta se monta con el diálogo y muere con él, y nada
          la invalida mientras está abierta—, así que un error siempre ES el de
          la carga inicial. El caso "no existe o no tienes acceso" llega por
          esta misma vía: el backend responde 404 y no 403, porque su
          `get_queryset()` acotado por tenant no distingue un id ajeno de uno
          inexistente. */}
      {isError && (
        <ErrorState
          title="No se pudo cargar la orden de bordado"
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

          {/* Empresa / sucursal / usuario, con el NOMBRE resuelto que el
              backend ya devuelve (`empresa_nombre`/`sucursal_nombre`/
              `usuario_nombre`, vía `source=` + `select_related`). Antes este
              bloque pintaba los ids crudos bajo el rótulo "Identificadores",
              porque el código daba por hecho —incorrectamente— que este
              endpoint no resolvía nombres. Sí lo hace, y desde siempre. */}
          <div>
            <SectionTitle>Origen</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
              <InfoField label="Empresa">{textOrDash(order.empresa_nombre)}</InfoField>
              <InfoField label="Sucursal">{textOrDash(order.sucursal_nombre)}</InfoField>
              <InfoField label="Operador asignado">
                {textOrDash(order.usuario_nombre)}
              </InfoField>
              {/* Solo lectura, como todo este diálogo: el proveedor se asigna
                  en la página de la orden. Sin proveedor se enuncia "Bordado
                  interno" —el significado real del `null`— y no el guion largo
                  de `textOrDash`, que se leería como dato faltante. */}
              <InfoField label="Proveedor">
                {order.proveedor_nombre?.trim() || "Bordado interno"}
              </InfoField>
            </div>
          </div>

          {/* Cobertura sobre el pedido. `order` ya está garantizado no-nulo en
              esta rama —el bloque completo vive dentro de
              `!isLoading && !isError && order &&`—, así que no hace falta
              ningún gate propio: el trío llega siempre con el resto del
              detalle, venga la orden de la tabla o del enlace del 409 de
              duplicado. */}
          <div>
            <SectionTitle>Cobertura del pedido</SectionTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
              <StatusBadge
                status={String(order.cobertura_completa)}
                config={EMBROIDERY_COVERAGE_CONFIG}
              />
              <span className="tabular-nums text-slate-700 dark:text-slate-200">
                <span className="font-semibold">
                  {formatQuantityValue(order.cantidad_cubierta)}
                </span>{" "}
                de {formatQuantityValue(order.cantidad_contratada)} piezas
                contratadas por el pedido
                {porcentaje !== null && ` · ${porcentaje}%`}
              </span>
              {!order.cobertura_completa && (
                <span className="text-slate-500 dark:text-slate-400">
                  El resto puede programarse en otras órdenes de bordado.
                </span>
              )}
            </div>
          </div>

          {/* Otras OB del mismo pedido — solo si las hay. */}
          {order.otras_ordenes_del_pedido.length > 0 && (
            <div>
              <SectionTitle>Otras órdenes de este pedido</SectionTitle>
              <SiblingOrders items={order.otras_ordenes_del_pedido} />
            </div>
          )}

          {/* Reparto aproximado — solo cuando el backend lo marca. Hoy es
              `false` en toda la base, así que este aviso normalmente no
              aparece; sin el gate sería un estado vacío permanente. */}
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
            {/* El desglose NO es el del pedido completo: el backend solo
                itemiza las líneas que ESTA orden toca, así que las demás
                líneas de bordado del pedido no aparecen aquí ni siquiera en
                cero. Decirlo evita leer la suma de la columna "Pedido" como el
                total contratado —que es el del bloque de cobertura de
                arriba—. */}
            <p className="-mt-1 mb-2 text-[11px] text-slate-500 dark:text-slate-400">
              Solo las líneas que incluye esta orden. Si el pedido tiene otras prendas por
              bordar, no se listan aquí.
            </p>
            <LineasTable items={order.detalles} />
          </div>
        </div>
      )}
    </MainDialog>
  );
}

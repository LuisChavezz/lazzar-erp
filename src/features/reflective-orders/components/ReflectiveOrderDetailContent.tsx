"use client";

import Link from "next/link";
import { ArrowLeftIcon, InfoIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  InfoGrid,
  Section,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  REFLECTIVE_ORDER_COVERAGE_CONFIG,
  REFLECTIVE_ORDER_PRIORITY_CONFIG,
  reflectiveOrderPriorityFallback,
  reflectiveStatusEntry,
} from "../constants/reflectiveOrderStatus";
import { useReflectiveOrderDetail } from "../hooks/useReflectiveOrderDetail";
import { resolveReflectiveLineConfigs } from "../utils/resolveReflectiveLineConfigs";
import {
  ReflectiveConfigCountBadge,
  ReflectiveLineConfigPopover,
} from "./ReflectiveLineConfigPopover";
import type {
  ReflectiveOrderDetailLine,
  ReflectiveOrderSibling,
} from "../interfaces/reflective-order.interface";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing`, exige
// `R-PRODUCCION` y hoy solo se alcanza desde el listado del propio módulo, así
// que un mapa de orígenes tendría una sola entrada idéntica a su default.
const BACK = {
  href: "/manufacturing/reflective-orders",
  label: "Volver a Órdenes de Reflejante",
};

/**
 * Cantidad que puede llegar `null` del backend → guion largo. Las tres
 * cantidades de parcialidad por línea lo hacen cuando el renglón no cruza con
 * el mapa de parcialidad del pedido (clave `(pedido_detalle, talla)`).
 */
const quantityOrDash = (value: number | null) =>
  value === null ? "—" : formatQuantityValue(value);

/**
 * `metros` es un `FloatField(default=0)`: cuando nadie lo captura llega `0`, no
 * `null`. Un "0" pintado como número se lee como una medición real ("esta orden
 * no lleva cinta"), que es falso — nadie lo calcula todavía. Se trata el cero
 * como AUSENCIA y se pinta con el mismo guion largo que los campos nulos, misma
 * convención que `ReflectiveOrderDetailDialog`.
 *
 * Se descartan también los valores no finitos, mismo criterio defensivo que
 * `computeReflectiveOrderKpis` con `cantidad`.
 */
const metrosOrDash = (metros: number): string =>
  Number.isFinite(metros) && metros !== 0 ? `${formatQuantityValue(metros)} m` : "—";

// ── Artículos de la orden ────────────────────────────────────────────────────

/**
 * Renglones de la orden.
 *
 * Es una tabla propia y NO `LineItemsTable` (el chrome que usa el diálogo): ese
 * contenedor acota el alto a `max-h-72` con scroll interno, que es lo correcto
 * dentro de un diálogo y lo contrario de lo que quiere una página — aquí los
 * renglones se leen de corrido, y el único scroll es el horizontal que ya usan
 * `PedidoDetailContent` y la página de bordado.
 *
 * Las cuatro cantidades hablan de cosas distintas y la cabecera lo dice, porque
 * confundirlas es el error que este desglose existe para evitar:
 *  - "En esta orden" (`cantidad`) → lo que programa ESTE documento.
 *  - "Programado" (`cantidad_asignada`) → lo que llevan TODAS las OR activas del
 *    pedido sobre esa línea, esta incluida. Es ≥ la anterior.
 *  - "Pedido" (`cantidad_pedido`) y "Pendiente" (`cantidad_pendiente`) → el
 *    contrato y su saldo.
 * La columna propia de la orden va resaltada; las otras tres, atenuadas: son
 * contexto del pedido, no de este documento.
 *
 * `tipo_reflejante`, `posicion` y `metros` conservan su `"—"` por renglón (la
 * convención de Packing/Dispatch/Picking, y no la excepción de bordado de
 * omitir columnas vacías) porque NO están vacías para el 100% de los renglones:
 * `tipo_reflejante`/`posicion` los puebla la generación automática desde ventas
 * y solo quedan en `null` cuando la orden se creó desde este módulo, cuyo
 * service construye el detalle sin ellos. Varían por ORIGEN de la orden, que es
 * exactamente el caso que la convención del `"—"` resuelve. `metros` es el
 * único constante (`0` por las dos rutas); se muestra igual, por coherencia con
 * las otras dos del mismo grupo.
 *
 * OJO: los dos escalares describen SOLO el primer reflejante del renglón. El
 * arreglo completo —hasta tres reflejantes, con dos materiales distintos en la
 * misma prenda— vive en el popover de la celda del producto (ver
 * `resolveReflectiveLineConfigs`), no en estas columnas.
 */
const LineasTable = ({ items }: { items: ReflectiveOrderDetailLine[] }) => {
  if (items.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-semibold">Producto</th>
            <th className="px-3 py-2 text-left font-semibold">Talla</th>
            <th className="px-3 py-2 text-left font-semibold">Color</th>
            <th className="px-3 py-2 text-left font-semibold">Tipo</th>
            <th className="px-3 py-2 text-left font-semibold">Posición</th>
            <th className="px-3 py-2 text-right font-semibold">Metros</th>
            <th className="px-3 py-2 text-right font-semibold">En esta orden</th>
            <th className="px-3 py-2 text-right font-semibold">Programado</th>
            <th className="px-3 py-2 text-right font-semibold">Pedido</th>
            <th className="px-3 py-2 text-right font-semibold">Pendiente</th>
          </tr>
        </thead>
        <tbody>
          {items.map((linea) => {
            // TODOS los reflejantes del renglón. Prefiere `configuracion` (la
            // foto congelada al emitir la orden) y cae a la lectura en vivo solo
            // cuando no la hay —órdenes anteriores a la migración—. Ver
            // `resolveReflectiveLineConfigs`, que es el resolvedor propio de
            // este módulo: aquí el config es un ARREGLO, no el objeto de
            // bordado, así que el helper de aquel NO sirve.
            const configs = resolveReflectiveLineConfigs(linea);

            return (
              <tr
                key={linea.id}
                className="border-t border-slate-100 dark:border-white/10 align-top hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {textOrDash(linea.producto_nombre)}
                  {configs.length > 0 && (
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <ReflectiveLineConfigPopover
                        configs={configs}
                        productoNombre={
                          linea.producto_nombre ?? `Producto #${linea.producto}`
                        }
                        tallaNombre={linea.talla_nombre}
                        colorNombre={linea.color_nombre}
                      />
                      <ReflectiveConfigCountBadge configs={configs} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {textOrDash(linea.talla_nombre)}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {textOrDash(linea.color_nombre)}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {textOrDash(linea.tipo_reflejante)}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {textOrDash(linea.posicion)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {metrosOrDash(linea.metros)}
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
        </tbody>
      </table>
    </div>
  );
};

/**
 * Las otras OR activas del mismo pedido.
 *
 * A diferencia del diálogo —que las lista como texto plano porque no hay a
 * dónde navegar desde un modal sin cerrarlo—, aquí CADA hermana enlaza a su
 * propia página: es la misma ruta con otro id, así que el enlace no inventa
 * ninguna navegación que la página no soporte ya.
 */
const SiblingOrders = ({ items }: { items: ReflectiveOrderSibling[] }) => (
  <ul className="space-y-1 text-xs">
    {items.map((hermana) => (
      <li key={hermana.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <Link
          href={`/manufacturing/reflective-orders/${hermana.id}`}
          className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
        >
          {hermana.folio_reflejante}
        </Link>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {formatShortDate(hermana.fecha_inicio)} ·{" "}
          {formatShortTime(hermana.fecha_inicio)}
        </span>
      </li>
    ))}
  </ul>
);

// ── Componente principal ─────────────────────────────────────────────────────

interface ReflectiveOrderDetailContentProps {
  /** Id de la orden tal cual llega del segmento de ruta (string). */
  orderId: string;
}

export function ReflectiveOrderDetailContent({
  orderId,
}: ReflectiveOrderDetailContentProps) {
  const numericId = Number(orderId);
  const { data, isLoading, isError, error } = useReflectiveOrderDetail(numericId);

  const BackLink = (
    <Link
      href={BACK.href}
      className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{BACK.label}</span>
    </Link>
  );

  // Los tres estados de fallo repiten el "Volver": sin él la página quedaría
  // sin salida salvo por el botón atrás del navegador.
  if (Number.isNaN(numericId) || numericId <= 0) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Orden no válida"
          message="El identificador de la orden de reflejante no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de reflejante"
          message="Obteniendo el detalle de la orden..."
        />
      </div>
    );
  }

  // El caso "no existe o no tienes acceso" llega por aquí: el backend responde
  // 404 y no 403, porque su `get_queryset()` acotado por tenant no distingue un
  // id ajeno de uno inexistente.
  if (isError || !data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="No se pudo cargar la orden de reflejante"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a ella o falló la conexión.",
          )}
        />
      </div>
    );
  }

  // Solo para mostrar: `cantidad_contratada` puede ser 0 (pedido sin líneas de
  // reflejante vivas) y dividir daría "∞%".
  const porcentaje =
    data.cantidad_contratada > 0
      ? Math.round((data.cantidad_cubierta / data.cantidad_contratada) * 100)
      : null;

  return (
    <div className="w-full space-y-6">
      {/* ── Barra superior con "Volver" ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 py-2 w-fit">{BackLink}</div>

      {/* ── 1. Cabecera ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {data.folio_reflejante || `Orden #${data.id}`}
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs shrink-0">
            <InfoField label="Alta">
              <span className="tabular-nums">
                {formatShortDate(data.fecha_inicio)} ·{" "}
                {formatShortTime(data.fecha_inicio)}
              </span>
            </InfoField>
            {/* `fecha_fin` es SIEMPRE `null` hoy (ningún endpoint la fija) — se
                muestra igual: `formatShortDate`/`formatShortTime` ya resuelven
                `null` al guion largo del proyecto. */}
            <InfoField label="Fin">
              <span className="tabular-nums">
                {formatShortDate(data.fecha_fin)} · {formatShortTime(data.fecha_fin)}
              </span>
            </InfoField>
            {/* `cantidad_cubierta` y NO la suma cruda de `detalles[].cantidad`:
                son el mismo concepto —piezas que programa ESTA orden— pero el
                backend publica la suya con PISO deliberado (`math.floor`, para
                no sobre-reportar cobertura) y `OrdenReflejanteDetalle.cantidad`
                es un `FloatField`. Sumar en crudo pintaría "9.6" aquí y
                "9 de 10 · 90%" en el bloque de cobertura de abajo: dos cifras
                del mismo dato en la misma pantalla. Mismo criterio ya fijado en
                la página de bordado. */}
            <InfoField label="Total piezas">
              <span className="tabular-nums font-semibold">
                {formatQuantityValue(data.cantidad_cubierta)}
              </span>
            </InfoField>
            <InfoField label="Cobertura">
              <StatusBadge
                status={String(data.cobertura_completa)}
                config={REFLECTIVE_ORDER_COVERAGE_CONFIG}
              />
            </InfoField>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 2. Información general ────────────────────────────────────── */}
        <Section title="Información general">
          <InfoGrid>
            <InfoField label="Pedido">
              {/* Se navega por `pedido_vinculado`, no por el par plano
                  `pedido`/`pedido_folio`: su presencia es la única señal de que
                  el pedido madre existe. Sin él queda el folio como texto.
                  `/orders/[id]` es la ruta NEUTRA del detalle 360° (solo exige
                  auth + workspace), y `?from=reflective` hace que su "Volver"
                  regrese al listado de este módulo en vez de a Mesa de Control,
                  que un usuario solo-Producción no puede abrir. */}
              {data.pedido_vinculado ? (
                <Link
                  href={`/orders/${data.pedido_vinculado.id}?from=reflective`}
                  className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                >
                  {data.pedido_vinculado.folio}
                </Link>
              ) : (
                <span className="font-mono">{textOrDash(data.pedido_folio)}</span>
              )}
            </InfoField>
            <InfoField label="Estatus">
              <StatusBadge
                status={String(data.estatus_reflejante)}
                config={{
                  [data.estatus_reflejante]: reflectiveStatusEntry(
                    data.estatus_reflejante,
                    data.estatus_reflejante_display,
                  ),
                }}
              />
            </InfoField>
            <InfoField label="Prioridad">
              <StatusBadge
                status={String(data.prioridad)}
                config={REFLECTIVE_ORDER_PRIORITY_CONFIG}
                defaultConfig={reflectiveOrderPriorityFallback(data.prioridad)}
              />
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
              {textOrDash(data.observaciones)}
            </InfoField>
          </InfoGrid>
        </Section>

        {/* ── 3. Origen ─────────────────────────────────────────────────── */}
        {/* Empresa / sucursal / usuario con el NOMBRE ya resuelto que el
            backend devuelve (`*_nombre`, vía `source=` + `SerializerMethodField`);
            los ids crudos no se pintan porque no le dicen nada al usuario.
            `usuario_nombre` llega `null` en las órdenes generadas
            automáticamente desde ventas, que no asignan operador. */}
        <Section title="Origen">
          <InfoGrid>
            <InfoField label="Empresa">{textOrDash(data.empresa_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
            <InfoField label="Operador asignado">
              {textOrDash(data.usuario_nombre)}
            </InfoField>
          </InfoGrid>
        </Section>
      </div>

      {/* ── 4. Cobertura del pedido ─────────────────────────────────────── */}
      <Section title="Cobertura del pedido">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
          <StatusBadge
            status={String(data.cobertura_completa)}
            config={REFLECTIVE_ORDER_COVERAGE_CONFIG}
          />
          <span className="tabular-nums text-slate-700 dark:text-slate-200">
            <span className="font-semibold">
              {formatQuantityValue(data.cantidad_cubierta)}
            </span>{" "}
            de {formatQuantityValue(data.cantidad_contratada)} piezas contratadas por
            el pedido
            {porcentaje !== null && ` · ${porcentaje}%`}
          </span>
          {!data.cobertura_completa && (
            <span className="text-slate-500 dark:text-slate-400">
              El resto puede programarse en otras órdenes de reflejante.
            </span>
          )}
        </div>

        {/* Reparto aproximado — solo cuando el backend lo marca; sin el gate
            sería un estado vacío permanente. */}
        {data.reparto_por_talla_aproximado && (
          <div
            role="note"
            className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
          >
            <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
              El pedido tiene piezas programadas sin talla identificable. El total por
              producto es exacto, pero el reparto <strong>por talla</strong> que se
              muestra abajo es aproximado.
            </p>
          </div>
        )}

        {/* Otras OR del mismo pedido — solo si las hay. */}
        {data.otras_ordenes_del_pedido.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <SectionTitle>
              Otras órdenes de este pedido ({data.otras_ordenes_del_pedido.length})
            </SectionTitle>
            <SiblingOrders items={data.otras_ordenes_del_pedido} />
          </div>
        )}
      </Section>

      {/* ── 5. Artículos de la orden ────────────────────────────────────── */}
      <Section title={`Artículos de la orden (${data.detalles.length})`}>
        {/* El desglose NO es el del pedido completo: el backend solo itemiza las
            líneas que ESTA orden toca, así que las demás líneas de reflejante
            del pedido no aparecen aquí ni siquiera en cero. Decirlo evita leer
            la suma de la columna "Pedido" como el total contratado — que es el
            del bloque de cobertura de arriba. */}
        <p className="-mt-2 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          Solo se muestran los artículos que cubre esta orden. Si el pedido tiene otras
          prendas por reflejar, no se listan aquí.
        </p>
        <LineasTable items={data.detalles} />
      </Section>
    </div>
  );
}

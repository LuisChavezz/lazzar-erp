"use client";

import Link from "next/link";
import { ArrowLeftIcon, InfoIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
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
  EMBROIDERY_COVERAGE_CONFIG,
  EMBROIDERY_PRIORITY_CONFIG,
  embroideryPriorityFallback,
} from "../constants/embroideryStatus";
import { getAvailableTransitions } from "../constants/embroideryStatusTransitions";
import { useEmbroideryOrderDetail } from "../hooks/useEmbroideryOrderDetail";
import { useUpdateEmbroideryOrder } from "../hooks/useUpdateEmbroideryOrder";
import { EmbroideryStatusSelect } from "./EmbroideryStatusSelect";
import { EmbroideryMachineField } from "./EmbroideryMachineField";
import { EmbroideryPrioritySelect } from "./EmbroideryPrioritySelect";
import { EmbroideryObservationsField } from "./EmbroideryObservationsField";
import { EmbroideryOperatorSelect } from "./EmbroideryOperatorSelect";
import { EmbroideryProgressSummary } from "./EmbroideryProgressSummary";
import { EmbroideryAvancesHistory } from "./EmbroideryAvancesHistory";
import type { EmbroideryOrderSibling } from "../interfaces/embroidery.interface";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing`, exige
// `R-PRODUCCION` y hoy solo se alcanza desde el listado del propio módulo, así
// que un mapa de orígenes tendría una sola entrada idéntica a su default.
const BACK = {
  href: "/wms/embroidery",
  label: "Volver a Órdenes de Bordado",
};

/**
 * Las otras OB activas del mismo pedido.
 *
 * A diferencia del diálogo —que las lista como texto plano porque no hay a
 * dónde navegar desde un modal sin cerrarlo—, aquí CADA hermana enlaza a su
 * propia página: es la misma ruta con otro id, así que el enlace no inventa
 * ninguna navegación que la página no soporte ya.
 */
const SiblingOrders = ({ items }: { items: EmbroideryOrderSibling[] }) => (
  <ul className="space-y-1 text-xs">
    {items.map((hermana) => (
      <li key={hermana.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <Link
          href={`/wms/embroidery/${hermana.id}`}
          className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
        >
          {hermana.folio_bordado}
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

interface EmbroideryOrderDetailContentProps {
  /** Id de la orden tal cual llega del segmento de ruta (string). */
  orderId: string;
}

export function EmbroideryOrderDetailContent({
  orderId,
}: EmbroideryOrderDetailContentProps) {
  const numericId = Number(orderId);
  const { data, isLoading, isError, error } = useEmbroideryOrderDetail(numericId);
  // Mutación de edición de la ficha (estatus + máquina). El hook invalida el
  // detalle en `onSuccess`, así que el re-fetch refleja el nuevo estado; solo
  // se dispara desde los controles editables de abajo, nunca en los estados de
  // carga/error (que retornan antes de renderizarlos).
  const updateOrder = useUpdateEmbroideryOrder(numericId);

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
          message="El identificador de la orden de bordado no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de bordado"
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
          title="No se pudo cargar la orden de bordado"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a ella o falló la conexión.",
          )}
        />
      </div>
    );
  }

  // Solo para mostrar: `cantidad_contratada` puede ser 0 (pedido sin líneas de
  // bordado vivas) y dividir daría "∞%".
  const porcentaje =
    data.cantidad_contratada > 0
      ? Math.round((data.cantidad_cubierta / data.cantidad_contratada) * 100)
      : null;

  // Estatus terminal: la ficha entera pasa a solo lectura y no se registran
  // avances. Se DERIVA de `getAvailableTransitions` —"no hay a dónde moverse"—
  // en vez de codificar `=== 5 || === 7` a mano: `EmbroideryStatusSelect` ya
  // decide así su degradación a badge, y tener las dos reglas por separado las
  // dejaba discrepar (añadir un estatus terminal nuevo, o recibir un código
  // fuera de 1-7, bloqueaba el selector y dejaba editable todo lo demás).
  const isTerminal = getAvailableTransitions(data.estatus_bordado).length === 0;

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
                {data.folio_bordado || `Orden #${data.id}`}
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
                backend publica la suya con PISO deliberado
                (`math.floor(cubierto + EPS_CANTIDAD)`, para no sobre-reportar
                cobertura), y `OrdenBordadoDetalle.cantidad` es un `FloatField`
                que el pipeline de picking puede dejar fraccionario. Sumar en
                crudo pintaría "9.6" aquí y "9 de 10 · 90%" en el bloque de
                cobertura de abajo: dos cifras del mismo dato en la misma
                pantalla. Se toma la del backend, que es la única que ve el
                cliente en el resto del módulo. */}
            <InfoField label="Total piezas">
              <span className="tabular-nums font-semibold">
                {formatQuantityValue(data.cantidad_cubierta)}
              </span>
            </InfoField>
            <InfoField label="Cobertura">
              <StatusBadge
                status={String(data.cobertura_completa)}
                config={EMBROIDERY_COVERAGE_CONFIG}
              />
            </InfoField>
          </div>
        </div>
      </section>

      {/* `items-start` evita el `stretch` por defecto del grid: sin él, ambas
          tarjetas se estiran a la altura de la más alta y "Origen" —que tiene
          tres campos— quedaba con un hueco vacío al fondo por culpa de
          "Información general". Cada una mide ahora según su propio contenido. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── 2. Información general ────────────────────────────────────── */}
        <Section title="Información general">
          <InfoGrid>
            <InfoField label="Pedido">
              {/* Se navega por `pedido_vinculado`, no por el par plano
                  `pedido`/`pedido_folio`: su presencia es la única señal de que
                  el pedido madre existe. Sin él queda el folio como texto.
                  `/orders/[id]` es la ruta NEUTRA del detalle 360° (solo exige
                  auth + workspace), y `?from=embroidery` hace que su "Volver"
                  regrese al listado de este módulo en vez de a Mesa de Control,
                  que un usuario solo-Producción no puede abrir. */}
              {data.pedido_vinculado ? (
                <Link
                  href={`/orders/${data.pedido_vinculado.id}?from=embroidery`}
                  className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                >
                  {data.pedido_vinculado.folio}
                </Link>
              ) : (
                <span className="font-mono">{textOrDash(data.pedido_folio)}</span>
              )}
            </InfoField>
            <InfoField label="Estatus">
              <EmbroideryStatusSelect
                currentStatus={data.estatus_bordado}
                statusDisplay={data.estatus_bordado_display}
                onStatusChange={(next) =>
                  updateOrder.mutate({ estatus_bordado: next })
                }
                isPending={updateOrder.isPending}
              />
            </InfoField>
            {/* Los tres campos editables de abajo degradan a su lectura simple
                en un estatus TERMINAL (ver `isTerminal`): una orden completada o
                cancelada ya no se toca. El selector de estatus resuelve su
                propio caso —se queda sin transiciones y se pinta como badge—,
                así que no necesita el mismo ternario. */}
            <InfoField label="Prioridad">
              {isTerminal ? (
                <StatusBadge
                  status={String(data.prioridad)}
                  config={EMBROIDERY_PRIORITY_CONFIG}
                  defaultConfig={embroideryPriorityFallback(data.prioridad)}
                />
              ) : (
                <EmbroideryPrioritySelect
                  prioridad={data.prioridad}
                  onPriorityChange={(next) => updateOrder.mutate({ prioridad: next })}
                  isPending={updateOrder.isPending}
                />
              )}
            </InfoField>
            <InfoField label="Máquina asignada">
              {isTerminal ? (
                textOrDash(data.maquina_asignada)
              ) : (
                <EmbroideryMachineField
                  value={data.maquina_asignada}
                  onSave={(maquina) =>
                    updateOrder.mutate({ maquina_asignada: maquina })
                  }
                  isPending={updateOrder.isPending}
                />
              )}
            </InfoField>
            {/* `col-span-2` (no `md:col-span-3`): con los otros cuatro campos
                la rejilla cierra exacta —3 + (1 + 2)— y desaparece la celda
                vacía que quedaba al final de la segunda fila. */}
            <InfoField label="Observaciones" className="col-span-2">
              {isTerminal ? (
                textOrDash(data.observaciones)
              ) : (
                <EmbroideryObservationsField
                  value={data.observaciones}
                  onSave={(observaciones) =>
                    updateOrder.mutate({ observaciones })
                  }
                  isPending={updateOrder.isPending}
                />
              )}
            </InfoField>
          </InfoGrid>
        </Section>

        {/* ── 3. Origen ─────────────────────────────────────────────────── */}
        {/* Empresa / sucursal / usuario con el NOMBRE ya resuelto que el
            backend devuelve (`*_nombre`, vía `source=` + `select_related`); los
            ids crudos no se pintan porque no le dicen nada al usuario.
            Empresa y sucursal son `read_only` en el serializer y no se editan
            nunca; el operador sí, salvo en un estatus terminal. */}
        <Section title="Origen">
          <InfoGrid>
            <InfoField label="Empresa">{textOrDash(data.empresa_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
            <InfoField label="Operador asignado">
              {isTerminal ? (
                textOrDash(data.usuario_nombre)
              ) : (
                <EmbroideryOperatorSelect
                  usuarioNombre={data.usuario_nombre}
                  onOperatorChange={(usuarioId) =>
                    updateOrder.mutate({ usuario_asignado: usuarioId })
                  }
                  isPending={updateOrder.isPending}
                />
              )}
            </InfoField>
          </InfoGrid>

          {/* ── Cobertura del pedido ─────────────────────────────────────
              Vive DENTRO de "Origen" —y no en una sección propia— porque habla
              del mismo eje: de dónde viene la orden y cuánto del pedido madre
              cubre. Se separa con un filete y su propio subtítulo, igual que el
              bloque de órdenes hermanas que cierra el bloque. */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <SectionTitle>Cobertura del pedido</SectionTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
              <StatusBadge
                status={String(data.cobertura_completa)}
                config={EMBROIDERY_COVERAGE_CONFIG}
              />
              <span className="tabular-nums text-slate-700 dark:text-slate-200">
                <span className="font-semibold">
                  {formatQuantityValue(data.cantidad_cubierta)}
                </span>{" "}
                de {formatQuantityValue(data.cantidad_contratada)} piezas contratadas
                por el pedido
                {porcentaje !== null && ` · ${porcentaje}%`}
              </span>
              {!data.cobertura_completa && (
                <span className="text-slate-500 dark:text-slate-400">
                  El resto puede programarse en otras órdenes de bordado.
                </span>
              )}
            </div>

            {/* Reparto aproximado — solo cuando el backend lo marca. Hoy es
                `false` en toda la base, así que este aviso normalmente no
                aparece; sin el gate sería un estado vacío permanente. */}
            {data.reparto_por_talla_aproximado && (
              <div
                role="note"
                className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
              >
                <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
                  El pedido tiene piezas programadas sin talla identificable. El total
                  por producto es exacto, pero el reparto <strong>por talla</strong> del
                  resumen de avance es aproximado.
                </p>
              </div>
            )}

            {/* Otras OB del mismo pedido — solo si las hay. */}
            {data.otras_ordenes_del_pedido.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
                <SectionTitle>
                  Otras órdenes de este pedido ({data.otras_ordenes_del_pedido.length})
                </SectionTitle>
                <SiblingOrders items={data.otras_ordenes_del_pedido} />
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ── 4. Resumen de avance ────────────────────────────────────────── */}
      <EmbroideryProgressSummary
        resumenAvance={data.resumen_avance}
        detalles={data.detalles}
      />


      {/* ── 5. Historial de avances ─────────────────────────────────────── */}
      <EmbroideryAvancesHistory
        avances={data.avances}
        obId={data.id}
        isTerminal={isTerminal}
        detalles={data.detalles}
        porDetalle={data.resumen_avance.por_detalle}
      />
    </div>
  );
}

"use client";

import { BACK_ARROW_CLASS, BACK_BUTTON_CLASS } from "@/src/components/backButtonClass";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, InfoIcon, LayersIcon, RulerIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { WorkOrderCoverageSheet, WorkOrderTopBar } from "@/src/components/WorkOrderSheets";
import { SheetPanel, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { InlineObservationsField } from "@/src/components/InlineObservationsField";
import { WorkOrderStatusSelect } from "@/src/components/WorkOrderStatusSelect";
import { WorkOrderPrioritySelect } from "@/src/components/WorkOrderPrioritySelect";
import { isWorkOrderTerminal } from "@/src/utils/workOrderStatusEdit";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { canEditWorkOrder } from "@/src/utils/workOrderEditAccess";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  REFLECTIVE_ORDER_COVERAGE_CONFIG,
  REFLECTIVE_ORDER_PRIORITY_CONFIG,
  reflectiveOrderPriorityFallback,
  reflectiveStatusEntry,
} from "../constants/reflectiveOrderStatus";
import {
  reflectiveOrderDetailQueryKey,
  useReflectiveOrderDetail,
} from "../hooks/useReflectiveOrderDetail";
import { WorkOrderGarmentGroups } from "@/src/components/WorkOrderGarmentGroups";
import { WorkOrderAvancesSection } from "@/src/features/work-order-avances/components/WorkOrderAvancesSection";
import { useUpdateReflectiveOrder } from "../hooks/useUpdateReflectiveOrder";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import { ReflectiveOrderPdfButton } from "./ReflectiveOrderPdfButton";
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
// porque esta ruta NO es neutra: cuelga de `/manufacturing` y exige su código
// de sección, `R-PRODUCCION-OR` (el `R-PRODUCCION` del módulo no basta). Se llega desde
// su listado y desde la búsqueda global, y el backend solo manda el grupo de
// la búsqueda a quien tiene ese mismo `R-PRODUCCION-OR`: todo el que llega aquí puede
// abrir el listado, así que un mapa de orígenes no añadiría nada.
const BACK = {
  href: "/manufacturing/reflective-orders",
  label: "Volver a Órdenes de Reflejante",
};

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

// ── Prendas de la orden ──────────────────────────────────────────────────────

const REFLECTIVE_AVANCE_CONFIG = {
  endpoint: "/produccion/reflejante-avances/",
  orderField: "orden_r",
  verbo: "reflejadas",
  listQueryKey: ["reflective-orders"],
};

/**
 * Prendas agrupadas por prenda + color. Las cuatro cantidades (En esta orden,
 * Programado, Pedido, Pendiente) y las columnas propias del reflejante se
 * conservan en el desglose por talla. `tipo_reflejante` y `posicion` describen
 * solo el PRIMER reflejante del renglón; el arreglo completo vive en el popover.
 */
const ReflectiveGarments = ({ items }: { items: ReflectiveOrderDetailLine[] }) => (
  <WorkOrderGarmentGroups
    items={items}
    toLine={(linea) => ({
      id: linea.id,
      productoId: linea.producto,
      producto: linea.producto_nombre ?? `Producto #${linea.producto}`,
      color: linea.color_nombre ?? null,
      talla: linea.talla_nombre,
      cantidad: linea.cantidad,
      sku: linea.sku,
      programado: linea.cantidad_asignada,
      pedido: linea.cantidad_pedido,
      pendiente: linea.cantidad_pendiente,
    })}
    columns={[
      {
        key: "reflejante",
        label: "Reflejante",
        render: (linea) => {
          const configs = resolveReflectiveLineConfigs(linea);
          if (configs.length === 0) return "—";
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              <ReflectiveLineConfigPopover
                configs={configs}
                productoNombre={linea.producto_nombre ?? `Producto #${linea.producto}`}
                tallaNombre={linea.talla_nombre}
                colorNombre={linea.color_nombre ?? null}
              />
              <ReflectiveConfigCountBadge configs={configs} />
            </span>
          );
        },
      },
      { key: "tipo", label: "Tipo", render: (linea) => textOrDash(linea.tipo_reflejante) },
      { key: "posicion", label: "Posición", render: (linea) => textOrDash(linea.posicion) },
      { key: "metros", label: "Metros", align: "right", render: (linea) => metrosOrDash(linea.metros) },
    ]}
  />
);

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
  // Edición de la ficha (estatus, prioridad, observaciones). El hook re-consulta
  // el detalle al terminar; solo la disparan los controles de abajo, que no se
  // pintan en los estados de carga/error.
  const updateOrder = useUpdateReflectiveOrder(numericId);

  // Superusuario, admin de empresa o el código de esta ruta, `R-PRODUCCION-OR`
  // (`canEditWorkOrder`): una aproximación del backend, que autoriza por
  // departamento PRODUCCION y rechaza al resto con un `400`. Es UX: evita
  // ofrecer controles que van a fallar, no es la frontera de acceso.
  // Antes de los `return` tempranos porque `useSession` es un hook.
  const { data: session } = useSession();
  const canEdit = canEditWorkOrder(session?.user, "R-PRODUCCION-OR");

  const BackLink = (
    <Link
      href={BACK.href}
      className={BACK_BUTTON_CLASS}
    >
      <ArrowLeftIcon className={BACK_ARROW_CLASS} />
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

  // Cancelada (`7`): el backend responde `400` a cualquier `PATCH`, así que la
  // ficha entera pasa a solo lectura. Se suma la falta de permiso en una sola
  // bandera para que ningún control quede editable por olvidar una condición.
  const isTerminal = isWorkOrderTerminal(data.estatus_reflejante);
  const isReadOnly = isTerminal || !canEdit;

  return (
    <div className="w-full space-y-6">
      <WorkOrderTopBar
        backLink={BackLink}
        readOnlyLabel={isTerminal ? "Orden cancelada · solo lectura" : null}
        actions={<ReflectiveOrderPdfButton order={data} />}
      />

      {/* ── 1. La orden ─────────────────────────────────────────────────── */}
      <SheetSection
        icon={<RulerIcon className="w-5 h-5" />}
        title="Orden de Reflejante"
        subtitle="Datos de la orden, su origen y quién la trabaja."
        badges={
          <StatusBadge
            status={String(data.cobertura_completa)}
            config={REFLECTIVE_ORDER_COVERAGE_CONFIG}
          />
        }
      >
        <div className="flex flex-col xl:flex-row gap-6">
          <SheetPanel title="Orden" className="shrink-0 w-full xl:w-80">
            {/* El folio es el único <h1> de la página. */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6 break-all">
              {data.folio_reflejante || `Orden #${data.id}`}
            </h1>
            <div className="space-y-4 text-xs">
              <InfoField label="Estatus">
                <WorkOrderStatusSelect
                  currentStatus={data.estatus_reflejante}
                  statusDisplay={data.estatus_reflejante_display}
                  statusEntry={reflectiveStatusEntry}
                  onStatusChange={(next) => updateOrder.mutate({ estatus_reflejante: next })}
                  isPending={updateOrder.isPending}
                  readOnly={!canEdit}
                />
              </InfoField>
              <InfoField label="Prioridad">
                <WorkOrderPrioritySelect
                  value={data.prioridad}
                  config={REFLECTIVE_ORDER_PRIORITY_CONFIG}
                  fallback={reflectiveOrderPriorityFallback}
                  onChange={(prioridad) => updateOrder.mutate({ prioridad })}
                  isPending={updateOrder.isPending}
                  readOnly={isReadOnly}
                />
              </InfoField>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Alta">
                  <span className="tabular-nums">
                    {formatShortDate(data.fecha_inicio)} · {formatShortTime(data.fecha_inicio)}
                  </span>
                </InfoField>
                {/* `fecha_fin` la sella el backend al completar; `null` → guion. */}
                <InfoField label="Fin">
                  <span className="tabular-nums">
                    {formatShortDate(data.fecha_fin)} · {formatShortTime(data.fecha_fin)}
                  </span>
                </InfoField>
              </div>
            </div>
          </SheetPanel>

          <SheetPanel title="Origen y seguimiento" className="flex-1 self-start w-full">
            <InfoGrid>
              <InfoField label="Pedido">
                <PedidoVinculadoFolio
                  pedidoVinculado={data.pedido_vinculado}
                  pedidoFolio={data.pedido_folio}
                  from="reflective"
                />
              </InfoField>
              <InfoField label="Operador asignado">{textOrDash(data.usuario_nombre)}</InfoField>
              <InfoField label="Total piezas">
                <span className="tabular-nums font-semibold">{formatQuantityValue(data.cantidad_cubierta)}</span>
              </InfoField>
              <InfoField label="Empresa">{textOrDash(data.empresa_nombre)}</InfoField>
              <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
              <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
                {isReadOnly ? (
                  textOrDash(data.observaciones)
                ) : (
                  <InlineObservationsField
                    value={data.observaciones}
                    onSave={(observaciones) => updateOrder.mutateAsync({ observaciones })}
                    isPending={updateOrder.isPending}
                  />
                )}
              </InfoField>
            </InfoGrid>
          </SheetPanel>
        </div>
      </SheetSection>

      {/* ── 2. Cobertura del pedido ─────────────────────────────────────── */}
      <WorkOrderCoverageSheet
        cubierta={data.cantidad_cubierta}
        contratada={data.cantidad_contratada}
        completa={data.cobertura_completa}
        coverageConfig={REFLECTIVE_ORDER_COVERAGE_CONFIG}
        servicio="reflejante"
        siblingsCount={data.otras_ordenes_del_pedido.length}
        siblings={<SiblingOrders items={data.otras_ordenes_del_pedido} />}
        notice={
          // Reparto aproximado — solo cuando el backend lo marca.
          data.reparto_por_talla_aproximado ? (
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
          ) : undefined
        }
      />

      {/* ── 3. Prendas de la orden ─────────────────────────────────────── */}
      <SheetSection
        icon={<LayersIcon className="w-5 h-5" />}
        title="Prendas de la orden"
        subtitle="Toca una prenda para ver sus tallas. Solo se listan las de esta orden."
      >
        <ReflectiveGarments items={data.detalles} />
      </SheetSection>

      {/* ── 6. Avance ──────────────────────────────────────────────────── */}
      <WorkOrderAvancesSection
        config={REFLECTIVE_AVANCE_CONFIG}
        orderId={data.id}
        detailQueryKey={reflectiveOrderDetailQueryKey(data.id)}
        piezasOrden={data.cantidad_cubierta}
        canEdit={canEdit}
        isTerminal={isTerminal}
        avances={data.avances}
        resumen_avance={data.resumen_avance}
      />
    </div>
  );
}

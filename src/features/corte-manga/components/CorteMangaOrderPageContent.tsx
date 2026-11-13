"use client";

import { BACK_ARROW_CLASS, BACK_BUTTON_CLASS } from "@/src/components/backButtonClass";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, LayersIcon, SliceIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
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
  CORTE_MANGA_ORDER_COVERAGE_CONFIG,
  CORTE_MANGA_ORDER_PRIORITY_CONFIG,
  corteMangaOrderPriorityFallback,
  corteMangaStatusEntry,
} from "../constants/corteMangaOrderStatus";
import {
  corteMangaOrderDetailQueryKey,
  useCorteMangaOrderDetail,
} from "../hooks/useCorteMangaOrderDetail";
import { WorkOrderGarmentGroups } from "@/src/components/WorkOrderGarmentGroups";
import { WorkOrderAvancesSection } from "@/src/features/work-order-avances/components/WorkOrderAvancesSection";
import { useUpdateCorteMangaOrder } from "../hooks/useUpdateCorteMangaOrder";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import type {
  CorteMangaOrderLine,
  CorteMangaOrderSibling,
} from "../interfaces/corte-manga-order.interface";
import { StatusBadge } from "@/src/components/StatusBadge";
import { corteMangaPiezasOrden, corteMangaTotalPiezas } from "../utils/corteMangaPiezas";
import { CorteMangaOrderPdfButton } from "./CorteMangaOrderPdfButton";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing` y exige su código
// de sección, `R-PRODUCCION-CM` (el `R-PRODUCCION` del módulo no basta). Se llega desde
// su listado y desde la búsqueda global, y el backend solo manda el grupo de
// la búsqueda a quien tiene ese mismo `R-PRODUCCION-CM`: todo el que llega aquí puede
// abrir el listado, así que un mapa de orígenes no añadiría nada.
const BACK = {
  href: "/manufacturing/corte-manga",
  label: "Volver a Órdenes de Corte de Manga",
};

// ── Prendas de la orden ──────────────────────────────────────────────────────

const CORTE_MANGA_AVANCE_CONFIG = {
  endpoint: "/produccion/corte-manga-avances/",
  orderField: "ocm",
  verbo: "cortadas",
  listQueryKey: ["corte-manga-orders"],
};

/**
 * Prendas agrupadas por prenda + color. Programado / Pedido / Pendiente y SKU
 * aparecen solos en cuanto el backend los mande (hoy la OCM no los expone).
 */
const CorteMangaGarments = ({ items }: { items: CorteMangaOrderLine[] }) => (
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
  />
);

/** Las otras OCM activas del mismo pedido, cada una enlazada a su página. */
const SiblingOrders = ({ items }: { items: CorteMangaOrderSibling[] }) => (
  <ul className="space-y-1 text-xs">
    {items.map((hermana) => (
      <li key={hermana.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <Link
          href={`/manufacturing/corte-manga/${hermana.id}`}
          className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
        >
          {hermana.folio_ocm || `Orden #${hermana.id}`}
        </Link>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {formatShortDate(hermana.fecha_inicio)} · {formatShortTime(hermana.fecha_inicio)}
        </span>
      </li>
    ))}
  </ul>
);

// ── Componente principal ─────────────────────────────────────────────────────

interface CorteMangaOrderPageContentProps {
  /** Id de la orden tal cual llega del segmento de ruta (string). */
  orderId: string;
}

/**
 * Cuerpo de la PÁGINA de detalle de una orden de corte de manga.
 *
 * NO confundir con `CorteMangaOrderDetailContent`, que es el cuerpo del DIÁLOGO
 * (exportado desde `CorteMangaOrderDetailDialog.tsx` y compartido con el
 * envoltorio por id): aquel recibe la orden ya resuelta y vive dentro de un
 * `MainDialog`; este trae su propio detalle por id y se pinta a página completa,
 * con secciones y su propio "Volver". Ambos coexisten sin tocarse.
 *
 * Misma estructura que bordado y reflejante: el detalle de OCM trae la
 * cobertura sobre el pedido y las órdenes hermanas, y la sección de cobertura
 * solo se pinta si la respuesta las trae. No expone el aviso de reparto por
 * talla aproximado.
 */
export function CorteMangaOrderPageContent({
  orderId,
}: CorteMangaOrderPageContentProps) {
  const numericId = Number(orderId);
  const { data, isLoading, isError, error } = useCorteMangaOrderDetail(numericId);
  // Edición de la ficha (estatus, prioridad, observaciones). El hook re-consulta
  // el detalle al terminar; solo la disparan los controles de abajo, que no se
  // pintan en los estados de carga/error.
  const updateOrder = useUpdateCorteMangaOrder(numericId);

  // Superusuario, admin de empresa o el código de esta ruta, `R-PRODUCCION-CM`
  // (`canEditWorkOrder`): una aproximación del backend, que autoriza por
  // departamento PRODUCCION y rechaza al resto con un `400`. Es UX: evita
  // ofrecer controles que van a fallar, no es la frontera de acceso.
  // Antes de los `return` tempranos porque `useSession` es un hook.
  const { data: session } = useSession();
  const canEdit = canEditWorkOrder(session?.user, "R-PRODUCCION-CM");

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
          message="El identificador de la orden de corte de manga no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de corte de manga"
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
          title="No se pudo cargar la orden de corte de manga"
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
  const isTerminal = isWorkOrderTerminal(data.estatus_corte);
  const isReadOnly = isTerminal || !canEdit;

  return (
    <div className="w-full space-y-6">
      <WorkOrderTopBar
        backLink={BackLink}
        readOnlyLabel={isTerminal ? "Orden cancelada · solo lectura" : null}
        actions={<CorteMangaOrderPdfButton order={data} />}
      />

      {/* ── 1. La orden ─────────────────────────────────────────────────── */}
      <SheetSection
        icon={<SliceIcon className="w-5 h-5" />}
        title="Orden de Corte de Manga"
        subtitle="Datos de la orden, su origen y quién la trabaja."
        badges={
          data.cobertura_completa !== undefined ? (
            <StatusBadge
              status={String(data.cobertura_completa)}
              config={CORTE_MANGA_ORDER_COVERAGE_CONFIG}
            />
          ) : undefined
        }
      >
        <div className="flex flex-col xl:flex-row gap-6">
          <SheetPanel title="Orden" className="shrink-0 w-full xl:w-80">
            {/* El folio es el único <h1> de la página. */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6 break-all">
              {data.folio_ocm || `Orden #${data.id}`}
            </h1>
            <div className="space-y-4 text-xs">
              <InfoField label="Estatus">
                <WorkOrderStatusSelect
                  currentStatus={data.estatus_corte}
                  statusDisplay={data.estatus_corte_display}
                  statusEntry={corteMangaStatusEntry}
                  onStatusChange={(next) => updateOrder.mutate({ estatus_corte: next })}
                  isPending={updateOrder.isPending}
                  readOnly={!canEdit}
                />
              </InfoField>
              <InfoField label="Prioridad">
                <WorkOrderPrioritySelect
                  value={data.prioridad}
                  config={CORTE_MANGA_ORDER_PRIORITY_CONFIG}
                  fallback={corteMangaOrderPriorityFallback}
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
                  from="corte-manga"
                />
              </InfoField>
              <InfoField label="Operador asignado">{textOrDash(data.usuario_nombre)}</InfoField>
              <InfoField label="Total piezas">
                <span className="tabular-nums font-semibold">{formatQuantityValue(corteMangaTotalPiezas(data))}</span>
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

      {/* ── 2. Cobertura del pedido (solo si el backend la manda) ──────── */}
      {data.cantidad_contratada !== undefined && data.cantidad_cubierta !== undefined && (
        <WorkOrderCoverageSheet
          cubierta={data.cantidad_cubierta}
          contratada={data.cantidad_contratada}
          completa={Boolean(data.cobertura_completa)}
          coverageConfig={CORTE_MANGA_ORDER_COVERAGE_CONFIG}
          servicio="corte de manga"
          siblingsCount={data.otras_ordenes_del_pedido?.length ?? 0}
          siblings={<SiblingOrders items={data.otras_ordenes_del_pedido ?? []} />}
        />
      )}

      {/* ── 3. Prendas de la orden ─────────────────────────────────────── */}
      <SheetSection
        icon={<LayersIcon className="w-5 h-5" />}
        title="Prendas de la orden"
        subtitle="Toca una prenda para ver sus tallas. Solo se listan las de esta orden."
      >
        <CorteMangaGarments items={data.detalles} />
      </SheetSection>

      {/* ── 5. Avance ──────────────────────────────────────────────────── */}
      <WorkOrderAvancesSection
        config={CORTE_MANGA_AVANCE_CONFIG}
        orderId={data.id}
        detailQueryKey={corteMangaOrderDetailQueryKey(data.id)}
        piezasOrden={corteMangaPiezasOrden(data)}
        canEdit={canEdit}
        isTerminal={isTerminal}
        avances={data.avances}
        resumen_avance={data.resumen_avance}
      />
    </div>
  );
}

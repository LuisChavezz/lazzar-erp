"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ProduccionIcon, ProductIcon, RouteIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { SI_NO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { EmptyLines, InfoField, InfoGrid, textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  OrderChip,
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import {
  formatExactQuantityValue,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import {
  isClosedProductionOrderStatus,
  PRODUCTION_ORDER_PRIORITY_CONFIG,
  productionOrderPriorityFallback,
  productionOrderStatusEntry,
} from "../constants/productionOrderStatus";
import { useProductionOrderOnboarding } from "../hooks/useProductionOrderOnboarding";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import type { ProductionOrderOnboardingProducto } from "../interfaces/production-order.interface";
import { ProductionOrderCriticalPathDialog } from "@/src/features/production-order-critical-path/components/ProductionOrderCriticalPathDialog";
import type { CriticalPathTarget } from "@/src/features/production-order-critical-path/interfaces/production-order-critical-path.interface";
import { ProductionOrderConsumptionSection } from "@/src/features/production-order-consumption/components/ProductionOrderConsumptionSection";
import { RecalculateConsumptionDialog } from "@/src/features/production-order-consumption/components/RecalculateConsumptionDialog";
import { summarizeConsumption } from "@/src/features/production-order-consumption/utils/summarizeConsumption";
import { useProductionOrderStatusFlow } from "@/src/features/production-order-status/hooks/useProductionOrderStatusFlow";
import { ProductionOrderStatusMenu } from "@/src/features/production-order-status/components/ProductionOrderStatusMenu";
import { ProductionOrderStatusDialog } from "@/src/features/production-order-status/components/ProductionOrderStatusDialog";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing/production-orders`,
// exige `R-PRODUCCION-OP` (no el `R-PRODUCCION` del módulo, ver
// `routePermissions`) y hoy solo se alcanza desde el propio módulo, así que un
// mapa de orígenes tendría una sola entrada idéntica a su default.
const BACK = {
  href: "/manufacturing/production-orders",
  label: "Volver a Órdenes de Producción",
};

// ── Cabecera ──────────────────────────────────────────────────────────────────

/**
 * Fecha corta de un timestamp, con la fecha + hora completas en el `title`
 * nativo (`formatShortDateTime`, sin `timeZone`: la misma combinación que la
 * cabecera pintaba antes, así que la hora del tooltip es la que se veía). Vacío
 * o no parseable: un solo "—" y sin `title`.
 */
const DateWithTimeTitle = ({ value }: { value: string | null }) => {
  const date = formatShortDate(value);
  if (date === "—") return <span>—</span>;
  return <span title={formatShortDateTime(value)}>{date}</span>;
};

// ── Productos ─────────────────────────────────────────────────────────────────

/**
 * Tabla de cantidades por talla/color de un producto de la orden.
 *
 * Página propia y NO `LineItemsTable` (el chrome que usa el diálogo, acotado a
 * `max-h-56` con scroll interno): aquí los renglones se leen de corrido, mismo
 * criterio que las tablas de artículos de OB/OR/OCM.
 */
const TallasTable = ({
  tallas,
}: {
  tallas: ProductionOrderOnboardingProducto["cantidades"]["tallas"];
}) => {
  if (tallas.length === 0) {
    return <EmptyLines>Sin desglose por talla.</EmptyLines>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-semibold">Talla</th>
            <th className="px-3 py-2 text-left font-semibold">Color</th>
            <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {tallas.map((item, index) => (
            <tr
              key={index}
              className="border-t border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.talla}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.color}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {formatQuantityValue(item.cantidad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Tabla de materiales (habilitación) necesarios para un producto. */
const HabilitacionTable = ({
  habilitacion,
}: {
  habilitacion: ProductionOrderOnboardingProducto["habilitacion"];
}) => {
  if (habilitacion.length === 0) {
    return <EmptyLines>Este producto no tiene materiales registrados.</EmptyLines>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-semibold">Código</th>
            <th className="px-3 py-2 text-left font-semibold">Descripción</th>
            <th className="px-3 py-2 text-left font-semibold">Unidad</th>
            <th className="px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {habilitacion.map((item, index) => (
            <tr
              key={index}
              className="border-t border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {item.codigo}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {item.descripcion}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {item.unidad}
              </td>
              {/* `formatExactQuantityValue` (4 decimales) y NO
                  `formatQuantityValue` (2): el backend redondea este total con
                  `round(raw_qty, 4)`, la resolución con que el inventario mueve
                  materiales. Truncar a 2 impediría cuadrar el consumo contra el
                  movimiento de inventario. Las cantidades de PRENDAS de arriba
                  sí van a 2 decimales, porque el backend las redondea así. */}
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                {formatExactQuantityValue(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Un producto de la orden como panel gris de la hoja (mismo lenguaje que el
 * detalle del pedido): nombre y total arriba; debajo, cantidades por talla y
 * habilitación lado a lado en pantallas anchas.
 */
const ProductoCard = ({ producto }: { producto: ProductionOrderOnboardingProducto }) => (
  <SheetPanel className="p-5!">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{producto.nombre}</h3>
      <OrderChip>
        <span className="tabular-nums font-semibold text-slate-800 dark:text-white mr-1">
          {formatQuantityValue(producto.cantidades.total)}
        </span>
        piezas
      </OrderChip>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="space-y-2 xl:col-span-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Cantidades por talla
        </h4>
        <TallasTable tallas={producto.cantidades.tallas} />
      </div>
      <div className="space-y-2 xl:col-span-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Habilitación
        </h4>
        <HabilitacionTable habilitacion={producto.habilitacion} />
      </div>
    </div>
  </SheetPanel>
);

// ── Componente principal ─────────────────────────────────────────────────────

interface ProductionOrderPageContentProps {
  /** Id de la orden tal cual llega del segmento de ruta (string). */
  orderId: string;
}

export function ProductionOrderPageContent({
  orderId,
}: ProductionOrderPageContentProps) {
  const numericId = Number(orderId);
  // `useProductionOrderOnboarding` toma `number` NO nullable (`0` = consulta
  // apagada, `enabled: op_id > 0`), a diferencia de bordado/reflejante/corte de
  // manga que aceptan `number | null`. Un `numericId` inválido (`NaN` o `<= 0`)
  // ya deja la consulta apagada por su propio `enabled`; el guard de abajo solo
  // decide qué SE PINTA en ese caso, no si se dispara la petición.
  const { data, isLoading, isError, error } = useProductionOrderOnboarding(numericId);
  // El diálogo de ruta crítica se MONTA solo al abrirlo (pintar esta página no
  // la pide). Se guarda la FOTO (id, folio y estatus) de la apertura, igual que
  // el listado: un refetch de la OP con el diálogo abierto no debe cambiarle el
  // modo de solo lectura a media captura.
  const [criticalPathTarget, setCriticalPathTarget] = useState<CriticalPathTarget | null>(null);
  // Diálogo de recálculo de consumos: su apertura es de la página, no de la
  // sección. Se monta siempre (controlado) para conservar su contenido durante
  // la animación de salida; los productos los copia él mismo al abrir.
  const [isRecalculateOpen, setIsRecalculateOpen] = useState(false);
  // Cambio de estatus: el GET `estatus/` sale al cargar la página y el diálogo
  // abierto es estado de AQUÍ (no del menú), por la misma razón que el de
  // recálculo. Un 404, una OP terminal o un GET fallido solo dejan el menú sin
  // opciones (oculto); nunca cambian lo que pinta la página.
  const statusFlow = useProductionOrderStatusFlow(numericId);

  const openCriticalPath = () => {
    if (!data) return;
    setCriticalPathTarget({
      opId: data.op_id,
      folio: data.folio_op,
      estatusOp: data.estatus_op,
    });
  };

  // Consumo por producto: lo comparten la sección y el selector del diálogo.
  // Un refetch fallido de v5 conserva `data`, así que sigue disponible aunque
  // la página muestre su estado de error.
  const consumptionProducts = data ? summarizeConsumption(data.consumos) : [];

  // El diálogo de recálculo va FUERA de las ramas de carga/error/éxito, en la
  // misma posición en todas (segundo hijo del fragmento de `withPageDialogs`):
  // el recálculo invalida el detalle, y si ese refetch falla
  // (`useProductionOrderOnboarding` expone el `isError` crudo) la página pasa a
  // su estado de error. Montado dentro de la rama de éxito, eso lo desmontaba y
  // se perdía la vista de resultado de una operación que ya movió inventario.
  const withPageDialogs = (body: ReactNode) => (
    <>
      {body}
      <RecalculateConsumptionDialog
        open={isRecalculateOpen}
        onOpenChange={setIsRecalculateOpen}
        opId={numericId}
        folio={data?.folio_op ?? ""}
        products={consumptionProducts}
      />
      <ProductionOrderStatusDialog
        flow={statusFlow}
        folio={data?.folio_op || statusFlow.folio}
        // El diálogo de ruta crítica solo se monta en la rama de éxito: con el
        // detalle sin cargar o en error, "Abrir ruta crítica" no se ofrece en
        // vez de no hacer nada.
        onOpenCriticalPath={data && !isError ? openCriticalPath : undefined}
      />
    </>
  );

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
  // `Number.isInteger` y no solo `!Number.isNaN`: el id sale de un segmento de
  // URL editable, así que "1.5" (→ 1.5, que no es NaN ni <= 0) llegaría al
  // backend, Django lo coaccionaría al pk 1 y la página mostraría la orden 1
  // bajo una URL que dice otra cosa. "1e999" (→ Infinity) haría lo propio.
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return withPageDialogs(
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Orden no válida"
          message="El identificador de la orden de producción no es válido."
        />
      </div>,
    );
  }

  if (isLoading) {
    return withPageDialogs(
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de producción"
          message="Obteniendo el detalle de la orden..."
        />
      </div>,
    );
  }

  if (isError || !data) {
    return withPageDialogs(
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        {/* El copy NO afirma "no tienes acceso", a diferencia de las páginas de
            OB/OR/OCM: el endpoint que alimenta esta página
            (`onboarding?op_id=`) acota por empresa pero NO por sucursal
            (nucleo-erp#538), así que el 404 solo significa "no existe en tu
            empresa". Prometer un control por sucursal que el backend no aplica
            sería afirmar algo falso. */}
        <ErrorState
          title="No se pudo cargar la orden de producción"
          message={extractErrorMessage(
            error,
            "La orden no existe o falló la conexión.",
          )}
        />
      </div>,
    );
  }

  const totalPiezas = data.productos.reduce(
    (sum, producto) => sum + (Number(producto.cantidades.total) || 0),
    0,
  );

  // Mismo lenguaje visual que el detalle del pedido ("hoja impresa"): barra
  // fija con "Volver" y las acciones, y secciones blancas con paneles grises.
  return withPageDialogs(
    <div className="w-full space-y-6">
      {/* ── Barra superior fija: Volver + acciones ──────────────────────── */}
      <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 dark:border-white/5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-sm dark:shadow-none px-6 md:px-8 py-3">
        {BackLink}
        <div className="flex flex-wrap items-center gap-2">
          <ProductionOrderStatusMenu
            options={statusFlow.options}
            isPending={statusFlow.isPending}
            onSelect={statusFlow.select}
          />
          <Button variant="secondary" onClick={openCriticalPath}>
            <RouteIcon className="w-4 h-4" aria-hidden="true" />
            Ruta crítica
          </Button>
        </div>
      </div>

      {/* ── 1. La orden ─────────────────────────────────────────────────── */}
      <SheetSection
        icon={<ProduccionIcon className="w-5 h-5" />}
        title="Orden de Producción"
        subtitle="Datos de la orden, su origen y su seguimiento."
        badges={
          <>
            <StatusBadge
              status={String(data.estatus_op)}
              config={{ [data.estatus_op]: productionOrderStatusEntry(data.estatus_op, data.estatus_op_display) }}
            />
            <StatusBadge
              status={String(data.prioridad)}
              config={PRODUCTION_ORDER_PRIORITY_CONFIG}
              defaultConfig={productionOrderPriorityFallback(data.prioridad)}
            />
            {/* `activo` es la baja lógica: sin él, una orden dada de baja se
                leería idéntica a una vigente. */}
            {!data.activo && <OrderChip>Inactiva</OrderChip>}
          </>
        }
      >
        <div className="flex flex-col xl:flex-row gap-6">
          <SheetPanel title="Orden" className="shrink-0 w-full xl:w-80">
            {/* El folio es el único <h1> de la página. */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-6 break-all">
              {data.folio_op || `Orden #${data.op_id}`}
            </h1>
            <div className="space-y-4 text-xs">
              <InfoField label="Alta">
                <DateWithTimeTitle value={data.fecha_inicio} />
              </InfoField>
              <InfoField label="Fin">
                <DateWithTimeTitle value={data.fecha_fin} />
              </InfoField>
              <InfoField label="Cierre solicitado">
                <StatusBadge status={String(data.cerrar_orden)} config={SI_NO_CFG} />
              </InfoField>
              <InfoField label="Activa">
                <StatusBadge status={String(data.activo)} config={SI_NO_CFG} />
              </InfoField>
            </div>
          </SheetPanel>

          <SheetPanel title="Origen y seguimiento" className="flex-1 self-start w-full">
            <InfoGrid>
              <InfoField label="Pedido">
                {/* El pedido es OPCIONAL en el alta: el guion es un estado normal. */}
                <PedidoVinculadoFolio
                  pedidoVinculado={data.pedido_vinculado}
                  pedidoFolio={data.pedido_folio}
                  from="production-orders"
                />
              </InfoField>
              <InfoField label="Operador asignado">{textOrDash(data.usuario_nombre)}</InfoField>
              <InfoField label="Empresa">{textOrDash(data.empresa_nombre)}</InfoField>
              <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
              <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
                {textOrDash(data.observaciones)}
              </InfoField>
            </InfoGrid>
          </SheetPanel>
        </div>
      </SheetSection>

      {/* ── 2. Productos ────────────────────────────────────────────────── */}
      <SheetSection
        icon={<ProductIcon className="w-5 h-5" />}
        title="Productos"
        subtitle="Cantidades por talla y materiales de habilitación de cada producto."
        badges={
          <>
            <OrderChip>
              {data.productos.length} {data.productos.length === 1 ? "producto" : "productos"}
            </OrderChip>
            <OrderChip>
              {formatQuantityValue(totalPiezas)} {totalPiezas === 1 ? "pieza" : "piezas"}
            </OrderChip>
          </>
        }
      >
        {data.productos.length === 0 ? (
          <EmptyLines>Esta orden no tiene productos registrados.</EmptyLines>
        ) : (
          <div className="space-y-4">
            {data.productos.map((producto, index) => (
              <ProductoCard key={index} producto={producto} />
            ))}
          </div>
        )}
      </SheetSection>

      {/* ── 5. Consumos ──────────────────────────────────────────────────── */}
      <ProductionOrderConsumptionSection
        consumos={data.consumos}
        products={consumptionProducts}
        isClosed={isClosedProductionOrderStatus(data.estatus_op)}
        onRecalculate={() => setIsRecalculateOpen(true)}
      />

      {criticalPathTarget && (
        <ProductionOrderCriticalPathDialog
          target={criticalPathTarget}
          onClose={() => setCriticalPathTarget(null)}
        />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  InfoGrid,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import {
  formatExactQuantityValue,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  PRODUCTION_ORDER_PRIORITY_CONFIG,
  productionOrderPriorityFallback,
  productionOrderStatusEntry,
} from "../constants/productionOrderStatus";
import { useProductionOrderOnboarding } from "../hooks/useProductionOrderOnboarding";
import type {
  ProductionOrderConsumo,
  ProductionOrderOnboardingProducto,
} from "../interfaces/production-order.interface";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing`, exige
// `R-PRODUCCION` y hoy solo se alcanza desde el listado del propio módulo, así
// que un mapa de orígenes tendría una sola entrada idéntica a su default.
const BACK = {
  href: "/manufacturing/production-orders",
  label: "Volver a Órdenes de Producción",
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
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
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
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
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

/** Tarjeta de un producto de la orden: cantidades por talla + materiales. */
const ProductoCard = ({ producto }: { producto: ProductionOrderOnboardingProducto }) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {producto.nombre}
      </h4>
      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
        Total:{" "}
        <span className="font-semibold tabular-nums text-slate-800 dark:text-white">
          {formatQuantityValue(producto.cantidades.total)}
        </span>
      </span>
    </div>

    <div className="space-y-2">
      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Cantidades por talla
      </h5>
      <TallasTable tallas={producto.cantidades.tallas} />
    </div>

    <div className="space-y-2">
      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Habilitación
      </h5>
      <HabilitacionTable habilitacion={producto.habilitacion} />
    </div>
  </div>
);

// ── Consumos ──────────────────────────────────────────────────────────────────

/**
 * Un consumo de materiales registrado contra la orden.
 *
 * `cantidad` llega como STRING decimal del backend
 * (`DecimalField(max_digits=18, decimal_places=4)`), así que se formatea con
 * `formatExactQuantityValue` y no con `formatQuantityValue`: son 4 decimales de
 * material consumido, y truncarlos a 2 impediría cuadrar este renglón contra su
 * movimiento de inventario.
 */
const ConsumoCard = ({ consumo }: { consumo: ProductionOrderConsumo }) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
      Consumo #{consumo.consumo_produccion_id}
    </h4>
    {consumo.detalles.length === 0 ? (
      <EmptyLines>Este consumo no tiene renglones registrados.</EmptyLines>
    ) : (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 dark:bg-white/5">
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="px-3 py-2 text-left font-semibold">Producto</th>
              <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {consumo.detalles.map((detalle, index) => (
              <tr
                key={index}
                className="border-t border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {textOrDash(detalle.producto_nombre)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                  {formatExactQuantityValue(detalle.cantidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
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
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Orden no válida"
          message="El identificador de la orden de producción no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de producción"
          message="Obteniendo el detalle de la orden..."
        />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        {/* El copy NO afirma "no tienes acceso", a diferencia de las páginas de
            OB/OR/OCM: el endpoint que alimenta esta página
            (`onboarding?op_id=`) es una action `detail=False`, así que NO pasa
            por el `get_queryset()` acotado por empresa y su
            `get_formatted_op_detalle` consulta `filter(pk=op_id)` sin filtro de
            tenant. Prometer un control de acceso que el backend no aplica sería
            afirmar algo falso; el 404 aquí solo significa "no existe". */}
        <ErrorState
          title="No se pudo cargar la orden de producción"
          message={extractErrorMessage(
            error,
            "La orden no existe o falló la conexión.",
          )}
        />
      </div>
    );
  }

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
                {data.folio_op || `Orden #${data.op_id}`}
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
            <InfoField label="Fin">
              <span className="tabular-nums">
                {formatShortDate(data.fecha_fin)} · {formatShortTime(data.fecha_fin)}
              </span>
            </InfoField>
            <InfoField label="Cierre solicitado" className="col-span-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                  data.cerrar_orden
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400"
                }`}
              >
                {data.cerrar_orden ? "Sí" : "No"}
              </span>
            </InfoField>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 2. Información general ────────────────────────────────────── */}
        <Section title="Información general">
          {/* Sin campo "Pedido": `OrdenProduccion.pedido` nunca se puebla en la
              práctica —el alta de esta orden no vincula ningún pedido—, así que
              `pedido_folio`/`pedido_vinculado` siempre llegarían en guion. No es
              un `null` ocasional que valga la pena cubrir con `textOrDash`: es
              ruido constante, a diferencia de OB/OR/OCM, que sí cuelgan de un
              pedido real. El campo sigue declarado en la interfaz —el backend lo
              manda igual— por si una futura orden llega a traerlo. */}
          <InfoGrid>
            {/* Estatus + Prioridad, el mismo par que las páginas hermanas
                muestran en este bloque. Ambos salieron de la cabecera, así que
                aquí no se duplican. */}
            <InfoField label="Estatus">
              <StatusBadge
                status={String(data.estatus_op)}
                config={{
                  [data.estatus_op]: productionOrderStatusEntry(
                    data.estatus_op,
                    data.estatus_op_display,
                  ),
                }}
              />
            </InfoField>
            <InfoField label="Prioridad">
              <StatusBadge
                status={String(data.prioridad)}
                config={PRODUCTION_ORDER_PRIORITY_CONFIG}
                defaultConfig={productionOrderPriorityFallback(data.prioridad)}
              />
            </InfoField>
            {/* `activo` es el flag de baja lógica y el listado le dedica una
                columna propia: sin él, una orden dada de baja se leería aquí
                idéntica a una vigente. */}
            <InfoField label="Activo">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                  data.activo
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400"
                }`}
              >
                {data.activo ? "Sí" : "No"}
              </span>
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
              {textOrDash(data.observaciones)}
            </InfoField>
          </InfoGrid>
        </Section>

        {/* ── 3. Origen ─────────────────────────────────────────────────── */}
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

      {/* ── 4. Productos ─────────────────────────────────────────────────── */}
      <Section title={`Productos (${data.productos.length})`}>
        {data.productos.length === 0 ? (
          <EmptyLines>Esta orden no tiene productos registrados.</EmptyLines>
        ) : (
          <div className="space-y-4">
            {data.productos.map((producto, index) => (
              <ProductoCard key={index} producto={producto} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 5. Consumos ──────────────────────────────────────────────────── */}
      <Section title={`Consumos (${data.consumos.length})`}>
        {data.consumos.length === 0 ? (
          <EmptyLines>Esta orden no tiene consumos de material registrados.</EmptyLines>
        ) : (
          <div className="space-y-4">
            {data.consumos.map((consumo) => (
              <ConsumoCard key={consumo.consumo_produccion_id} consumo={consumo} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

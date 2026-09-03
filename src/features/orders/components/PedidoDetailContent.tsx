"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, EditIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { hasPermission } from "@/src/utils/permissions";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import {
  InfoField,
  InfoGrid,
  Section,
  EmptyLines,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import {
  formatExactQuantityValue,
  formatMoneyValueOrDash,
  formatQuantityValue,
  safeParseAmount,
} from "@/src/utils/formatCurrency";
import { parsePercentageValue } from "@/src/utils/percentage";
import { MetricCard, RowProgressBar } from "@/src/components/ProgressPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import { PICKING_STATUS_CONFIG } from "@/src/features/picking/constants/pickingStatus";
import { formatShortDate } from "@/src/utils/formatDate";
import { useSatInfo } from "@/src/features/sat/hooks/useSatInfo";
import { usePedidoDetail } from "../hooks/usePedidoDetail";
import {
  canEditPedidoMesaControl,
  getPedidoEstatusConfig,
  getTipoPedidoConfig,
  type BadgeConfig,
} from "../constants/pedidoStatus";
import {
  getFormaPagoLabel,
  getMetodoPagoLabel,
  getUsoCfdiLabel,
} from "../constants/satCatalogs";
import { EmbroideryLineLocationPopover } from "@/src/features/embroidery/components/EmbroideryLineLocationPopover";
import { EmbroideryOrderDetailDialog } from "@/src/features/embroidery/components/EmbroideryOrderDetailDialog";
import { ReflectiveOrderDetailDialog } from "@/src/features/reflective-orders/components/ReflectiveOrderDetailDialog";
import { CorteMangaOrderDetailByIdDialog } from "@/src/features/corte-manga/components/CorteMangaOrderDetailByIdDialog";
import { ProductionOrderDetailByIdDialog } from "@/src/features/production-orders/components/ProductionOrderDetailByIdDialog";
import { PickingDetailByIdDialog } from "@/src/features/picking/components/PickingDetailByIdDialog";
import { PackingDetailByIdDialog } from "@/src/features/packing/components/PackingDetailByIdDialog";
import { PurchaseOrderDetailDialog } from "@/src/features/purchase-orders/components/PurchaseOrderDetailDialog";
import { QuoteDetailByIdDialog } from "@/src/features/quotes/components/QuoteDetailByIdDialog";
import { InvoiceDetailByIdDialog } from "@/src/features/invoicing/components/InvoiceDetailByIdDialog";
import { StockMovementDetailByIdDialog } from "@/src/features/stock-movements/components/StockMovementDetailByIdDialog";
import type { EmbroideryOnboardingUbicacion } from "@/src/features/embroidery/interfaces/embroidery.interface";
import { ReflectiveLineConfigPopover } from "@/src/features/reflective-orders/components/ReflectiveLineConfigPopover";
import type { ReflectiveLineConfigEntry } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";
import type {
  Order,
  PedidoDetalleLinea,
  PedidoDetalleTalla,
  PedidoDocumento,
  PedidoFolioPicking,
  PedidoTrackerPicking,
} from "../interfaces/order.interface";

// ── Navegación "Volver" según el módulo de origen (?from=) ───────────────────
// La ruta es neutra, así que el destino de "Volver" lo decide quien enlazó.
// Sin `?from=` válido cae en `home` (ver abajo), no en un listado de módulo.
const BACK_TARGETS: Record<string, { href: string; label: string }> = {
  operations: { href: "/operations/orders", label: "Volver a Mesa de Control" },
  // Sin esta entrada, un usuario solo-WMS caería en /operations/orders y el
  // proxy lo rebotaría al home por falta de R-MESACONTROL.
  wms: { href: "/wms/orders", label: "Volver a Operaciones de Almacén" },
  procurement: { href: "/procurement/orders", label: "Volver a Compras" },
  sales: { href: "/sales/orders", label: "Volver a Mis Pedidos" },
  // Mismo motivo que `wms`: sin esta entrada, quien llega desde el detalle de
  // una orden de bordado caería en /operations/orders y el proxy lo rebotaría
  // al home por falta de R-MESACONTROL. La llave nombra el ORIGEN concreto
  // (`embroidery`) y no el módulo (`manufacturing`), porque Producción tiene
  // varias listas que pueden enlazar aquí y cada una vuelve a la suya.
  embroidery: {
    href: "/manufacturing/embroidery",
    label: "Volver a Órdenes de Bordado",
  },
  // Igual que `embroidery`, y con la misma llave por ORIGEN concreto: quien
  // llega desde el detalle de una orden de reflejante
  // (`ReflectiveOrderDetailContent`) vuelve a SU listado, no al de bordado ni a
  // Mesa de Control.
  reflective: {
    href: "/manufacturing/reflective-orders",
    label: "Volver a Órdenes de Reflejante",
  },
  // Igual que las dos anteriores: quien llega desde el detalle de una orden de
  // corte de manga (`CorteMangaOrderPageContent`) vuelve a SU listado.
  "corte-manga": {
    href: "/manufacturing/corte-manga",
    label: "Volver a Órdenes de Corte de Manga",
  },
  // Igual que las tres anteriores: quien llega desde el detalle de una orden de
  // producción (`ProductionOrderPageContent`) vuelve a SU listado.
  "production-orders": {
    href: "/manufacturing/production-orders",
    label: "Volver a Órdenes de Producción",
  },
  // Quien llega desde el detalle de una orden de COMPRA
  // (`PurchaseOrderPageContent`, por su `pedido_vinculado`) vuelve al listado
  // de órdenes de compra. Nótese que NO es la llave `procurement` de arriba:
  // esa apunta a `/procurement/orders`, el listado de PEDIDOS del módulo de
  // Compras, que es otra pantalla. Misma convención de llave por ORIGEN
  // concreto que `embroidery`/`reflective`/`corte-manga`.
  "purchase-orders": {
    href: "/procurement/purchase-orders",
    label: "Volver a Órdenes de Compra",
  },
  // Destino universal: el Home no exige ningún permiso de módulo, así que sirve
  // como salida para quien llega sin `?from=` (URL pegada, recarga, enlace
  // externo). También es válido como valor explícito de `?from=home`.
  home: { href: "/", label: "Volver al inicio" },
};
// Fallback cuando `?from=` falta o no es una llave conocida. Apunta al Home y
// NO a un listado de módulo: la regla "/orders" admite nueve permisos distintos,
// así que cualquier listado concreto (antes /operations/orders) rebotaría al
// home a la mayoría de los usuarios que sí pueden ver esta pantalla.
const DEFAULT_BACK = BACK_TARGETS.home;

// Banderas de origen del pedido — se pintan solo las que vienen en `true`.
const ORIGIN_FLAGS: { key: keyof Order; label: string }[] = [
  { key: "recompra", label: "Recompra" },
  { key: "chat_online", label: "Chat online" },
  { key: "pedido_online", label: "Pedido online" },
  { key: "prospeccion", label: "Prospección" },
  { key: "recomendacion", label: "Recomendación" },
  { key: "amazon", label: "Amazon" },
  { key: "google", label: "Google" },
  { key: "publicidad", label: "Publicidad" },
  { key: "mercado_libre", label: "Mercado Libre" },
  { key: "redes_sociales", label: "Redes sociales" },
  { key: "otro", label: "Otro" },
  { key: "mailing", label: "Mailing" },
];

// Condiciones de pago (booleanas) — se muestran las activas en el resumen
// contable. Todas menos `vendedor_autoriza` son campos filtrados por rol.
const PAYMENT_CONDITIONS: { key: keyof Order; label: string }[] = [
  { key: "anticipo_total", label: "Anticipo total" },
  { key: "anticipo_parcial", label: "Anticipo parcial" },
  { key: "vendedor_autoriza", label: "Vendedor autoriza" },
  { key: "pago_antes_embarque", label: "Pago antes de embarque" },
  { key: "por_confirmar", label: "Por confirmar" },
  { key: "otra_cantidad", label: "Otra cantidad" },
];

/**
 * Ubicaciones del `bordado_config` de una talla — el config es un OBJETO
 * `{ notas, ubicaciones[] }` de JSON libre, así que se extrae `.ubicaciones` con
 * doble guard (objeto, luego arreglo). Devuelve `[]` cuando falta o viene con
 * otra forma; el popover solo se abre si hay al menos una.
 */
function bordadoUbicaciones(config: PedidoDetalleTalla["bordado_config"]): EmbroideryOnboardingUbicacion[] {
  if (config && !Array.isArray(config)) {
    const ubic = (config as Record<string, unknown>).ubicaciones;
    if (Array.isArray(ubic)) return ubic as EmbroideryOnboardingUbicacion[];
  }
  return [];
}

/**
 * Entradas del `reflejante_config` — aquí el config ES el arreglo directamente
 * (no un objeto que lo envuelva, a diferencia de bordado). `[]` si no es arreglo.
 */
function reflejanteEntries(config: PedidoDetalleTalla["reflejante_config"]): ReflectiveLineConfigEntry[] {
  return Array.isArray(config) ? (config as ReflectiveLineConfigEntry[]) : [];
}

// Detecta si el usuario tiene visibilidad contable: el backend ELIMINA estos
// campos (no los anula) cuando no hay permiso, así que basta con que uno de los
// centinelas esté definido para saber que la sección contable aplica.
function canSeeAccounting(pedido: Order): boolean {
  return (
    pedido.gran_total !== undefined ||
    pedido.subtotal !== undefined ||
    pedido.forma_pago !== undefined ||
    pedido.iva !== undefined
  );
}

// Badge de origen: gris/neutro, para leerse como una categoría distinta de los
// badges de estatus/tipo (que van con color).
const ORIGIN_BADGE_CLASS =
  "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300";

// ── Piezas presentacionales locales ──────────────────────────────────────────

function Badge({ config }: { config: BadgeConfig }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}
    </span>
  );
}

/** Fila de importe del resumen contable. */
function MoneyRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <InfoField label={label}>
      <span className="tabular-nums">{formatMoneyValueOrDash(value)}</span>
    </InfoField>
  );
}

/**
 * Fila de importe que SOLO se pinta cuando el valor es > 0 — evita llenar el
 * resumen contable de renglones en "$0.00" (que es el caso común: casi todos
 * los cargos opcionales vienen en cero). Subtotal/IVA/Gran total NO usan esto:
 * se muestran siempre aunque sean 0.
 */
function OptionalMoneyRow({ label, value }: { label: string; value?: string | null }) {
  if (safeParseAmount(value) <= 0) return null;
  return <MoneyRow label={label} value={value} />;
}

/** Chip estático de servicio (corte manga / cambio talla, o bordado/reflejante
 *  cuando su config viene vacío y no hay popover que abrir). */
function ServiceChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
      {children}
    </span>
  );
}

// ── Seguimiento de picking ───────────────────────────────────────────────────
//
// El tracker llega en la MISMA respuesta del detalle (no hay petición extra) y
// NO es dato contable: son conteos de prendas, que el filtro por rol del
// backend no toca. Por eso nada de esto se envuelve en `showAccounting` — se
// pinta igual para Ventas, Almacén y Contabilidad.
//
// Todos los KPIs viajan como STRING y con formato inconsistente (un cero llega
// como `"0"`, un valor como `"90.0000"`), así que SIEMPRE se leen con
// `parsePercentageValue` (porcentajes) o `formatExactQuantityValue` (conteos),
// nunca partiendo el string ni asumiendo decimales.
//
// Los CONTEOS van con `formatExactQuantityValue` (4 decimales, ceros a la
// derecha recortados) y NO con `formatQuantityValue` (2 decimales): las
// cantidades de picking son `Decimal(4)` con `min_value` 0.0001, así que
// redondear a 2 pintaría un "0" para una cantidad chica pero REAL —
// indistinguible de "no se asignó nada"— y además discreparía de
// `safeParseAmount`, que compara a precisión completa. Los PORCENTAJES sí van a
// 2 decimales: solo tienen ~2 de precisión real y un "33.3333%" sería ruido.

/** Tono de una barra: azul para lo ASIGNADO, verde para lo SURTIDO. */
const TRACKER_TONES = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
} as const;

/**
 * Barra de avance rotulada, a todo el ancho de su contenedor. Recibe el string
 * CRUDO del API y lo interpreta aquí, para que ningún llamador tenga que
 * acordarse del formato: `parsePercentageValue` absorbe los dos formatos y
 * acota a 0–100, de modo que el ancho en CSS nunca se desborda.
 */
function TrackerBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TRACKER_TONES;
}) {
  const pct = parsePercentageValue(value);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
          {formatQuantityValue(pct)}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${TRACKER_TONES[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Avance de picking del PEDIDO COMPLETO: tres conteos y las dos barras.
 *
 * `total_prendas_pedido` es de origen entero (llega como `"90"`), pero se
 * formatea con el mismo `formatExactQuantityValue` que los otros dos: recorta
 * los ceros a la derecha, así que un entero se ve entero y un decimal conserva
 * sus cifras — no hace falta una rama aparte por tipo de campo.
 */
function PedidoPickingTracker({ tracker }: { tracker?: PedidoTrackerPicking }) {
  // El campo es opcional en el contrato (un backend anterior a él responde sin
  // el campo), así que sin tracker no se pinta la sección — no se inventa un
  // "0%" que afirmaría que nada se ha surtido cuando en realidad no se sabe.
  if (!tracker) return null;

  const totalPrendas = formatExactQuantityValue(tracker.total_prendas_pedido);

  return (
    <Section title="Avance de picking">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Prendas del pedido" done={totalPrendas} />
        <MetricCard
          label="Prendas asignadas"
          done={formatExactQuantityValue(tracker.total_asignado)}
          total={totalPrendas}
        />
        <MetricCard
          label="Prendas surtidas"
          done={formatExactQuantityValue(tracker.total_surtido)}
          total={totalPrendas}
        />
      </div>
      <div className="mt-4 space-y-3">
        <TrackerBar
          label="Avance asignado"
          value={tracker.pct_asignado_pedido}
          tone="sky"
        />
        <TrackerBar
          label="Avance surtido"
          value={tracker.pct_surtido_pedido}
          tone="emerald"
        />
      </div>
    </Section>
  );
}

/**
 * Avance de picking de UNA LÍNEA, compacto, para la cabecera de su tarjeta.
 *
 * Sí se marca `complete` en las barras: a diferencia del avance en puntadas de
 * bordado, estos dos porcentajes SON fracciones acotadas (el backend los tope a
 * `"100.0000"`), así que un 100 aquí sí afirma "esta línea está completa".
 */
function LineaPickingTracker({
  tracker,
}: {
  tracker: PedidoDetalleLinea["tracker_picking"];
}) {
  if (!tracker) return null;

  const asignado = parsePercentageValue(tracker.pct_asignado_linea);
  const surtido = parsePercentageValue(tracker.pct_surtido_linea);
  const totalPrendas = formatExactQuantityValue(tracker.total_prendas_linea);

  return (
    // Los dos grupos fluyen uno junto a otro y envuelven si no caben, en vez de
    // ocupar media tarjeta cada uno: con columnas de ancho fijo, el rótulo y su
    // barra quedaban empujados a extremos opuestos de la columna. Dentro de cada
    // grupo, `gap-2` sin `justify-between` los mantiene pegados.
    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">
          Asignado{" "}
          <span className="tabular-nums">
            ({formatExactQuantityValue(tracker.total_asignado_linea)} / {totalPrendas})
          </span>
        </span>
        <RowProgressBar percentage={asignado} complete={asignado >= 100} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">
          Surtido{" "}
          <span className="tabular-nums">
            ({formatExactQuantityValue(tracker.total_surtido_linea)} / {totalPrendas})
          </span>
        </span>
        <RowProgressBar percentage={surtido} complete={surtido >= 100} />
      </div>
    </div>
  );
}

// ── Detalle: líneas producto+color con sus tallas ────────────────────────────

/**
 * Nombre visible de una línea. `producto_nombre` llega AUSENTE (no `null`) en
 * una línea de MUESTRA —el serializer lo declara con `source="producto.nombre"`
 * sin `default=None`, así que DRF lanza `SkipField`—, y ahí el nombre real vive
 * en `producto_nombre_externo`. Antes se pintaba el hueco en blanco.
 */
function lineaProductoNombre(linea: PedidoDetalleLinea): string {
  return linea.producto_nombre || linea.producto_nombre_externo || "—";
}

function PedidoLineas({
  detalles,
  showAccounting,
}: {
  detalles: PedidoDetalleLinea[];
  showAccounting: boolean;
}) {
  if (detalles.length === 0) {
    return <EmptyLines>Este pedido no tiene líneas de producto.</EmptyLines>;
  }

  return (
    <div className="space-y-4">
      {detalles.map((linea) => (
        <div
          key={linea.id}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
        >
          {/* Cabecera del grupo: producto + color · cantidad total */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {lineaProductoNombre(linea)}
                </span>
                {linea.color_nombre && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                    {linea.color_codigo_hex && (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                        style={{ backgroundColor: linea.color_codigo_hex }}
                        aria-hidden="true"
                      />
                    )}
                    {linea.color_nombre}
                  </span>
                )}
              </div>
              {showAccounting && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Precio unitario: {formatMoneyValueOrDash(linea.precio_unitario)} · Subtotal:{" "}
                  {formatMoneyValueOrDash(linea.subtotal_linea)}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-white">
                {linea.cantidad_total} pzas
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {linea.tallas.length} talla{linea.tallas.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Avance de picking de la línea, entre la cabecera y el desglose:
              resume lo que las columnas Asignado/Surtido detallan por talla. */}
          <LineaPickingTracker tracker={linea.tracker_picking} />

          {/* Tallas: variante vendible (SKU), servicios y cantidad */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Talla</th>
                  <th className="px-3 py-2 text-left font-semibold">Variante / SKU</th>
                  <th className="px-3 py-2 text-left font-semibold">Servicios</th>
                  {showAccounting && (
                    <th className="px-3 py-2 text-right font-semibold">Precio unit.</th>
                  )}
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                  {/* Acumulado de TODOS los pickings del pedido para la talla
                      (son parciales y repetibles), no el de un folio suelto.
                      Van a la derecha de "Cantidad" para leerse en progresión:
                      pedida → asignada → surtida. */}
                  <th className="px-3 py-2 text-right font-semibold">Asignado</th>
                  <th className="px-3 py-2 text-right font-semibold">Surtido</th>
                </tr>
              </thead>
              <tbody>
                {linea.tallas.map((talla) => {
                  // Chips de servicio de la talla. Bordado y reflejante se
                  // envuelven en su popover de detalle cuando traen config; si el
                  // config viene vacío (o para corte manga / cambio talla, que no
                  // se detallan), queda un chip estático.
                  const ubicaciones = talla.lleva_bordado
                    ? bordadoUbicaciones(talla.bordado_config)
                    : [];
                  const reflejantes = talla.lleva_reflejante
                    ? reflejanteEntries(talla.reflejante_config)
                    : [];
                  const servicioChips: React.ReactNode[] = [];
                  if (talla.lleva_bordado) {
                    servicioChips.push(
                      ubicaciones.length > 0 ? (
                        <EmbroideryLineLocationPopover
                          key="bordado"
                          ubicaciones={ubicaciones}
                          productoNombre={lineaProductoNombre(linea)}
                          tallaNombre={talla.talla_nombre}
                          colorNombre={linea.color_nombre}
                          posicionLabel={null}
                        />
                      ) : (
                        <ServiceChip key="bordado">Bordado</ServiceChip>
                      ),
                    );
                  }
                  if (talla.lleva_reflejante) {
                    servicioChips.push(
                      reflejantes.length > 0 ? (
                        <ReflectiveLineConfigPopover
                          key="reflejante"
                          configs={reflejantes}
                          productoNombre={lineaProductoNombre(linea)}
                          tallaNombre={talla.talla_nombre}
                          colorNombre={linea.color_nombre}
                        />
                      ) : (
                        <ServiceChip key="reflejante">Reflejante</ServiceChip>
                      ),
                    );
                  }
                  if (talla.lleva_corte_manga) {
                    servicioChips.push(<ServiceChip key="corte">Corte manga</ServiceChip>);
                  }
                  if (talla.lleva_cambio_talla) {
                    servicioChips.push(<ServiceChip key="cambio">Cambio talla</ServiceChip>);
                  }
                  // Lo surtido cubre lo pedido de esta talla. Es un HECHO
                  // comparable —ambos lados son piezas de la misma talla—, no
                  // una razón que pueda pasarse de largo, así que se puede
                  // afirmar en verde. `safeParseAmount` para leer el string sin
                  // suponer formato; `cantidad` ya es número.
                  const surtidoCompleto =
                    talla.cantidad > 0 &&
                    safeParseAmount(talla.cantidad_surtida_picking) >= talla.cantidad;
                  return (
                    <tr
                      key={talla.id}
                      className="border-t border-slate-100 dark:border-white/10 align-top"
                    >
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {talla.talla_nombre}
                      </td>
                      <td className="px-3 py-2">
                        <span className="block font-mono text-slate-600 dark:text-slate-300">
                          {talla.variante_sku || "—"}
                        </span>
                        {talla.variante_nombre && (
                          <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-52">
                            {talla.variante_nombre}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {servicioChips.length === 0 ? (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {servicioChips}
                          </div>
                        )}
                      </td>
                      {showAccounting && (
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatMoneyValueOrDash(talla.precio_unitario)}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                        {talla.cantidad}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatExactQuantityValue(talla.cantidad_asignada_picking)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${
                          surtidoCompleto
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {formatExactQuantityValue(talla.cantidad_surtida_picking)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Documentos relacionados ──────────────────────────────────────────────────

/**
 * Tipos stub: sus `folio` y `fecha` son el PK crudo (`str(id)`), no datos
 * reales. Para estos NO se muestra folio ni fecha (parsear la "fecha" daría un
 * "1 ene 1970" o similar). `estatus` tampoco aplica. Se define como constante
 * en vez de inline en los condicionales.
 */
const STUB_DOCUMENTO_TIPOS = new Set(["envio", "entrega", "devolucion"]);

// `movimiento_inventario`: sin folio real (es `str(id)`) pero con fecha real
// (`fecha_movimiento`); su `estatus` siempre viene `null`.
const MOVIMIENTO_INVENTARIO_TIPO = "movimiento_inventario";

/**
 * Llave de `CLICKABLE_DOC_TIPOS` que abre el detalle de un picking. La usan DOS
 * tablas: "Documentos relacionados" (donde llega como `doc.tipo` del backend) y
 * "Folios de picking" (donde la ponemos nosotros para reusar el mismo diálogo
 * sin inventar una ruta). Debe coincidir con el `tipo` que emite el backend.
 */
const PICKING_DOC_TIPO = "picking";

/**
 * Registro de tipos de documento con detalle navegable desde aquí. La llave es
 * el `doc.tipo`; el valor, el diálogo que lo abre. Todos los diálogos incluidos
 * comparten hoy la MISMA firma (`{ orderId, open, onOpenChange }`) y se
 * auto-abastecen del detalle por id puro (= `doc.id`), así que se montan de
 * forma uniforme. Un tipo ausente del registro queda como texto estático.
 *
 * Si a futuro un diálogo tuviera otra firma, no encajaría en este mapa y habría
 * que darle su propia rama — se resolverá cuando aparezca, sin sobre-diseñar el
 * mapa ahora.
 */
type DocDetailDialog = React.ComponentType<{
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

const CLICKABLE_DOC_TIPOS: Record<string, DocDetailDialog> = {
  orden_bordado: EmbroideryOrderDetailDialog,
  orden_reflejante: ReflectiveOrderDetailDialog,
  // Corte de manga no se auto-abastece por id de fábrica (su diálogo recibe el
  // objeto ya resuelto); `CorteMangaOrderDetailByIdDialog` es el wrapper que le
  // da la firma por id que este registro exige.
  orden_corte_manga: CorteMangaOrderDetailByIdDialog,
  // Producción sí es self-fetching, pero con prop `opId` no-nullable;
  // `ProductionOrderDetailByIdDialog` solo adapta la firma (sin action/hook).
  orden_produccion: ProductionOrderDetailByIdDialog,
  // Picking recibe la fila YA enriquecida (`PickingRow`) y no acepta null;
  // `PickingDetailByIdDialog` fetchea por id, enriquece y maneja loading/error.
  // Llave por constante porque la tabla de "Folios de picking" abre por este
  // MISMO registro (ver `PedidoFoliosPicking`): si el string se escribiera dos
  // veces, un cambio en uno dejaría el otro apuntando a la nada, y el fallo
  // sería silencioso (`Object.hasOwn` daría false y el clic no haría nada).
  [PICKING_DOC_TIPO]: PickingDetailByIdDialog,
  // Packing es como picking pero sin enriquecimiento; el wrapper fetchea por id
  // y maneja loading/error (el diálogo no acepta null ni los tiene).
  packing: PackingDetailByIdDialog,
  // Orden de compra encaja directo: ya es self-fetching por id y su firma es
  // exactamente la del registro (`{ orderId, open, onOpenChange }`).
  orden_compra: PurchaseOrderDetailDialog,
  // Cotización: `QuoteDetails` es contenido self-fetching (no un diálogo);
  // `QuoteDetailByIdDialog` solo lo envuelve en un MainDialog (sin action/hook).
  cotizacion: QuoteDetailByIdDialog,
  // Factura: `InvoiceDetails` es contenido parent-injected; el wrapper fetchea
  // por id (detalle con `factura_detalles`), lo envuelve y maneja loading/error.
  factura: InvoiceDetailByIdDialog,
  // Movimiento de inventario sí es self-fetching, pero con prop `movementId`
  // no-nullable; `StockMovementDetailByIdDialog` solo adapta la firma.
  movimiento_inventario: StockMovementDetailByIdDialog,
};

/**
 * Timestamp para ordenar (desc, más reciente primero). Devuelve `null` cuando
 * el documento no tiene una fecha real (tipos stub, o fecha ausente/no
 * parseable): esos van al fondo.
 */
function docSortTime(doc: PedidoDocumento): number | null {
  if (STUB_DOCUMENTO_TIPOS.has(doc.tipo) || !doc.fecha) return null;
  const time = new Date(doc.fecha).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Badge neutro para el estatus del documento (sin mapa de color por tipo). */
function DocEstatusBadge({ estatus }: { estatus: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${ORIGIN_BADGE_CLASS}`}
    >
      {estatus}
    </span>
  );
}

function PedidoDocumentos({
  documentos,
  onOpenDoc,
}: {
  documentos: PedidoDocumento[];
  onOpenDoc: (doc: { tipo: string; id: number }) => void;
}) {
  if (documentos.length === 0) {
    return <EmptyLines>Sin documentos relacionados.</EmptyLines>;
  }

  // Orden: fecha descendente; los que no tienen fecha real (stubs) al fondo.
  const ordenados = [...documentos].sort((a, b) => {
    const ta = docSortTime(a);
    const tb = docSortTime(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-semibold">Tipo</th>
            <th className="px-3 py-2 text-left font-semibold">Folio</th>
            <th className="px-3 py-2 text-left font-semibold">Fecha</th>
            <th className="px-3 py-2 text-left font-semibold">Estatus</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((doc) => {
            const isStub = STUB_DOCUMENTO_TIPOS.has(doc.tipo);
            const isMovimiento = doc.tipo === MOVIMIENTO_INVENTARIO_TIPO;
            // Clicable solo si su tipo tiene un diálogo de detalle registrado
            // (por id); el resto queda como texto estático. `Object.hasOwn` en
            // vez de `in`: `in` recorre la cadena de prototipos, así que un
            // `tipo` llamado `constructor`/`toString`/… daría true falsamente.
            const isClickable = Object.hasOwn(CLICKABLE_DOC_TIPOS, doc.tipo);
            // Folio: oculto (—) para stubs y movimiento (su folio es el PK).
            const folio = isStub || isMovimiento ? "—" : textOrDash(doc.folio);
            // Fecha: oculta (—) para stubs (PK disfrazado); real para el resto.
            const fecha = isStub ? "—" : formatShortDate(doc.fecha);
            // Estatus: nunca para stubs ni movimiento; badge si viene, si no —.
            const showEstatus = !isStub && !isMovimiento && doc.estatus;
            return (
              <tr
                key={`${doc.tipo}-${doc.id}`}
                className="border-t border-slate-100 dark:border-white/10 align-top"
              >
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                  {isClickable ? (
                    <button
                      type="button"
                      onClick={() => onOpenDoc({ tipo: doc.tipo, id: doc.id })}
                      className="text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer font-medium text-left transition-colors"
                      title={`Ver detalle: ${doc.label}`}
                    >
                      {doc.label}
                    </button>
                  ) : (
                    doc.label
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {folio}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {fecha}
                </td>
                <td className="px-3 py-2">
                  {showEstatus ? (
                    <DocEstatusBadge estatus={doc.estatus as string} />
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Folios de picking ────────────────────────────────────────────────────────

/**
 * Timestamp de un folio para ordenar (desc, más reciente primero). `null`
 * cuando la fecha falta o no es parseable — esos van al fondo, mismo criterio
 * que `docSortTime`.
 */
function folioSortTime(folio: PedidoFolioPicking): number | null {
  if (!folio.created_at) return null;
  const time = new Date(folio.created_at).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Historial de pickings del pedido. Un pedido acumula VARIOS pickings (son
 * parciales y repetibles por talla), así que esto es la bitácora de surtido.
 *
 * Copia el molde de `PedidoDocumentos` —`<table>` cruda dentro de una `Section`,
 * orden por fecha descendente, primera columna clicable— en vez de un
 * `DataTable`: es un listado corto e incrustado, y la barra de herramientas,
 * el buscador y el paginador de `DataTable` sobrarían y romperían la coherencia
 * visual con las otras dos tablas de esta página.
 *
 * OJO: `total_lineas_completas / total_lineas` describe SOLO ese folio. El
 * avance del PEDIDO es `tracker_picking` (arriba) y no se reconstruye sumando
 * esta columna.
 */
function PedidoFoliosPicking({
  folios,
  onOpenFolio,
}: {
  folios: PedidoFolioPicking[];
  onOpenFolio: (doc: { tipo: string; id: number }) => void;
}) {
  if (folios.length === 0) {
    return <EmptyLines>Este pedido todavía no tiene pickings.</EmptyLines>;
  }

  const ordenados = [...folios].sort((a, b) => {
    const ta = folioSortTime(a);
    const tb = folioSortTime(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-left font-semibold">Folio</th>
            <th className="px-3 py-2 text-left font-semibold">Fecha</th>
            <th className="px-3 py-2 text-left font-semibold">Estado</th>
            <th className="px-3 py-2 text-left font-semibold">Origen → Destino</th>
            <th className="px-3 py-2 text-left font-semibold">Operador</th>
            {/* De ESTE folio, no del pedido — ver la nota del componente. */}
            <th className="px-3 py-2 text-right font-semibold">Líneas</th>
            <th className="px-3 py-2 text-right font-semibold">Asignada</th>
            <th className="px-3 py-2 text-right font-semibold">Surtida</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((folio) => (
            <tr
              key={folio.id}
              className="border-t border-slate-100 dark:border-white/10 align-top"
            >
              <td className="px-3 py-2">
                {/* Abre el MISMO diálogo por id que usa "Documentos
                    relacionados". No es un enlace a /wms/...: esa ruta de
                    detalle no existe, y además el módulo WMS exige R-WMS,
                    que un usuario de Ventas no tiene aunque sí pueda ver
                    este pedido (la ruta /orders/[id] es neutra). */}
                <button
                  type="button"
                  onClick={() =>
                    onOpenFolio({ tipo: PICKING_DOC_TIPO, id: folio.id })
                  }
                  className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer font-medium text-left transition-colors whitespace-nowrap"
                  title="Ver detalle del picking"
                >
                  {textOrDash(folio.folio)}
                </button>
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {formatShortDate(folio.created_at)}
              </td>
              <td className="px-3 py-2">
                {/* Mismo mapa de colores que el listado de Picking en WMS: es
                    el mismo enum del mismo modelo, no un estatus propio de
                    pedidos, así que no se redefine aquí. */}
                <StatusBadge status={folio.estado} config={PICKING_STATUS_CONFIG} />
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                <span className="whitespace-nowrap">
                  {textOrDash(folio.almacen_origen_nombre)}
                </span>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">→</span>
                {/* `almacen_destino_nombre` es nullable en el esquema. */}
                <span className="whitespace-nowrap">
                  {textOrDash(folio.almacen_destino_nombre)}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {/* `operador_nombre` también es nullable. */}
                {textOrDash(folio.operador_nombre)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {folio.total_lineas_completas} / {folio.total_lineas}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {formatExactQuantityValue(folio.cantidad_asignada_total)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                {formatExactQuantityValue(folio.cantidad_surtida_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

interface PedidoDetailContentProps {
  pedidoId: string;
  from?: string;
}

export function PedidoDetailContent({ pedidoId, from }: PedidoDetailContentProps) {
  const numericId = Number(pedidoId);
  const { data, isLoading, isError, error } = usePedidoDetail(numericId);
  const { data: session } = useSession();
  // Permiso del catálogo. OJO: el backend NO lo valida en el endpoint de
  // edición —exige el ROL `MESA-DE-CONTROL`—, así que esto gobierna la UI y la
  // frontera real es el rol. Ver `pedidoEditAccess.server.ts`.
  const canEditMesaControl = hasPermission("E-MESACONTROL-PEDIDOS", session?.user);
  // Documento abierto desde "Documentos relacionados" (`null` = cerrado). Un
  // solo estado para todos los tipos navegables; el diálogo se resuelve del
  // registro `CLICKABLE_DOC_TIPOS` según `openDoc.tipo`.
  const [openDoc, setOpenDoc] = useState<{ tipo: string; id: number } | null>(
    null,
  );
  // `Object.hasOwn` (no indexado directo) para no resolver a una función de
  // `Object.prototype` si `openDoc.tipo` fuera una clave heredada.
  const OpenDocDialog =
    openDoc && Object.hasOwn(CLICKABLE_DOC_TIPOS, openDoc.tipo)
      ? CLICKABLE_DOC_TIPOS[openDoc.tipo]
      : null;
  // Catálogo SAT (cacheado 24h) para resolver `cliente_regimen_fiscal`, que
  // llega como PK del FK (no como código SAT) y no se puede mapear sin él.
  const { data: satCatalogs } = useSatInfo();

  // `Object.hasOwn` y no el indexado directo, por el mismo motivo que
  // `CLICKABLE_DOC_TIPOS` arriba: `from` viene de la URL, así que
  // `?from=constructor` (o `toString`, `valueOf`) resolvería a una función
  // heredada de `Object.prototype` —truthy— y dejaría `back.href` en
  // `undefined`, reventando el `<Link>` del "Volver".
  const back =
    from && Object.hasOwn(BACK_TARGETS, from) ? BACK_TARGETS[from] : DEFAULT_BACK;

  const BackLink = (
    <Link
      href={back.href}
      className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{back.label}</span>
    </Link>
  );

  if (Number.isNaN(numericId) || numericId <= 0) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Pedido no válido"
          message="El identificador del pedido no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader title="Cargando pedido" message="Obteniendo detalle del pedido..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Error al cargar el pedido"
          message={(error as Error)?.message}
        />
      </div>
    );
  }

  const estatusCfg = getPedidoEstatusConfig(data.estatus);
  const tipoCfg = getTipoPedidoConfig(data.tipo_pedido);
  const showAccounting = canSeeAccounting(data);
  const totalPiezas = data.detalles.reduce(
    (sum, linea) => sum + (linea.cantidad_total ?? 0),
    0,
  );
  const activeOrigins = ORIGIN_FLAGS.filter((flag) => data[flag.key]);
  const activeConditions = PAYMENT_CONDITIONS.filter((cond) => data[cond.key]);

  // Régimen fiscal: se resuelve el PK contra el catálogo SAT. Mientras carga
  // (o si no hay coincidencia) cae a "Régimen {id}"; "—" cuando no hay valor.
  const regimenId = data.cliente_regimen_fiscal;
  const regimenMatch =
    regimenId != null
      ? satCatalogs?.regimenes_fiscales.find(
          (r) => r.id_sat_regimen_fiscal === regimenId,
        )
      : undefined;
  const regimenLabel =
    regimenId == null
      ? "—"
      : regimenMatch
        ? `${regimenMatch.codigo} - ${regimenMatch.descripcion}`
        : `Régimen ${regimenId}`;

  return (
    <div className="w-full space-y-6">
      {/* ── Barra superior: "Volver" + acciones ──────────────────────────── */}
      <div className="sticky top-0 z-10 py-2 flex flex-wrap items-center justify-between gap-3">
        {BackLink}
        {/* Editar por Mesa de Control. Tres condiciones, todas necesarias:
            el PERMISO (`hasPermission` ya cortocircuita para "admin"), tener
            cotización de origen —sin ella el endpoint responde 400, porque su
            contrato es editar-y-espejar— y un `estatus` editable (un pedido
            CANCELADO no se toca). Las dos reglas de negocio se pueden evaluar
            aquí: el retrieve expone `cotizacion`, a diferencia del listado. */}
        {canEditMesaControl && data.cotizacion && canEditPedidoMesaControl(data.estatus) && (
          <Button asChild variant="primary">
            <Link
              href={`/orders/${data.id}/edit-mesa-control`}
              className="inline-flex items-center gap-2"
            >
              <EditIcon className="w-4 h-4" aria-hidden="true" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      {/* ── 1. Cabecera ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {data.folio || `Pedido #${data.id}`}
              </h1>
              <Badge config={estatusCfg} />
              <Badge config={tipoCfg} />
              {/* Origen del pedido — normalmente uno solo; badge NEUTRO para
                  distinguirlo de estatus/tipo. Sin origen → no se pinta nada. */}
              {activeOrigins.map((flag) => (
                <Badge
                  key={flag.key as string}
                  config={{ label: flag.label, className: ORIGIN_BADGE_CLASS }}
                />
              ))}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {textOrDash(data.cliente_razon_social || data.cliente_nombre)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs shrink-0">
            <InfoField label="Creado">{formatShortDate(data.created_at)}</InfoField>
            <InfoField label="Fecha confirmada">
              {data.fecha_confirmacion ? formatShortDate(data.fecha_confirmacion) : "—"}
            </InfoField>
            <InfoField label="Total piezas">
              <span className="tabular-nums font-semibold">{totalPiezas}</span>
            </InfoField>
            {showAccounting && (
              <InfoField label="Gran total">
                <span className="tabular-nums font-semibold">
                  {formatMoneyValueOrDash(data.gran_total)}
                </span>
              </InfoField>
            )}
          </div>
        </div>
      </section>

      {/* ── Avance de picking del pedido ─────────────────────────────────
          Justo bajo la cabecera: es el estado OPERATIVO del pedido, lo que se
          viene a consultar aquí. Sin `showAccounting`: son piezas, no dinero. */}
      <PedidoPickingTracker tracker={data.tracker_picking} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 2. Snapshot fiscal del cliente ────────────────────────────── */}
        <Section title="Datos fiscales del cliente (snapshot)">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 -mt-2">
            Foto de los datos fiscales al momento del pedido, no el cliente en vivo.
          </p>
          <InfoGrid>
            <InfoField label="Razón social" className="col-span-2">
              {textOrDash(data.cliente_razon_social)}
            </InfoField>
            <InfoField label="Nombre">{textOrDash(data.cliente_nombre)}</InfoField>
            <InfoField label="RFC">{textOrDash(data.cliente_rfc)}</InfoField>
            <InfoField label="Régimen fiscal">{regimenLabel}</InfoField>
            <InfoField label="Giro empresarial">
              {textOrDash(data.cliente_giro_empresarial)}
            </InfoField>
            <InfoField label="Dirección fiscal" className="col-span-2 md:col-span-3">
              {textOrDash(data.cliente_direccion_fiscal)}
            </InfoField>
            <InfoField label="Colonia">{textOrDash(data.cliente_colonia)}</InfoField>
            <InfoField label="C.P.">{textOrDash(data.cliente_codigo_postal)}</InfoField>
            <InfoField label="Ciudad">{textOrDash(data.cliente_ciudad)}</InfoField>
            <InfoField label="Estado">{textOrDash(data.cliente_estado)}</InfoField>
          </InfoGrid>
        </Section>

        {/* ── 3. Contacto y pago ────────────────────────────────────────── */}
        <Section title="Contacto y pago">
          <InfoGrid>
            <InfoField label="Persona de pagos">{textOrDash(data.persona_pagos)}</InfoField>
            <InfoField label="Correo facturas">{textOrDash(data.correo_facturas)}</InfoField>
            <InfoField label="Teléfono pagos">{textOrDash(data.telefono_pagos)}</InfoField>
            <InfoField label="Orden de compra (OC)">{textOrDash(data.oc)}</InfoField>
            <InfoField label="Forma de pago">{getFormaPagoLabel(data.forma_pago)}</InfoField>
            <InfoField label="Método de pago">{getMetodoPagoLabel(data.metodo_pago)}</InfoField>
            <InfoField label="Uso CFDI">{getUsoCfdiLabel(data.uso_cfdi)}</InfoField>
          </InfoGrid>
        </Section>
      </div>

      {/* ── Fila: Envío + Resumen contable (2 columnas en desktop) ──────────
          Anchos desiguales a propósito: Envío (más campos) ~60%, Resumen ~40%.
          Sin permiso contable el Resumen no se pinta y Envío queda full-width
          (el wrapper pierde el grid), evitando una columna vacía. */}
      <div
        className={
          showAccounting
            ? "grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6"
            : ""
        }
      >
        {/* ── 7. Envío ──────────────────────────────────────────────────── */}
        <Section title="Envío">
          <InfoGrid>
          <InfoField label="Destinatario">{textOrDash(data.destinatario)}</InfoField>
          <InfoField label="Empresa de envío">{textOrDash(data.empresa_envio)}</InfoField>
          <InfoField label="Teléfono">{textOrDash(data.telefono_envio)}</InfoField>
          <InfoField label="Celular">{textOrDash(data.celular_envio)}</InfoField>
          <InfoField label="Dirección" className="col-span-2 md:col-span-3">
            {textOrDash(data.direccion_envio)}
          </InfoField>
          <InfoField label="Colonia">{textOrDash(data.colonia_envio)}</InfoField>
          <InfoField label="C.P.">{textOrDash(data.codigo_postal)}</InfoField>
          <InfoField label="Ciudad">{textOrDash(data.ciudad_envio)}</InfoField>
          <InfoField label="Estado">{textOrDash(data.estado_envio)}</InfoField>
          <InfoField label="Referencias" className="col-span-2 md:col-span-3">
            {textOrDash(data.referencias)}
          </InfoField>
          <InfoField label="Empaque ecológico">
            {data.empaque_ecologico ? "Sí" : "No"}
          </InfoField>
          <InfoField label="Embarque parcial">
            {data.embarque_parcial ? "Sí" : "No"}
          </InfoField>
          <InfoField label="Comentarios parcialidad" className="col-span-2 md:col-span-3">
            {textOrDash(data.comentarios_parcialidad)}
          </InfoField>
        </InfoGrid>
      </Section>

      {/* ── 8. Resumen contable (condicional) ───────────────────────────── */}
      {showAccounting && (
        <Section title="Resumen contable">
          <InfoGrid>
            <MoneyRow label="Subtotal" value={data.subtotal} />
            <InfoField label="IVA">
              {data.iva !== undefined ? `${data.iva}%` : "—"}
            </InfoField>
            {/* Cargos/descuentos opcionales: solo se pintan si son > 0. */}
            <OptionalMoneyRow label="Descuento global" value={data.descuento_global} />
            <OptionalMoneyRow label="IEPS" value={data.ieps} />
            <OptionalMoneyRow label="Anticipo" value={data.anticipo} />
            <OptionalMoneyRow label="Monto" value={data.monto} />
            <OptionalMoneyRow label="Flete" value={data.flete} />
            <OptionalMoneyRow label="Seguros" value={data.seguros} />
            <OptionalMoneyRow label="Envío" value={data.envio} />
            <OptionalMoneyRow label="Programa bordados" value={data.programa_bordados} />
            <OptionalMoneyRow label="Serigrafía" value={data.serigrafia} />
            <OptionalMoneyRow label="Reflejante" value={data.reflejante} />
            <OptionalMoneyRow
              label="Bordado pantalones (extras)"
              value={data.bordado_pantalones_extras}
            />
            <InfoField label="Gran total">
              <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                {formatMoneyValueOrDash(data.gran_total)}
              </span>
            </InfoField>
          </InfoGrid>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
            <InfoGrid>
              <InfoField label="Forma de pago">{getFormaPagoLabel(data.forma_pago)}</InfoField>
              <InfoField label="Método de pago">{getMetodoPagoLabel(data.metodo_pago)}</InfoField>
              <InfoField label="Uso CFDI">{getUsoCfdiLabel(data.uso_cfdi)}</InfoField>
            </InfoGrid>
            {activeConditions.length > 0 && (
              <div className="mt-3">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Condiciones de pago
                </span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {activeConditions.map((cond) => (
                    <Chip key={cond.key as string}>{cond.label}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
        )}
      </div>

      {/* ── Fila full-width: Productos con tallas (la tabla necesita el ancho) ── */}
      <Section title={`Productos del pedido (${data.detalles.length})`}>
        <PedidoLineas detalles={data.detalles} showAccounting={showAccounting} />
      </Section>

      {/* ── Fila full-width: historial de pickings (8 columnas, necesita ancho).
          Va después de los productos y antes de los documentos: es el desglose
          de las barras de arriba y el paso previo a la bitácora documental. */}
      <Section title={`Folios de picking (${(data.folios_picking ?? []).length})`}>
        <PedidoFoliosPicking
          folios={data.folios_picking ?? []}
          onOpenFolio={setOpenDoc}
        />
      </Section>

      {/* ── Fila: Servicios extra + Documentos relacionados (2 columnas) ────────
          Anchos desiguales: Servicios (compacto) ~40%, Documentos (tabla) ~60%. */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* ── 6. Servicios extra ──────────────────────────────────────────── */}
        <Section title={`Servicios extra (${data.servicios_extras.length})`}>
          {data.servicios_extras.length === 0 ? (
            <EmptyLines>Este pedido no tiene servicios extra.</EmptyLines>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {data.servicios_extras.map((servicio) => (
                <div
                  key={servicio.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-700 dark:text-slate-200 truncate">
                      {servicio.nombre}
                    </span>
                    {!servicio.visible_en_factura && (
                      <span className="inline-flex items-center rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        No visible en factura
                      </span>
                    )}
                  </div>
                  {showAccounting && (
                    <span className="tabular-nums font-semibold text-slate-800 dark:text-white shrink-0">
                      {formatMoneyValueOrDash(servicio.monto)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── 9. Documentos relacionados ──────────────────────────────────── */}
        <Section title="Documentos relacionados">
          <PedidoDocumentos
            documentos={data.documentos ?? []}
            onOpenDoc={setOpenDoc}
          />
        </Section>
      </div>

      {/* Detalle del documento (se monta solo al abrir; cada diálogo trae su
          propio detalle por id). El componente se resuelve del registro. */}
      {openDoc && OpenDocDialog && (
        <OpenDocDialog
          orderId={openDoc.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDoc(null);
          }}
        />
      )}

    </div>
  );
}

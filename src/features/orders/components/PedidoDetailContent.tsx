"use client";

import Link from "next/link";
import type React from "react";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import {
  InfoField,
  SectionTitle,
  EmptyLines,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatMoneyValueOrDash, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { useSatInfo } from "@/src/features/sat/hooks/useSatInfo";
import { usePedidoDetail } from "../hooks/usePedidoDetail";
import {
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
import type { EmbroideryOnboardingUbicacion } from "@/src/features/embroidery/interfaces/embroidery.interface";
import { ReflectiveLineConfigPopover } from "@/src/features/reflective-orders/components/ReflectiveLineConfigPopover";
import type { ReflectiveLineConfigEntry } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";
import type {
  Order,
  PedidoDetalleLinea,
  PedidoDetalleTalla,
} from "../interfaces/order.interface";

// ── Navegación "Volver" según el módulo de origen (?from=) ───────────────────
// La ruta es neutra, así que el destino de "Volver" lo decide quien enlazó.
// El default cae en Mesa de Control, la lista original de pedidos.
const BACK_TARGETS: Record<string, { href: string; label: string }> = {
  operations: { href: "/operations/orders", label: "Volver a Mesa de Control" },
  // Sin esta entrada, un usuario solo-WMS caería en /operations/orders y el
  // proxy lo rebotaría al home por falta de R-MESACONTROL.
  wms: { href: "/wms/orders", label: "Volver a Operaciones de Almacén" },
  procurement: { href: "/procurement/orders", label: "Volver a Compras" },
  sales: { href: "/sales/orders", label: "Volver a Mis Pedidos" },
};
const DEFAULT_BACK = { href: "/operations/orders", label: "Volver a pedidos" };

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

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionTitle>{title}</SectionTitle>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Rejilla de campos etiqueta/valor reutilizada por varias secciones. */
function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-xs">
      {children}
    </div>
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

// ── Detalle: líneas producto+color con sus tallas ────────────────────────────

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
                  {linea.producto_nombre}
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
                          productoNombre={linea.producto_nombre}
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
                          productoNombre={linea.producto_nombre}
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

// ── Componente principal ─────────────────────────────────────────────────────

interface PedidoDetailContentProps {
  pedidoId: string;
  from?: string;
}

export function PedidoDetailContent({ pedidoId, from }: PedidoDetailContentProps) {
  const numericId = Number(pedidoId);
  const { data, isLoading, isError, error } = usePedidoDetail(numericId);
  // Catálogo SAT (cacheado 24h) para resolver `cliente_regimen_fiscal`, que
  // llega como PK del FK (no como código SAT) y no se puede mapear sin él.
  const { data: satCatalogs } = useSatInfo();

  const back = (from && BACK_TARGETS[from]) || DEFAULT_BACK;

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
      {/* ── Barra superior con "Volver" ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 py-2 w-fit">{BackLink}</div>

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

      {/* ── 4 y 5. Líneas del pedido con tallas ─────────────────────────── */}
      <Section title={`Productos del pedido (${data.detalles.length})`}>
        <PedidoLineas detalles={data.detalles} showAccounting={showAccounting} />
      </Section>

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

      {/* ── 7. Envío ────────────────────────────────────────────────────── */}
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
  );
}

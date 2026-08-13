"use client";

import Link from "next/link";
import type React from "react";
import { ArrowLeftIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import {
  CORTE_MANGA_ORDER_PRIORITY_CONFIG,
  CORTE_MANGA_ORDER_STATUS_CONFIG,
  corteMangaOrderPriorityFallback,
} from "../constants/corteMangaOrderStatus";
import { useCorteMangaOrderDetail } from "../hooks/useCorteMangaOrderDetail";
import type { CorteMangaOrderLine } from "../interfaces/corte-manga-order.interface";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/manufacturing`, exige
// `R-PRODUCCION` y hoy solo se alcanza desde el listado del propio módulo, así
// que un mapa de orígenes tendría una sola entrada idéntica a su default.
const BACK = {
  href: "/manufacturing/corte-manga",
  label: "Volver a Órdenes de Corte de Manga",
};

// ── Piezas presentacionales locales ──────────────────────────────────────────
// Duplicadas de `PedidoDetailContent`/`EmbroideryOrderDetailContent`/
// `ReflectiveOrderDetailContent` (donde también son locales). Ya son cuatro las
// vistas que las repiten: extraerlas a `DetailDialogPrimitives` es trabajo
// pendiente que toca esos tres archivos, fuera del alcance de esta página.

/** Tarjeta de sección: el bloque que compone toda la página. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionTitle>{title}</SectionTitle>
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

/**
 * Piezas que programa esta orden.
 *
 * Se SUMAN los renglones, a diferencia de bordado y reflejante, que leen el
 * `cantidad_cubierta` del backend: OCM no expone cobertura (ni
 * `cantidad_cubierta`, ni `cantidad_contratada`, ni `cobertura_completa`), así
 * que esta suma no puede contradecir ninguna otra cifra de la pantalla — no hay
 * otra.
 *
 * Se descartan los valores no finitos con el MISMO criterio que la columna
 * "Prendas" del listado (`CorteMangaOrderColumns`) y que
 * `computeCorteMangaOrderKpis`: sin el filtro, un `cantidad` corrupto daría
 * `NaN` aquí y quedaría excluido allá, y la página y el listado reportarían
 * totales distintos del mismo dato.
 */
const sumarPiezas = (items: CorteMangaOrderLine[]): number =>
  items.reduce(
    (acc, linea) => (Number.isFinite(linea.cantidad) ? acc + linea.cantidad : acc),
    0,
  );

// ── Artículos de la orden ────────────────────────────────────────────────────

/**
 * Renglones de la orden.
 *
 * Es una tabla propia y NO `LineItemsTable` (el chrome que usa el diálogo): ese
 * contenedor acota el alto a `max-h-72` con scroll interno, que es lo correcto
 * dentro de un diálogo y lo contrario de lo que quiere una página — aquí los
 * renglones se leen de corrido.
 *
 * Las mismas CUATRO columnas del diálogo, y no más: OCM no tiene el contexto de
 * parcialidad por línea que bordado y reflejante sí traen
 * (`cantidad_pedido`/`cantidad_asignada`/`cantidad_pendiente` no existen en este
 * contrato), así que "Cantidad" es la única cifra por renglón. Tampoco hay
 * popover de configuración: `configuracion` se tipa `unknown` porque es un
 * `JSONField` de forma libre que nadie ha fijado, y pintar una forma que el
 * backend no garantiza es justo el defecto que ese `unknown` previene.
 */
const LineasTable = ({ items }: { items: CorteMangaOrderLine[] }) => {
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
            <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {items.map((linea) => (
            <tr
              key={linea.id}
              className="border-t border-slate-100 dark:border-white/10 align-top hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {textOrDash(linea.producto_nombre)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                {textOrDash(linea.talla_nombre)}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {textOrDash(linea.color_nombre)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                {formatQuantityValue(linea.cantidad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

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
 * Notablemente más corto que sus equivalentes de bordado y reflejante, y a
 * propósito: el contrato de OCM no expone cobertura sobre el pedido, ni las
 * órdenes hermanas, ni el aviso de reparto por talla aproximado. No se inventan
 * secciones para datos que el backend no manda.
 */
export function CorteMangaOrderPageContent({
  orderId,
}: CorteMangaOrderPageContentProps) {
  const numericId = Number(orderId);
  const { data, isLoading, isError, error } = useCorteMangaOrderDetail(numericId);

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
                {data.folio_ocm || `Orden #${data.id}`}
              </h1>
              {/* SOLO LECTURA: `estatus_corte` es `read_only` en el serializer
                  y no existe `PUT`/`PATCH` (405), así que el badge informa y no
                  ofrece transición. Config propia de OCM: el `3` aquí es
                  "Cortando" (reflejante: "Aplicando"; bordado: "Bordando"). */}
              <StatusBadge
                status={String(data.estatus_corte)}
                config={CORTE_MANGA_ORDER_STATUS_CONFIG}
              />
              <StatusBadge
                status={String(data.prioridad)}
                config={CORTE_MANGA_ORDER_PRIORITY_CONFIG}
                defaultConfig={corteMangaOrderPriorityFallback(data.prioridad)}
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pedido {textOrDash(data.pedido_folio)}
            </p>
          </div>
          {/* Sin badge de cobertura, a diferencia de bordado y reflejante: OCM
              no publica los campos que lo alimentan. */}
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
            <InfoField label="Total piezas">
              <span className="tabular-nums font-semibold">
                {formatQuantityValue(sumarPiezas(data.detalles))}
              </span>
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
                  el pedido madre existe. Sin él queda el folio como texto — y
                  aquí el campo es OPCIONAL, así que esa rama no es teórica (ver
                  la nota del tipo). `/orders/[id]` es la ruta NEUTRA del detalle
                  360° (solo exige auth + workspace), y `?from=corte-manga` hace
                  que su "Volver" regrese al listado de este módulo en vez de a
                  Mesa de Control, que un usuario solo-Producción no puede
                  abrir. */}
              {data.pedido_vinculado ? (
                <Link
                  href={`/orders/${data.pedido_vinculado.id}?from=corte-manga`}
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
                status={String(data.estatus_corte)}
                config={CORTE_MANGA_ORDER_STATUS_CONFIG}
              />
            </InfoField>
            <InfoField label="Prioridad">
              <StatusBadge
                status={String(data.prioridad)}
                config={CORTE_MANGA_ORDER_PRIORITY_CONFIG}
                defaultConfig={corteMangaOrderPriorityFallback(data.prioridad)}
              />
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
              {textOrDash(data.observaciones)}
            </InfoField>
          </InfoGrid>
        </Section>

        {/* ── 3. Origen ─────────────────────────────────────────────────── */}
        {/* Empresa / sucursal / usuario con el NOMBRE ya resuelto que el
            backend devuelve (`*_nombre`); los ids crudos no se pintan porque no
            le dicen nada al usuario. `usuario_nombre` llega `null` solo en las
            filas históricas de la generación automática desde ventas, que no
            asignaba operador. */}
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

      {/* ── 4. Artículos de la orden ────────────────────────────────────── */}
      <Section title={`Artículos de la orden (${data.detalles.length})`}>
        {/* El desglose NO es el del pedido completo: el backend solo itemiza las
            líneas que ESTA orden toca. A diferencia de bordado y reflejante,
            aquí no hay bloque de cobertura con el que contrastarlo, así que
            decirlo es la única salvaguarda contra leer esta tabla como el total
            contratado por el pedido. */}
        <p className="-mt-2 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
          Solo se muestran los artículos que cubre esta orden. Si el pedido tiene otras
          prendas por cortar, no se listan aquí.
        </p>
        <LineasTable items={data.detalles} />
      </Section>
    </div>
  );
}

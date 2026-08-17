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
  formatMoneyValueOrDash,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import { formatLocalDate, formatShortDate } from "@/src/utils/formatDate";
import { RECEIPT_STATUS_CONFIG } from "@/src/features/receipts/constants/receiptStatus";
import { purchaseOrderStatusEntry } from "../constants/purchaseOrderStatus";
import { canSeeAmounts, formatIvaPercent } from "../utils/purchaseOrderFinance";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import type {
  DocumentoLigado,
  PurchaseOrderDetalle,
  PurchaseOrderReceipt,
} from "../interfaces/purchase-order.interface";

// Destino del "Volver". Fijo —sin el mapa `?from=` de `PedidoDetailContent`—
// porque esta ruta NO es neutra: cuelga de `/procurement`, exige `R-COMPRAS` y
// hoy solo se alcanza desde el listado del propio módulo, así que un mapa de
// orígenes tendría una sola entrada idéntica a su default. La flecha la pinta
// el icono del enlace, por eso el label no la lleva.
const BACK = {
  href: "/procurement/purchase-orders",
  label: "Volver a Órdenes de Compra",
};

// ── Visibilidad de importes ──────────────────────────────────────────────────
// `canSeeAmounts` (cabecera) y `formatIvaPercent` viven en
// `../utils/purchaseOrderFinance` porque los comparte el DIÁLOGO de detalle.

/**
 * ¿Los RENGLONES traen importes? Se evalúa aparte de `canSeeAmounts`: el filtro
 * del backend actúa sobre la cabecera y sobre el detalle por separado, así que
 * no se asume que uno implique el otro. `some` y no `detalles[0]`: un renglón
 * suelto sin precio no debe esconder la columna para todos los demás.
 */
const hasLineAmounts = (detalles: PurchaseOrderDetalle[]): boolean =>
  detalles.some((linea) => linea.precio !== undefined);

// ── Artículos de la orden ────────────────────────────────────────────────────

/**
 * Renglones de la orden.
 *
 * Es una tabla propia y NO `LineItemsTable` (el chrome que usa el diálogo): ese
 * contenedor acota el alto a `max-h-72` con scroll interno, que es lo correcto
 * dentro de un diálogo y lo contrario de lo que quiere una página — aquí los
 * renglones se leen de corrido.
 *
 * Las tres columnas de dinero (Precio, Descuento, Importe) se OMITEN por
 * completo cuando el detalle no las trae, en vez de pintar una columna de
 * guiones: el usuario sin visibilidad financiera no está viendo un dato vacío,
 * es que ese dato no es suyo.
 */
const LineasTable = ({
  detalles,
  monedaCodigo,
}: {
  detalles: PurchaseOrderDetalle[];
  monedaCodigo: string;
}) => {
  if (detalles.length === 0) {
    return <EmptyLines>Esta orden no tiene artículos registrados.</EmptyLines>;
  }

  const showAmounts = hasLineAmounts(detalles);
  const money = (value: string | undefined) =>
    formatMoneyValueOrDash(value, { currency: monedaCodigo });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 dark:bg-white/5">
          <tr className="text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 text-right font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Producto</th>
            <th className="px-3 py-2 text-left font-semibold">Descripción</th>
            <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
            <th className="px-3 py-2 text-right font-semibold">Piezas</th>
            {showAmounts && (
              <>
                <th className="px-3 py-2 text-right font-semibold">Precio</th>
                <th className="px-3 py-2 text-right font-semibold">Descuento</th>
                <th className="px-3 py-2 text-right font-semibold">Importe</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {detalles.map((linea, index) => (
            <tr
              key={linea.id}
              className="border-t border-slate-100 dark:border-white/10 align-top hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 text-right tabular-nums text-slate-400 dark:text-slate-500">
                {index + 1}
              </td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {textOrDash(linea.producto_nombre)}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {textOrDash(linea.descripcion)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {formatQuantityValue(linea.cantidad)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {formatQuantityValue(linea.piezas)}
              </td>
              {showAmounts && (
                <>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {money(linea.precio)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {money(linea.descuento)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                    {money(linea.importe)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Recepciones asociadas ────────────────────────────────────────────────────

/**
 * Resumen de UNA recepción generada contra la orden.
 *
 * Es un RESUMEN, no el detalle completo de la recepción: para eso está el
 * módulo de recepciones. `ubicacion_nombre` de los renglones no se pinta —
 * `ReceiptDetailLine` lo tipa como el literal `null` a propósito, porque el
 * backend nunca lo resuelve—.
 */
const RecepcionCard = ({
  recepcion,
  proveedorOrden,
}: {
  recepcion: PurchaseOrderReceipt;
  /**
   * Proveedor de la OC: sirve para no repetirlo cuando coincide. `null` cuando
   * la orden no tiene proveedor —en ese caso `proveedorDistinto` solo depende
   * de que la recepción sí lo traiga.
   */
  proveedorOrden: string | null;
}) => {
  // Referencias documentales opcionales del proveedor.
  const referencias = [
    recepcion.remision ? `Remisión: ${recepcion.remision}` : null,
    recepcion.factura_referencia ? `Factura: ${recepcion.factura_referencia}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  // Solo se muestra el proveedor cuando difiere del de la orden: repetirlo en
  // cada tarjeta es ruido, y una discrepancia sí merece verse.
  const proveedorDistinto =
    recepcion.proveedor_nombre && recepcion.proveedor_nombre !== proveedorOrden;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-semibold text-slate-800 dark:text-white">
            {textOrDash(recepcion.folio)}
          </span>
          <StatusBadge
            status={recepcion.estatus_label}
            config={RECEIPT_STATUS_CONFIG}
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
          {formatShortDate(recepcion.fecha_recepcion)}
        </span>
      </div>

      <InfoGrid>
        <InfoField label="Sucursal">{textOrDash(recepcion.sucursal_nombre)}</InfoField>
        <InfoField label="Almacén">{textOrDash(recepcion.almacen_nombre)}</InfoField>
        {proveedorDistinto && (
          <InfoField label="Proveedor">
            {textOrDash(recepcion.proveedor_nombre)}
          </InfoField>
        )}
      </InfoGrid>

      {referencias && (
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          {referencias}
        </p>
      )}

      {recepcion.detalles.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100 dark:border-white/10">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 dark:bg-white/5">
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="px-3 py-1.5 text-left font-semibold">Producto</th>
                <th className="px-3 py-1.5 text-left font-semibold">Lote / Serie</th>
                <th className="px-3 py-1.5 text-right font-semibold">Recibido</th>
              </tr>
            </thead>
            <tbody>
              {recepcion.detalles.map((linea) => (
                <tr
                  key={linea.id}
                  className="border-t border-slate-100 dark:border-white/10"
                >
                  <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">
                    {textOrDash(linea.producto_nombre)}
                  </td>
                  <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">
                    {textOrDash(
                      [linea.lote, linea.serie].filter(Boolean).join(" / "),
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                    {formatQuantityValue(linea.cantidad_recibida)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Documentos relacionados ──────────────────────────────────────────────────

/**
 * Timestamp para ordenar (desc, más reciente primero). `null` cuando el
 * documento no trae fecha real: esos van al fondo. Mismo criterio que
 * `docSortTime` en `PedidoDetailContent`.
 */
const docSortTime = (doc: DocumentoLigado): number | null => {
  if (!doc.fecha) return null;
  const time = new Date(doc.fecha).getTime();
  return Number.isNaN(time) ? null : time;
};

/**
 * Documentos ligados a la orden.
 *
 * A diferencia de "Documentos relacionados" del detalle de pedido, aquí las
 * filas NO son clicables: ese registro (`CLICKABLE_DOC_TIPOS`) mapea los tipos
 * del grafo del PEDIDO, que es distinto del de la OC —`solicitud_compra` y
 * `factura_proveedor` ni siquiera tienen diálogo de detalle hoy—. Se resolverá
 * cuando exista a dónde navegar, en vez de dejar la mitad de las filas
 * clicables y la otra mitad no.
 */
const DocumentosTable = ({ documentos }: { documentos: DocumentoLigado[] }) => {
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
          {ordenados.map((doc) => (
            <tr
              key={`${doc.tipo}-${doc.id}`}
              className="border-t border-slate-100 dark:border-white/10 align-top"
            >
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {textOrDash(doc.label)}
              </td>
              <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {textOrDash(doc.folio)}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {/* `formatLocalDate` y NO `formatShortDate`: `doc.fecha` puede
                    ser una fecha-calendario ("2026-08-17", p. ej. la
                    `fecha_emision` de una factura), y `formatShortDate` la
                    parsea como medianoche UTC → un día antes en husos negativos.
                    `formatLocalDate` respeta ambas formas (date-only e ISO). */}
                {formatLocalDate(doc.fecha)}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {textOrDash(doc.estatus)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────

interface PurchaseOrderPageContentProps {
  /** Id de la orden tal cual llega del segmento de ruta (string). */
  orderId: string;
}

/**
 * Cuerpo de la PÁGINA de detalle de una orden de compra.
 *
 * NO confundir con `PurchaseOrderDetailDialog`, que es el DIÁLOGO: aquel se
 * abre por id desde "Documentos relacionados" del detalle de pedido y vive
 * dentro de un `MainDialog`; este se pinta a página completa, con secciones y
 * su propio "Volver". Ambos consumen el mismo `usePurchaseOrder` y coexisten
 * sin tocarse.
 *
 * Vista de SOLO LECTURA: las acciones de la orden (editar, confirmar, cancelar,
 * enviar correo, descargar PDF) siguen viviendo en el menú del listado, que es
 * donde el usuario ya las conoce.
 */
export function PurchaseOrderPageContent({
  orderId,
}: PurchaseOrderPageContentProps) {
  const numericId = Number(orderId);
  // `Number.isInteger` acota antes de consultar: el segmento de ruta es texto
  // libre, así que "1.5" o "abc" no deben llegar al backend como id.
  const isValidId = Number.isInteger(numericId) && numericId > 0;
  const { purchaseOrder, isLoading, isError, error } = usePurchaseOrder(
    numericId,
    isValidId,
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
  if (!isValidId) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Orden no válida"
          message="El identificador de la orden de compra no es válido."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader
          title="Cargando orden de compra"
          message="Obteniendo el detalle de la orden..."
        />
      </div>
    );
  }

  // El caso "no existe o no tienes acceso" llega por aquí: el backend responde
  // 404 y no 403, porque su queryset acotado por tenant no distingue un id
  // ajeno de uno inexistente.
  if (isError || !purchaseOrder) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="No se pudo cargar la orden de compra"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a ella o falló la conexión.",
          )}
        />
      </div>
    );
  }

  const data = purchaseOrder;
  const showAmounts = canSeeAmounts(data);
  const money = (value: string | undefined) =>
    formatMoneyValueOrDash(value, { currency: data.moneda_codigo });

  return (
    <div className="w-full space-y-6">
      {/* ── Barra superior con "Volver" ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 py-2 w-fit">{BackLink}</div>

      {/* ── 1. Cabecera ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* El folio lo asigna el backend al crear; el respaldo cubre las
                  órdenes en borrador, que aún no lo tienen. */}
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {data.folio || `Orden #${data.id}`}
              </h1>
              <StatusBadge
                status={String(data.estatus)}
                config={{
                  [data.estatus]: purchaseOrderStatusEntry(
                    data.estatus,
                    data.estatus_label,
                  ),
                }}
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {textOrDash(data.proveedor_nombre)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs shrink-0">
            <InfoField label="Fecha OC">
              <span className="tabular-nums">{formatLocalDate(data.fecha_oc)}</span>
            </InfoField>
            <InfoField label="Entrega estimada">
              <span className="tabular-nums">
                {formatLocalDate(data.fecha_entrega_estimada)}
              </span>
            </InfoField>
            {/* `total_piezas` NO es un campo financiero: llega siempre, sin
                importar el rol, así que se pinta fuera de cualquier condición. */}
            <InfoField label="Total piezas">
              <span className="tabular-nums font-semibold">
                {formatQuantityValue(data.total_piezas)}
              </span>
            </InfoField>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 2. Información general ────────────────────────────────────── */}
        {/* Sin campo "Estatus": el badge ya está junto al folio de la cabecera
            y repetirlo en la misma pantalla no aporta. Mismo criterio que
            `PedidoDetailContent`. */}
        <Section title="Información general">
          <InfoGrid>
            <InfoField label="Proveedor">
              {textOrDash(data.proveedor_nombre)}
            </InfoField>
            {/* `break-all` y no el corte por palabra por defecto: un correo no
                tiene espacios donde partir, así que en pantalla angosta se
                desbordaba de su columna o rompía en un punto arbitrario del
                dominio. */}
            <InfoField label="Correo del proveedor">
              <span className="break-all">{textOrDash(data.proveedor_correo)}</span>
            </InfoField>
            <InfoField label="Tipo">{textOrDash(data.tipo)}</InfoField>
            <InfoField label="Referencia">{textOrDash(data.referencia)}</InfoField>
            <InfoField label="Pedido">
              {/* Se navega por `pedido_vinculado`, no por el par plano
                  `pedido`/`pedido_folio`: su presencia es la única señal de que
                  el pedido madre existe (la OC de abasto directo no tiene).
                  `/orders/[id]` es la ruta NEUTRA del detalle 360° (solo exige
                  auth + workspace), y `?from=purchase-orders` hace que su
                  "Volver" regrese a este módulo en vez de a Mesa de Control,
                  que un usuario solo-Compras no puede abrir. */}
              {data.pedido_vinculado ? (
                <Link
                  href={`/orders/${data.pedido_vinculado.id}?from=purchase-orders`}
                  className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                >
                  {data.pedido_vinculado.folio}
                </Link>
              ) : (
                <span className="font-mono">{textOrDash(data.pedido_folio)}</span>
              )}
            </InfoField>
            <InfoField label="Observaciones" className="col-span-2 md:col-span-3">
              {textOrDash(data.observaciones)}
            </InfoField>
          </InfoGrid>
        </Section>

        {/* ── 3. Origen ─────────────────────────────────────────────────── */}
        {/* Empresa / sucursal / usuario con el NOMBRE ya resuelto que el
            backend devuelve (`*_nombre`); los ids crudos no se pintan porque no
            le dicen nada al usuario. */}
        <Section title="Origen">
          <InfoGrid>
            <InfoField label="Empresa">{textOrDash(data.empresa_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
            <InfoField label="Elaboró">{textOrDash(data.usuario_nombre)}</InfoField>
            {/* La moneda contextualiza TODOS los importes de la página, así que
                se muestra aunque los importes en sí no sean visibles. */}
            <InfoField label="Moneda">{textOrDash(data.moneda_codigo)}</InfoField>
            <InfoField label="Fecha de autorización">
              <span className="tabular-nums">
                {formatLocalDate(data.fecha_autorizacion)}
              </span>
            </InfoField>
            <InfoField label="Fecha de vencimiento">
              <span className="tabular-nums">
                {formatLocalDate(data.fecha_vencimiento)}
              </span>
            </InfoField>
          </InfoGrid>
        </Section>
      </div>

      {/* ── 4. Resumen financiero ───────────────────────────────────────── */}
      {/* La sección ENTERA se omite cuando el rol no tiene visibilidad
          financiera: pintarla llena de guiones sugeriría una orden sin
          importes, que es una lectura distinta (y falsa). */}
      {showAmounts && (
        <Section title="Resumen financiero">
          <InfoGrid>
            <InfoField label="Subtotal">
              <span className="tabular-nums">{money(data.subtotal)}</span>
            </InfoField>
            <InfoField label="Descuento">
              <span className="tabular-nums">{money(data.descuento)}</span>
            </InfoField>
            <InfoField
              label={
                data.porcentaje_iva !== undefined
                  ? `Impuestos (IVA ${formatIvaPercent(data.porcentaje_iva)}%)`
                  : "Impuestos"
              }
            >
              <span className="tabular-nums">
                {/* `total_iva` es el desglose del IVA; `impuestos` es el total
                    de impuestos de la orden. Se prefiere el segundo y se cae al
                    primero cuando el backend solo manda ese. */}
                {money(data.impuestos ?? data.total_iva)}
              </span>
            </InfoField>
            <InfoField label="Flete">
              <span className="tabular-nums">{money(data.flete)}</span>
            </InfoField>
            <InfoField label="Seguros">
              <span className="tabular-nums">{money(data.seguros)}</span>
            </InfoField>
            <InfoField label="A cuenta">
              <span className="tabular-nums">{money(data.a_cuenta)}</span>
            </InfoField>
            <InfoField label="Total">
              <span className="tabular-nums">{money(data.total)}</span>
            </InfoField>
            <InfoField label="Gran total">
              <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                {money(data.gran_total)}
              </span>
            </InfoField>
          </InfoGrid>
        </Section>
      )}

      {/* ── 5. Artículos ────────────────────────────────────────────────── */}
      <Section title={`Artículos (${data.detalles.length})`}>
        <LineasTable detalles={data.detalles} monedaCodigo={data.moneda_codigo} />
        {data.detalles.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            {data.detalles.length === 1
              ? "Se muestra 1 artículo de esta orden."
              : `Se muestran ${data.detalles.length} artículos de esta orden.`}
          </p>
        )}
      </Section>

      {/* ── 6. Recepciones asociadas ────────────────────────────────────── */}
      {data.recepciones.length > 0 && (
        <Section title={`Recepciones asociadas (${data.recepciones.length})`}>
          {/* Con pocas recepciones se leen de corrido; a partir de cuatro se
              acota el alto para que la sección no empuje el resto de la página
              fuera de pantalla. */}
          <div
            className={
              data.recepciones.length > 3
                ? "space-y-3 max-h-[32rem] overflow-y-auto pr-1"
                : "space-y-3"
            }
          >
            {data.recepciones.map((recepcion) => (
              <RecepcionCard
                key={recepcion.id}
                recepcion={recepcion}
                proveedorOrden={data.proveedor_nombre}
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── 7. Documentos relacionados ──────────────────────────────────── */}
      {data.documentos.length > 0 && (
        <Section title={`Documentos relacionados (${data.documentos.length})`}>
          <DocumentosTable documentos={data.documentos} />
        </Section>
      )}
    </div>
  );
}

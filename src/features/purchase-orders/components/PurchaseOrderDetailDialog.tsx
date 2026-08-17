"use client";

import { useState } from "react";
import { ChevronRightIcon, ComprasIcon, RecepcionesIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import { PurchaseOrderReceiptDetailDialog } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptDetailDialog";
import { RECEIPT_STATUS_CONFIG } from "@/src/features/receipts/constants/receiptStatus";
import {
  formatMoneyValueOrDash,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { purchaseOrderStatusEntry } from "../constants/purchaseOrderStatus";
import { canSeeAmounts, formatIvaPercent } from "../utils/purchaseOrderFinance";
import type {
  DocumentoLigado,
  PurchaseOrderDetalle,
  PurchaseOrderReceipt,
} from "../interfaces/purchase-order.interface";

// ── Chrome de las rejillas ────────────────────────────────────────────────────
// Clases propias del diálogo y NO el `InfoGrid` de `DetailDialogPrimitives`: ese
// usa `md:grid-cols-3` (768px) y este diálogo mide 760px, así que el breakpoint
// nunca dispararía y las rejillas se quedarían en 2 columnas. `sm:` (640px) sí
// aplica. Mismo criterio que `CorteMangaOrderDetailDialog`, que también define
// su rejilla en vez de importarla.
const INFO_BOX =
  "grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs";
const MONEY_BOX =
  "grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs";

// ── Visibilidad de importes ───────────────────────────────────────────────────
// `canSeeAmounts` (cabecera) y `formatIvaPercent` viven en
// `../utils/purchaseOrderFinance` porque los comparte la PÁGINA de detalle.

/** ¿Los RENGLONES traen importes? Se evalúa aparte: el filtro del backend actúa
 *  sobre la cabecera y sobre el detalle por separado. */
const hasLineAmounts = (detalles: PurchaseOrderDetalle[]): boolean =>
  detalles.some((linea) => linea.precio !== undefined);

// ── Sub-componentes ────────────────────────────────────────────────────────────

/** Badge de estatus de la orden, con el `<StatusBadge>` compartido. */
const EstatusBadge = ({ estatus, label }: { estatus: number; label: string }) => (
  <StatusBadge
    status={String(estatus)}
    config={{ [estatus]: purchaseOrderStatusEntry(estatus, label) }}
  />
);

/**
 * Renglones de producto.
 *
 * Usa `LineItemsTable` de las primitivas —cuyo `max-h-72` con scroll interno es
 * justo lo que quiere un diálogo—, a diferencia de la PÁGINA de detalle, que
 * monta una tabla propia porque ahí los renglones deben leerse de corrido.
 *
 * Las tres columnas de dinero se OMITEN cuando el detalle no las trae, en vez
 * de pintar una columna de guiones.
 */
const DetalleTable = ({
  detalles,
  monedaCodigo,
}: {
  detalles: PurchaseOrderDetalle[];
  monedaCodigo: string;
}) => {
  if (detalles.length === 0) {
    return <EmptyLines>Esta orden no tiene productos registrados.</EmptyLines>;
  }

  const showAmounts = hasLineAmounts(detalles);
  const money = (value: string | undefined) =>
    formatMoneyValueOrDash(value, { currency: monedaCodigo });

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Producto</th>
          <th className="px-3 py-2 font-medium">Descripción</th>
          <th className="px-3 py-2 font-medium text-right">Cantidad</th>
          <th className="px-3 py-2 font-medium text-right">Piezas</th>
          {showAmounts && (
            <>
              <th className="px-3 py-2 font-medium text-right">Precio</th>
              <th className="px-3 py-2 font-medium text-right">Descuento</th>
              <th className="px-3 py-2 font-medium text-right">Importe</th>
            </>
          )}
        </>
      }
    >
      {detalles.map((item) => (
        <tr
          key={item.id}
          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {textOrDash(item.producto_nombre)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {textOrDash(item.descripcion)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatQuantityValue(item.cantidad)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatQuantityValue(item.piezas)}
          </td>
          {showAmounts && (
            <>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {money(item.precio)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {money(item.descuento)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {money(item.importe)}
              </td>
            </>
          )}
        </tr>
      ))}
    </LineItemsTable>
  );
};

/** Tarjeta compacta de una recepción asociada a la orden */
const RecepcionCard = ({
  recepcion,
  onView,
}: {
  recepcion: PurchaseOrderReceipt;
  onView: (id: number) => void;
}) => {
  // Detalle secundario opcional: remisión y/o factura de referencia.
  const extra = [
    recepcion.remision ? `Remisión: ${recepcion.remision}` : null,
    recepcion.factura_referencia
      ? `Factura: ${recepcion.factura_referencia}`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <button
      type="button"
      onClick={() => onView(recepcion.id)}
      className="group w-full text-left rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3 transition-colors cursor-pointer hover:border-sky-200 hover:bg-slate-50 dark:hover:border-sky-500/40 dark:hover:bg-white/5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <RecepcionesIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold text-slate-800 dark:text-white">
              {recepcion.folio}
            </span>
            <StatusBadge status={recepcion.estatus_label} config={RECEIPT_STATUS_CONFIG} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recibido el {formatLocalDate(recepcion.fecha_recepcion)}
            <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            Almacén: {recepcion.almacen_nombre}
          </p>
          {extra && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{extra}</p>
          )}
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-400">
          <span className="hidden sm:inline">Ver detalles</span>
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
};

/** Sección "Recepciones": lista las recepciones asociadas a la orden. */
const RecepcionesSection = ({
  recepciones,
  onViewReceipt,
}: {
  recepciones: PurchaseOrderReceipt[];
  onViewReceipt: (id: number) => void;
}) => (
  <div>
    <SectionTitle>
      Recepciones{recepciones.length > 0 && ` (${recepciones.length})`}
    </SectionTitle>
    {recepciones.length === 0 ? (
      <EmptyLines>Aún no se han registrado recepciones para esta orden.</EmptyLines>
    ) : (
      <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
        {recepciones.map((recepcion) => (
          <RecepcionCard
            key={recepcion.id}
            recepcion={recepcion}
            onView={onViewReceipt}
          />
        ))}
      </div>
    )}
  </div>
);

/**
 * Timestamp para ordenar (desc, más reciente primero); `null` al fondo.
 * Mismo criterio que la página de detalle y que `PedidoDetailContent`.
 */
const docSortTime = (doc: DocumentoLigado): number | null => {
  if (!doc.fecha) return null;
  const time = new Date(doc.fecha).getTime();
  return Number.isNaN(time) ? null : time;
};

/**
 * Documentos ligados a la orden. Filas NO clicables, igual que en la página:
 * el registro `CLICKABLE_DOC_TIPOS` mapea los tipos del grafo del PEDIDO, que
 * es otro. Y este diálogo, además, ES uno de esos consumidores — abrir otro
 * diálogo desde aquí encadenaría modales sobre modales.
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
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Tipo</th>
          <th className="px-3 py-2 font-medium">Folio</th>
          <th className="px-3 py-2 font-medium">Fecha</th>
          <th className="px-3 py-2 font-medium">Estatus</th>
        </>
      }
    >
      {ordenados.map((doc) => (
        <tr key={`${doc.tipo}-${doc.id}`} className="align-top">
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {textOrDash(doc.label)}
          </td>
          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {textOrDash(doc.folio)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {/* `formatLocalDate` y NO `formatShortDate`: `doc.fecha` puede ser
                una fecha-calendario ("2026-08-17"), que `formatShortDate`
                parsea como medianoche UTC → un día antes en husos negativos. */}
            {formatLocalDate(doc.fecha)}
          </td>
          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
            {textOrDash(doc.estatus)}
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

// ── Componente principal del diálogo ──────────────────────────────────────────

interface PurchaseOrderDetailDialogProps {
  /** ID de la orden a consultar. `null` mantiene la consulta deshabilitada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de detalle de una orden de compra, self-fetching por id.
 *
 * Convive con `PurchaseOrderPageContent` (la PÁGINA de detalle,
 * `/procurement/purchase-orders/[id]`), que es la vista principal desde el
 * listado. Este diálogo sigue vivo porque es el consumidor del tipo
 * `orden_compra` en el registro `CLICKABLE_DOC_TIPOS` del detalle 360° de
 * pedido, donde navegar fuera de la página rompería el flujo.
 *
 * Cubre los mismos DATOS que la página, en formato de diálogo: rejillas
 * compactas en vez de tarjetas `Section`, `LineItemsTable` con scroll interno
 * en vez de tabla a lo largo, y sin enlaces de navegación (es un modal).
 */
export function PurchaseOrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: PurchaseOrderDetailDialogProps) {
  // Solo se dispara la petición cuando el diálogo está abierto.
  const { purchaseOrder, isLoading, isError, error } = usePurchaseOrder(orderId, open);

  // Recepción cuyo detalle se está consultando. `null` mantiene deshabilitada la
  // consulta del diálogo anidado (misma convención centinela que `useReceiptDetail`).
  const [viewingReceiptId, setViewingReceiptId] = useState<number | null>(null);

  // `folio` es nullable mientras el backend no lo asigna; sin respaldo el
  // subtítulo del diálogo quedaba en blanco. Mismo patrón que la página.
  const folioLabel = purchaseOrder
    ? purchaseOrder.folio ?? `Orden #${purchaseOrder.id}`
    : "Cargando…";

  const showAmounts = purchaseOrder ? canSeeAmounts(purchaseOrder) : false;
  const money = (value: string | undefined) =>
    formatMoneyValueOrDash(value, {
      // Solo se invoca dentro del bloque con `purchaseOrder` ya resuelto; el
      // respaldo está porque un `currency: undefined` ANULARÍA el default de
      // `formatCurrency` al hacer spread, dejando los importes sin símbolo.
      currency: purchaseOrder?.moneda_codigo ?? "MXN",
    });

  return (
    <>
      <MainDialog
        open={open}
        onOpenChange={onOpenChange}
        maxWidth="760px"
        showCloseButton={true}
        title={
          <div className="flex items-center gap-2.5 pr-8">
            <ComprasIcon className="w-5 h-5 text-sky-500 shrink-0" />
            <div>
              <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
                Detalle de Orden de Compra
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
                {folioLabel}
              </p>
            </div>
          </div>
        }
      >
        {/* ── Estado: cargando ──────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
            <span className="ml-3 text-sm text-slate-500">
              Cargando detalle de la orden...
            </span>
          </div>
        )}

        {/* ── Estado: error ─────────────────────────────────────────────────── */}
        {isError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Error al cargar el detalle de la orden
            </p>
            <p className="text-xs text-red-500 dark:text-red-300 mt-1">
              {(error as Error)?.message ?? "Intenta nuevamente más tarde."}
            </p>
          </div>
        )}

        {/* ── Estado: datos cargados ────────────────────────────────────────── */}
        {!isLoading && !isError && purchaseOrder && (
          <div className="space-y-5">
            {/* Información general de la orden */}
            <div className={INFO_BOX}>
              <InfoField label="Folio">
                <span className="font-mono">{folioLabel}</span>
              </InfoField>
              <InfoField label="Estatus">
                <EstatusBadge
                  estatus={purchaseOrder.estatus}
                  label={purchaseOrder.estatus_label}
                />
              </InfoField>
              <InfoField label="Tipo">{textOrDash(purchaseOrder.tipo)}</InfoField>
              <InfoField label="Proveedor">
                {textOrDash(purchaseOrder.proveedor_nombre)}
              </InfoField>
              <InfoField label="Correo del proveedor">
                <span className="break-all">
                  {textOrDash(purchaseOrder.proveedor_correo)}
                </span>
              </InfoField>
              <InfoField label="Referencia">
                {textOrDash(purchaseOrder.referencia)}
              </InfoField>
              {/* Pedido como TEXTO y no como enlace: esto es un modal, navegar
                  fuera cerraría el contexto desde el que se abrió (a menudo el
                  propio detalle 360° del pedido al que apuntaría). */}
              <InfoField label="Pedido">
                <span className="font-mono">
                  {textOrDash(
                    purchaseOrder.pedido_vinculado?.folio ?? purchaseOrder.pedido_folio,
                  )}
                </span>
              </InfoField>
              <InfoField label="Fecha OC">
                {formatLocalDate(purchaseOrder.fecha_oc)}
              </InfoField>
              <InfoField label="Entrega estimada">
                {formatLocalDate(purchaseOrder.fecha_entrega_estimada)}
              </InfoField>
              <InfoField label="Fecha autorización">
                {formatLocalDate(purchaseOrder.fecha_autorizacion)}
              </InfoField>
              <InfoField label="Fecha vencimiento">
                {formatLocalDate(purchaseOrder.fecha_vencimiento)}
              </InfoField>
              {/* `total_piezas` NO es un campo financiero: llega siempre, sin
                  importar el rol, así que vive aquí y no en el bloque de
                  importes —que puede no renderizarse—. */}
              <InfoField label="Total piezas">
                <span className="tabular-nums font-semibold">
                  {formatQuantityValue(purchaseOrder.total_piezas)}
                </span>
              </InfoField>
              {purchaseOrder.observaciones?.trim() && (
                <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
                  <span className="leading-snug text-slate-600 dark:text-slate-300">
                    {purchaseOrder.observaciones}
                  </span>
                </InfoField>
              )}
            </div>

            {/* Origen — nombres ya resueltos por el backend (`*_nombre`); los
                ids crudos no se pintan porque no le dicen nada al usuario. */}
            <div>
              <SectionTitle>Origen</SectionTitle>
              <div className={INFO_BOX}>
                <InfoField label="Empresa">
                  {textOrDash(purchaseOrder.empresa_nombre)}
                </InfoField>
                <InfoField label="Sucursal">
                  {textOrDash(purchaseOrder.sucursal_nombre)}
                </InfoField>
                <InfoField label="Elaboró">
                  {textOrDash(purchaseOrder.usuario_nombre)}
                </InfoField>
                {/* La moneda contextualiza TODOS los importes, así que se
                    muestra aunque los importes en sí no sean visibles. */}
                <InfoField label="Moneda">
                  {textOrDash(purchaseOrder.moneda_codigo)}
                </InfoField>
              </div>
            </div>

            {/* Detalle de productos */}
            <div>
              <SectionTitle>Productos ({purchaseOrder.detalles.length})</SectionTitle>
              <DetalleTable
                detalles={purchaseOrder.detalles}
                monedaCodigo={purchaseOrder.moneda_codigo}
              />
            </div>

            {/* Resumen financiero — el bloque ENTERO se omite cuando el rol no
                tiene visibilidad financiera: pintarlo lleno de guiones
                sugeriría una orden sin importes, que es una lectura falsa. */}
            {showAmounts && (
              <div>
                <SectionTitle>Resumen financiero</SectionTitle>
                <div className={MONEY_BOX}>
                  <InfoField label="Subtotal">
                    <span className="tabular-nums">{money(purchaseOrder.subtotal)}</span>
                  </InfoField>
                  <InfoField label="Descuento">
                    <span className="tabular-nums">{money(purchaseOrder.descuento)}</span>
                  </InfoField>
                  <InfoField
                    label={
                      purchaseOrder.porcentaje_iva !== undefined
                        ? `Impuestos (IVA ${formatIvaPercent(purchaseOrder.porcentaje_iva)}%)`
                        : "Impuestos"
                    }
                  >
                    {/* `total_iva` como respaldo cuando el backend solo manda
                        el desglose del IVA y no el total de impuestos. */}
                    <span className="tabular-nums">
                      {money(purchaseOrder.impuestos ?? purchaseOrder.total_iva)}
                    </span>
                  </InfoField>
                  <InfoField label="Flete">
                    <span className="tabular-nums">{money(purchaseOrder.flete)}</span>
                  </InfoField>
                  <InfoField label="Seguros">
                    <span className="tabular-nums">{money(purchaseOrder.seguros)}</span>
                  </InfoField>
                  <InfoField label="A cuenta">
                    <span className="tabular-nums">{money(purchaseOrder.a_cuenta)}</span>
                  </InfoField>
                  <InfoField label="Total">
                    <span className="tabular-nums">{money(purchaseOrder.total)}</span>
                  </InfoField>
                  <InfoField label="Gran total">
                    <span className="tabular-nums text-sm font-semibold text-slate-800 dark:text-white">
                      {money(purchaseOrder.gran_total)}
                    </span>
                  </InfoField>
                </div>
              </div>
            )}

            {/* Recepciones asociadas */}
            <RecepcionesSection
              recepciones={purchaseOrder.recepciones}
              onViewReceipt={setViewingReceiptId}
            />

            {/* Documentos relacionados */}
            {purchaseOrder.documentos.length > 0 && (
              <div>
                <SectionTitle>
                  Documentos relacionados ({purchaseOrder.documentos.length})
                </SectionTitle>
                <DocumentosTable documentos={purchaseOrder.documentos} />
              </div>
            )}
          </div>
        )}
      </MainDialog>

      {/* Diálogo anidado: detalle de una recepción específica. Se reutiliza el
          diálogo especializado en OC (las recepciones embebidas en una orden de
          compra son siempre `tipo_origen: "OC"`), tal cual, sin modificarlo. */}
      <PurchaseOrderReceiptDetailDialog
        receiptId={viewingReceiptId}
        open={viewingReceiptId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setViewingReceiptId(null);
        }}
      />
    </>
  );
}

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { Button } from "@/src/components/Button";
import {
  DownloadIcon,
  ExportPdfIcon,
  FacturaProveedorIcon,
  UploadIcon,
} from "@/src/components/Icons";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { ocFolioLabel } from "../utils/supplierInvoiceLabels";
import { FACTURA_PROVEEDOR_ESTATUS_CONFIG } from "../constants/supplierInvoiceStatus";
import { MAX_SUPPLIER_INVOICE_PDF_LABEL } from "../constants/supplierInvoicePdf";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/**
 * Acciones del PDF del proveedor. Las POSEE la vista (`SupplierInvoiceList`):
 * el selector de archivo, la confirmación de reemplazo y las mutaciones son los
 * mismos que usa el menú de fila.
 */
export interface SupplierInvoicePdfActions {
  onAttach: () => void;
  onDownloadMerged: () => void;
  isUploading: boolean;
  isDownloading: boolean;
}

interface SupplierInvoiceDetailDialogProps {
  /**
   * La factura ya cargada por el listado — SIN fetch propio. `GET` de lista y de
   * detalle comparten el mismo `FacturaProveedorSerializer` (el ViewSet declara
   * un único `serializer_class`, sin `get_serializer_class`), con
   * `factura_proveedor_detalles` anidado en ambos. Es la fila VIVA: tras adjuntar
   * un PDF, el refetch del listado actualiza esta sección sin cerrar el diálogo.
   */
  factura: FacturaProveedor;
  pdfActions: SupplierInvoicePdfActions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Fecha-calendario "YYYY-MM-DD"; `timeZone: "UTC"` evita pintar el día anterior. */
const fecha = (value: string | null) =>
  value ? formatShortDate(value, { timeZone: "UTC" }) : "—";

/**
 * PDF de la factura del proveedor y el documento fusionado OC + RC + factura.
 * Disponible en cualquier estatus, igual que en el backend.
 */
function SupplierInvoicePdfSection({
  factura,
  actions,
}: {
  factura: FacturaProveedor;
  actions: SupplierInvoicePdfActions;
}) {
  const tienePdf = factura.tiene_pdf_adjunto;
  const nombre = factura.pdf_adjunto_nombre || "PDF adjunto";

  return (
    <div>
      <SectionTitle>PDF de la factura del proveedor</SectionTitle>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10">
        {tienePdf ? (
          <div className="flex items-center gap-2 min-w-0">
            <ExportPdfIcon className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
            <span
              className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"
              title={nombre}
            >
              {nombre}
            </span>
          </div>
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            Sin PDF adjunto. Adjunta el PDF del proveedor (máximo {MAX_SUPPLIER_INVOICE_PDF_LABEL})
            para descargar el documento OC + RC + factura.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            rounded="full"
            leftIcon={<UploadIcon className="w-4 h-4" aria-hidden="true" />}
            onClick={actions.onAttach}
            disabled={actions.isUploading}
          >
            {actions.isUploading
              ? "Subiendo PDF..."
              : tienePdf
                ? "Reemplazar PDF"
                : "Adjuntar PDF"}
          </Button>
          {tienePdf && (
            <Button
              type="button"
              variant="primary"
              rounded="full"
              leftIcon={<DownloadIcon className="w-4 h-4" aria-hidden="true" />}
              onClick={actions.onDownloadMerged}
              disabled={actions.isDownloading}
            >
              {actions.isDownloading ? "Generando documento..." : "Descargar OC + RC + factura"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Detalle de solo lectura de una factura de proveedor.
 *
 * La OC y la recepción se muestran por su folio (`oc_folio`, `recepcion_folio`,
 * EC-466); la OC enlaza a su detalle si el usuario puede abrirlo. Los renglones
 * siguen exponiendo solo ids (no hay `producto_nombre`) y, sin una consulta
 * extra —que este diálogo no hace—, se muestran como `#id`.
 */
export function SupplierInvoiceDetailDialog({
  factura,
  pdfActions,
  open,
  onOpenChange,
}: SupplierInvoiceDetailDialogProps) {
  const { data: session } = useSession();
  // Una sola URL de la OC: el enlace la usa tal cual y el permiso se evalúa sobre
  // su pathname (`canAccessRoute` va sin query, misma regla que el proxy). El
  // proveedor viaja para que el "Volver" regrese con él elegido; es el mismo que
  // filtra el listado, así que se toma de la factura.
  const ocHref = purchaseOrderDetailHref(factura.oc, "supplier-invoices", {
    proveedor: factura.proveedor,
  });
  const canOpenOc = canAccessRoute(ocHref.split("?")[0], session?.user);
  const moneda = factura.moneda_codigo ? { currency: factura.moneda_codigo } : undefined;
  const money = (value: string) => formatMoneyValueOrDash(value, moneda);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="960px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <FacturaProveedorIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de la Factura de Proveedor
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {factura.folio || `#${factura.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Proveedor">{textOrDash(factura.proveedor_nombre)}</InfoField>
          <InfoField label="Orden de compra">
            {canOpenOc ? (
              <Link
                href={ocHref}
                className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                title="Ver orden de compra"
              >
                {ocFolioLabel(factura)}
              </Link>
            ) : (
              <span className="font-mono">{ocFolioLabel(factura)}</span>
            )}
          </InfoField>
          {/* Sin enlace: no existe una ruta de detalle de recepción. */}
          <InfoField label="Recepción">
            <span className="font-mono">{factura.recepcion_folio}</span>
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge status={factura.estatus} config={FACTURA_PROVEEDOR_ESTATUS_CONFIG} />
          </InfoField>
          <InfoField label="Emisión">{fecha(factura.fecha_emision)}</InfoField>
          <InfoField label="Vencimiento">{fecha(factura.fecha_vencimiento)}</InfoField>
          <InfoField label="Moneda">{textOrDash(factura.moneda_codigo)}</InfoField>
          <InfoField label="Total">
            <span className="tabular-nums font-semibold">{money(factura.total)}</span>
          </InfoField>
          <InfoField label="Subtotal">
            <span className="tabular-nums">{money(factura.subtotal)}</span>
          </InfoField>
          <InfoField label="Descuento">
            <span className="tabular-nums">{money(factura.descuento)}</span>
          </InfoField>
          <InfoField label="Impuestos">
            <span className="tabular-nums">{money(factura.impuestos)}</span>
          </InfoField>
        </div>

        {/* Qué significa el estatus para la cuenta por pagar. */}
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {factura.estatus === "Registrada"
            ? "Factura registrada: generó su cuenta por pagar y sus importes, proveedor y moneda quedaron congelados."
            : factura.estatus === "Borrador"
              ? "Borrador: todavía no genera cuenta por pagar."
              : "Factura cancelada: no genera cuenta por pagar."}
        </p>

        <SupplierInvoicePdfSection factura={factura} actions={pdfActions} />

        {factura.observaciones && (
          <div>
            <SectionTitle>Observaciones</SectionTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {factura.observaciones}
            </p>
          </div>
        )}

        <div>
          <SectionTitle>Partidas</SectionTitle>
          {factura.factura_proveedor_detalles.length === 0 ? (
            <EmptyLines>Esta factura no tiene partidas.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Detalle OC / Recepción</th>
                  <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                  <th className="px-3 py-2 font-medium text-right">Precio</th>
                  <th className="px-3 py-2 font-medium text-right">Descuento</th>
                  <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                  <th className="px-3 py-2 font-medium text-right">Impuesto</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </>
              }
            >
              {factura.factura_proveedor_detalles.map((linea) => (
                <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {`#${linea.producto}`}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {`#${linea.oc_detalle} / #${linea.recepcion_detalle}`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {formatQuantityValue(linea.cantidad)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(linea.precio_unitario)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(linea.descuento)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(linea.subtotal)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {money(linea.impuesto)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {money(linea.total)}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </div>
      </div>
    </MainDialog>
  );
}

"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { FacturaProveedorIcon } from "@/src/components/Icons";
import { formatMoneyValueOrDash, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { FACTURA_PROVEEDOR_ESTATUS_CONFIG } from "../constants/supplierInvoiceStatus";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

interface SupplierInvoiceDetailDialogProps {
  /**
   * La factura ya cargada por el listado — SIN fetch propio. `GET` de lista y de
   * detalle comparten el mismo `FacturaProveedorSerializer` (el ViewSet declara
   * un único `serializer_class`, sin `get_serializer_class`), con
   * `factura_proveedor_detalles` anidado en ambos.
   */
  factura: FacturaProveedor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Fecha-calendario "YYYY-MM-DD"; `timeZone: "UTC"` evita pintar el día anterior. */
const fecha = (value: string | null) =>
  value ? formatShortDate(value, { timeZone: "UTC" }) : "—";

/**
 * Detalle de solo lectura de una factura de proveedor.
 *
 * LIMITACIÓN: el serializer solo expone ids para la OC, la recepción, el producto
 * y los detalles de cada renglón (no hay `oc_folio`, `recepcion_folio` ni
 * `producto_nombre`). Sin una consulta extra —que este diálogo no hace— se
 * muestran como `#id`.
 */
export function SupplierInvoiceDetailDialog({
  factura,
  open,
  onOpenChange,
}: SupplierInvoiceDetailDialogProps) {
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
          <InfoField label="Orden de compra">{`OC #${factura.oc}`}</InfoField>
          <InfoField label="Recepción">{`#${factura.recepcion}`}</InfoField>
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

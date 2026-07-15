"use client";

import { formatCurrency, formatQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
import type { CuentaPorCobrarFactura } from "../interfaces/accounts-receivable-detail.interface";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "./AccountsReceivableDetailPrimitives";

interface AccountsReceivableFacturaSectionProps {
  factura: CuentaPorCobrarFactura;
  /** Código de moneda de la cuenta (p. ej. "MXN"), para formatear sus importes. */
  monedaCodigo: string;
}

/**
 * Sección "Factura" del detalle de CxC: los datos de la factura anidada más sus
 * conceptos. Las columnas replican las de `InvoiceDetails` (la vista de detalle
 * del módulo de facturación), que rinde el mismo `InvoiceDetail`, para que un
 * concepto se lea igual en los dos módulos.
 */
export const AccountsReceivableFacturaSection = ({
  factura,
  monedaCodigo,
}: AccountsReceivableFacturaSectionProps) => {
  // El backend puede no hidratar los conceptos; nunca damos por hecho que hay
  // arreglo (`?? []`) ni que trae elementos (estado vacío explícito abajo).
  const conceptos = factura.factura_detalles ?? [];

  return (
    <div>
      <SectionTitle>Factura</SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 mb-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
        <InfoField label="Folio">
          <span className="font-mono">{textOrDash(factura.folio)}</span>
        </InfoField>
        <InfoField label="Cliente">{textOrDash(factura.cliente_nombre)}</InfoField>
        {/* `correo_facturas` es `null` explícito cuando el backend no resolvió
            ninguna fuente de correo — no es un error, solo no hay destino. */}
        <InfoField label="Correo de facturas" className="col-span-2 sm:col-span-1">
          <span className="break-all">{textOrDash(factura.correo_facturas)}</span>
        </InfoField>
      </div>

      {conceptos.length === 0 ? (
        <EmptyLines>Esta factura no tiene conceptos registrados.</EmptyLines>
      ) : (
        <LineItemsTable
          head={
            <>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium text-right">Cantidad</th>
              <th className="px-3 py-2 font-medium text-right">P. unitario</th>
              <th className="px-3 py-2 font-medium text-right">Descuento</th>
              <th className="px-3 py-2 font-medium text-right">Impuesto</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
            </>
          }
        >
          {conceptos.map((concepto) => (
            <tr
              key={concepto.id}
              className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {textOrDash(concepto.producto_nombre)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatQuantityValue(concepto.cantidad)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCurrency(safeParseAmount(concepto.precio_unitario), { currency: monedaCodigo })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCurrency(safeParseAmount(concepto.descuento), { currency: monedaCodigo })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCurrency(safeParseAmount(concepto.impuesto), { currency: monedaCodigo })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {formatCurrency(safeParseAmount(concepto.total), { currency: monedaCodigo })}
              </td>
            </tr>
          ))}
        </LineItemsTable>
      )}
    </div>
  );
};

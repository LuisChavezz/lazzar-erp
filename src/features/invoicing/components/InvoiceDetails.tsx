import { Factura } from "../interfaces/invoice.interface";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";

// ── Campo de resumen ──────────────────────────────────────────────────────────

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
    <p className="text-xs uppercase text-slate-400 font-semibold">{label}</p>
    <p className="text-sm font-semibold text-slate-800 dark:text-white">{value}</p>
  </div>
);

export const InvoiceDetails = ({ invoice }: { invoice: Factura }) => {
  // El listado puede no hidratar los conceptos; evitamos acceder a `.length`
  // o `.map` sobre un valor ausente.
  const detalles = invoice.factura_detalles ?? [];

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Folio" value={invoice.folio} />
        <Field label="Cliente" value={invoice.cliente_nombre} />
        <Field
          label="Fecha emisión"
          value={formatLocalDate(invoice.fecha_emision)}
        />
        <Field
          label="Fecha vencimiento"
          value={formatLocalDate(invoice.fecha_vencimiento)}
        />
        <Field label="Estatus" value={invoice.estatus} />
        <Field label="Moneda" value={invoice.moneda_nombre} />
        <Field
          label="Subtotal"
          value={formatCurrency(safeParseAmount(invoice.subtotal))}
        />
        <Field
          label="Descuento"
          value={formatCurrency(safeParseAmount(invoice.descuento))}
        />
        <Field
          label="Impuestos"
          value={formatCurrency(safeParseAmount(invoice.impuestos))}
        />
        <Field
          label="Total"
          value={formatCurrency(safeParseAmount(invoice.total))}
        />
      </div>

      {invoice.observaciones ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">
            Observaciones
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {invoice.observaciones}
          </p>
        </div>
      ) : null}

      {/* Detalle de conceptos */}
      {detalles.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
            <p className="text-xs uppercase text-slate-400 font-semibold">
              Conceptos
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-2 font-semibold">Producto</th>
                  <th className="px-4 py-2 font-semibold text-right">Cantidad</th>
                  <th className="px-4 py-2 font-semibold text-right">
                    Precio unitario
                  </th>
                  <th className="px-4 py-2 font-semibold text-right">Descuento</th>
                  <th className="px-4 py-2 font-semibold text-right">Impuesto</th>
                  <th className="px-4 py-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detail) => (
                  <tr
                    key={detail.id}
                    className="border-t border-slate-100 dark:border-white/5"
                  >
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                      {detail.producto_nombre}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                      {safeParseAmount(detail.cantidad).toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatCurrency(safeParseAmount(detail.precio_unitario))}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatCurrency(safeParseAmount(detail.descuento))}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                      {formatCurrency(safeParseAmount(detail.impuesto))}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-white tabular-nums">
                      {formatCurrency(safeParseAmount(detail.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

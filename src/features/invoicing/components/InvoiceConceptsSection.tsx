import { LayersIcon } from "@/src/components/Icons";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { OrderChip, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatTasaImpuesto } from "../utils/invoiceDocumentModel";
import type {
  InvoiceDesgloseConcepto,
  InvoiceDesgloseSatKey,
} from "../interfaces/invoice-desglose.interface";

interface InvoiceConceptsSectionProps {
  conceptos: InvoiceDesgloseConcepto[];
  /** Formatea un importe con la moneda de la factura. */
  money: (value: number) => string;
}

const satChip = (prefix: string, key: InvoiceDesgloseSatKey | null) =>
  key ? `${prefix} ${key.codigo}${key.descripcion ? ` · ${key.descripcion}` : ""}` : null;

/** Cifra de la cabecera de un concepto (rótulo arriba, importe abajo). */
function ConceptTotal({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="sm:text-right">
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
      <p
        className={`tabular-nums text-sm whitespace-nowrap ${
          bold ? "font-semibold text-slate-800 dark:text-white" : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Conceptos de la factura: UN grupo por renglón del pedido (producto + color)
 * con sus totales, y debajo las tallas que esta factura toma de él. Cada talla
 * es un renglón de la factura (`factura_detalle`).
 *
 * "Importe" es el total del renglón CON impuesto, igual que en el PDF y el
 * correo, para que la misma palabra signifique lo mismo en los tres.
 *
 * Una factura "por monto" no tiene renglones: se dice en lugar de pintar una
 * tabla vacía; sus importes siguen en el bloque de Importes.
 */
export function InvoiceConceptsSection({ conceptos, money }: InvoiceConceptsSectionProps) {
  return (
    <SheetSection
      icon={<LayersIcon className="w-6 h-6" />}
      title="Conceptos"
      subtitle="Por renglón del pedido, con las piezas de cada talla."
    >
      {conceptos.length === 0 ? (
        <EmptyLines>
          Factura registrada por monto: no desglosa productos ni tallas. Sus importes están en
          el bloque de Importes.
        </EmptyLines>
      ) : (
        <div className="space-y-4">
          {conceptos.map((concepto) => {
            const { producto } = concepto;
            const chips = [
              producto.codigo ? `Código ${producto.codigo}` : null,
              concepto.color?.nombre ? `Color ${concepto.color.nombre}` : null,
              producto.unidad_medida ? `Unidad ${producto.unidad_medida}` : null,
              satChip("SAT", producto.sat_clave_prodserv),
              satChip("Unidad SAT", producto.sat_clave_unidad),
            ].filter((chip): chip is string => chip !== null);
            const showDescuento = concepto.tallas.some((talla) => talla.descuento > 0);

            return (
              <article
                key={concepto.pedido_detalle}
                className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
              >
                <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 px-5 py-4 bg-slate-50 dark:bg-white/5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white break-words">
                      {producto.nombre || `Producto #${producto.id}`}
                    </h3>
                    {producto.descripcion && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {producto.descripcion}
                      </p>
                    )}
                    {chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <OrderChip key={chip}>{chip}</OrderChip>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 shrink-0">
                    <ConceptTotal label="Piezas" value={`${concepto.cantidad} pzas`} />
                    <ConceptTotal label="Subtotal" value={money(concepto.subtotal)} />
                    <ConceptTotal label="Impuesto" value={money(concepto.impuesto)} />
                    <ConceptTotal label="Total" value={money(concepto.total)} bold />
                  </div>
                </header>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/10">
                        <th className="px-5 py-2 text-left font-semibold">Talla</th>
                        <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold">Precio unitario</th>
                        {showDescuento && (
                          <th className="px-3 py-2 text-right font-semibold">Descuento</th>
                        )}
                        <th className="px-3 py-2 text-right font-semibold">Tasa IVA</th>
                        <th className="px-3 py-2 text-right font-semibold">Importe</th>
                        <th className="px-5 py-2 text-right font-semibold">En el pedido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {concepto.tallas.map((talla) => (
                        <tr
                          key={talla.factura_detalle}
                          className="border-t border-slate-100 dark:border-white/10"
                        >
                          <td className="px-5 py-2 font-medium text-slate-700 dark:text-slate-200">
                            {talla.talla_nombre || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                            {talla.cantidad} pzas
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {money(talla.precio_unitario)}
                          </td>
                          {showDescuento && (
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                              {money(talla.descuento)}
                            </td>
                          )}
                          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {formatTasaImpuesto(
                              talla.porcentaje_impuesto === null
                                ? null
                                : String(talla.porcentaje_impuesto),
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                            {money(talla.total)}
                          </td>
                          {/* Contexto del pedido COMPLETO para esa talla: lo
                              pedido y lo que aún queda por facturar. */}
                          <td className="px-5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {talla.cantidad_pedida === null
                              ? "—"
                              : `${talla.cantidad_pedida} pzas · ${talla.cantidad_pendiente_pedido ?? 0} pend.`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SheetSection>
  );
}

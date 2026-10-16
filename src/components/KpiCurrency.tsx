import { formatKpiCurrencyAmount } from "@/src/utils/kpiFormat";

/**
 * Piezas de los indicadores que llegan POR MONEDA (`por_moneda[]` del backend):
 * cada importe va con el símbolo y el código de SU moneda y nunca se suma con
 * los de otra. Todo es contenido en línea (`<span>`), porque se usa dentro del
 * `<h3>` de `KpiGrid` y en celdas de tabla.
 */

/** Un bloque de `KpiCurrencyBlocks`: el importe de una moneda y el detalle de ESA moneda. */
export interface KpiCurrencyBlock {
  moneda: string;
  monto: number;
  detail: string;
}

/** Valor vacío de una tarjeta ("Sin facturación"): texto atenuado en línea. */
export function KpiMutedValue({ children }: { children: string }) {
  return <span className="text-sm font-normal text-slate-400 dark:text-slate-500 italic">{children}</span>;
}

/**
 * Un bloque por moneda dentro del valor de una tarjeta: importe con su símbolo y
 * código, y debajo el detalle de esa moneda. Va dentro del `<h3>` de `KpiGrid`,
 * así que solo usa `<span>` (en `block`/`flex` para apilar).
 */
export function KpiCurrencyBlocks({ blocks }: { blocks: KpiCurrencyBlock[] }) {
  return (
    <span className="block space-y-1.5">
      {blocks.map((block) => (
        <span key={block.moneda} className="block">
          <span className="flex items-baseline gap-2 tabular-nums">
            <span className="text-lg">{formatKpiCurrencyAmount(block.monto, block.moneda)}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{block.moneda}</span>
          </span>
          <span className="block text-xs font-normal tracking-normal text-slate-500 dark:text-slate-400">
            {block.detail}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Importe con símbolo y código de su moneda (el código desambigua "$" entre MXN y USD). */
export function KpiCurrencyAmount({ value, moneda }: { value: number; moneda: string }) {
  return (
    <>
      {formatKpiCurrencyAmount(value, moneda)}{" "}
      <span className="text-xs text-slate-400 dark:text-slate-500">{moneda}</span>
    </>
  );
}

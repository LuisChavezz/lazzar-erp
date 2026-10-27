import { formatKpiTaggedCurrencyAmount } from "@/src/utils/kpiFormat";

/**
 * Piezas de los indicadores que llegan POR MONEDA (`por_moneda[]` del backend):
 * cada importe va con el símbolo y el código de SU moneda y nunca se suma con
 * los de otra. Todo es contenido en línea (`<span>`), porque se usa dentro del
 * `<h3>` de `KpiGrid` y en celdas de tabla.
 */

/** Frase del ⓘ de todo indicador por moneda: el criterio, igual en todas las pantallas. */
export const SEPARATE_CURRENCIES_NOTE = "Cada moneda va por separado: los importes de monedas distintas no se suman.";

/** Un bloque de `KpiCurrencyBlocks`: el importe de una moneda y, opcional, el detalle de ESA moneda. */
export interface KpiCurrencyBlock {
  moneda: string;
  monto: number;
  detail?: string;
}

/** Valor vacío de una tarjeta ("Sin facturación"): texto atenuado en línea. */
export function KpiMutedValue({ children }: { children: string }) {
  return <span className="text-sm font-normal text-slate-400 dark:text-slate-500 italic">{children}</span>;
}

/**
 * Un bloque de `KpiTaggedBlocks`: un valor YA formateado, la etiqueta que dice
 * de qué es (código de moneda, clave de unidad) y, opcional, su detalle.
 */
export interface KpiTaggedBlock {
  key: string;
  value: string;
  tag: string;
  detail?: string;
}

/**
 * Un bloque por grupo (moneda, unidad de medida…) dentro del valor de una
 * tarjeta: valor y etiqueta, y debajo (si lo hay) el detalle de ese grupo. Para
 * lo que no se puede sumar entre grupos y no es un importe simple (porcentajes
 * por moneda, cantidades por unidad, diferencias con signo). Va dentro del
 * `<h3>` de `KpiGrid`, así que solo usa `<span>` (en `block`/`flex` para apilar).
 */
export function KpiTaggedBlocks({ blocks }: { blocks: KpiTaggedBlock[] }) {
  return (
    <span className="block space-y-1.5">
      {blocks.map((block) => (
        <span key={block.key} className="block">
          <span className="flex items-baseline gap-2 tabular-nums">
            <span className="text-lg">{block.value}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{block.tag}</span>
          </span>
          {block.detail ? (
            <span className="block text-xs font-normal tracking-normal text-slate-500 dark:text-slate-400">
              {block.detail}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

/**
 * Un bloque por moneda dentro del valor de una tarjeta: importe con su símbolo y
 * código, y debajo (si lo hay) el detalle de esa moneda (`KpiTaggedBlocks` con
 * el importe formateado en su moneda).
 */
export function KpiCurrencyBlocks({ blocks }: { blocks: KpiCurrencyBlock[] }) {
  return (
    <KpiTaggedBlocks
      blocks={blocks.map((block) => ({
        key: block.moneda,
        value: formatKpiTaggedCurrencyAmount(block.monto, block.moneda),
        tag: block.moneda,
        detail: block.detail,
      }))}
    />
  );
}

/** Importe con símbolo y código de su moneda (el código desambigua "$" entre MXN y USD). */
export function KpiCurrencyAmount({ value, moneda }: { value: number; moneda: string }) {
  return (
    <>
      {formatKpiTaggedCurrencyAmount(value, moneda)}{" "}
      <span className="text-xs text-slate-400 dark:text-slate-500">{moneda}</span>
    </>
  );
}

import type { ProductVariant } from "../interfaces/product-variant.interface";

interface SkuBadgeProps {
  /** Código a mostrar; vacío o `null` no renderiza nada (sin insignia vacía). */
  value: string | null | undefined;
  /** Texto visible antes del código (p. ej. "Proscai"). */
  prefix?: string;
  title: string;
}

/** Insignia compacta para un código secundario de una variante de producto. */
export function SkuBadge({ value, prefix, title }: SkuBadgeProps) {
  if (!value || !value.trim()) return null;
  return (
    <span
      title={title}
      className="shrink-0 rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400"
    >
      {prefix && <span className="text-slate-400 dark:text-slate-500">{prefix} </span>}
      {value}
    </span>
  );
}

/**
 * Códigos secundarios de una variante en los selectores de variante
 * (Movimientos, Nueva OP, Traspasos): el código Proscai, con su prefijo
 * visible, y el SKU de producción (MP… de una muestra dada de alta en
 * catálogo), cuyo propio prefijo "MP" ya lo identifica. Ambos pueden venir
 * vacíos: se omiten sin placeholder.
 */
export function ProductVariantCodeBadges({
  variant,
}: {
  variant: Pick<ProductVariant, "cod_proscai" | "sku_produccion">;
}) {
  return (
    <>
      <SkuBadge value={variant.cod_proscai} prefix="Proscai" title="Código Proscai" />
      <SkuBadge value={variant.sku_produccion} title="SKU de producción" />
    </>
  );
}

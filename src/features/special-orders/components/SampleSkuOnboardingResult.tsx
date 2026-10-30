"use client";

import { Button } from "@/src/components/Button";
import { LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import type { SampleProductionVariant } from "../interfaces/special-order.interface";

interface SampleSkuOnboardingResultProps {
  /** La respuesta `201` del alta: una variante por talla generada. */
  variants: SampleProductionVariant[];
  onClose: () => void;
}

/**
 * Cierre del alta de SKU: lo que el backend creó, tal cual lo respondió.
 *
 * Muestra el SKU de catálogo (`sku_catalogo`) de lo recién creado. El detalle
 * del pedido especial también lo trae por talla, pero la tarjeta de la línea
 * no lo pinta (solo el asistente cita uno de ejemplo al heredar el catálogo),
 * así que se pide anotarlo. La columna solo aparece si alguna variante lo trae.
 */
export function SampleSkuOnboardingResult({ variants, onClose }: SampleSkuOnboardingResultProps) {
  const withCatalog = variants.some((variant) => Boolean(variant.sku_catalogo));

  return (
    <div className="flex flex-col gap-5">
      <div
        role="status"
        className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100 space-y-1"
      >
        <p className="font-semibold">
          {variants.length === 1
            ? "Se generó 1 SKU de producción con su lista de materiales."
            : `Se generaron ${variants.length} SKU de producción con su lista de materiales.`}
        </p>
        {withCatalog && (
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
            También se dieron de alta en catálogo. Anota los SKU de catálogo: la tarjeta del pedido
            especial no los muestra.
          </p>
        )}
      </div>

      <LineItemsTable
        head={
          <>
            <th className="px-3 py-2 font-medium">Talla</th>
            <th className="px-3 py-2 font-medium">SKU de producción</th>
            {withCatalog && <th className="px-3 py-2 font-medium">SKU de catálogo</th>}
          </>
        }
      >
        {variants.map((variant) => (
          <tr key={variant.id}>
            <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-200">
              {variant.talla_nombre || "—"}
            </td>
            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white break-all">
              {variant.sku}
            </td>
            {withCatalog && (
              <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white break-all">
                {variant.sku_catalogo || "—"}
              </td>
            )}
          </tr>
        ))}
      </LineItemsTable>

      <div className="flex justify-end border-t border-slate-200 dark:border-white/10 pt-4">
        <Button variant="primary" rounded="full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

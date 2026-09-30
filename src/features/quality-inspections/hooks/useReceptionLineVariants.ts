import { useQueries } from "@tanstack/react-query";
import { getProductVariant } from "@/src/features/product-variants/services/actions";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";

export interface ReceptionLineVariant {
  isLoading: boolean;
  isError: boolean;
  variant: ProductVariant | undefined;
}

/**
 * Talla/color de los renglones de una recepción de OP.
 *
 * El detalle de la recepción (GET /compras/recepciones/{id}/) solo trae el id
 * de `producto_variante`, sin talla ni color, y no hay otro endpoint que los
 * resuelva por renglón: se pide cada variante DISTINTA a
 * GET /catalogo/producto-variante/{id}/. Solo corre cuando el diálogo de
 * inspección ya cargó el detalle (nunca por prefetch). En renglones de OC la
 * variante es `null` y no se pide nada.
 */
export const useReceptionLineVariants = (
  variantIds: (number | null)[],
): Map<number, ReceptionLineVariant> => {
  const distinctIds = [
    ...new Set(variantIds.filter((id): id is number => id !== null && id > 0)),
  ];

  const results = useQueries({
    queries: distinctIds.map((id) => ({
      queryKey: ["product-variant", id],
      queryFn: () => getProductVariant(id),
    })),
  });

  return new Map(
    distinctIds.map((id, index) => [
      id,
      {
        isLoading: results[index]?.isLoading ?? false,
        isError: results[index]?.isError ?? false,
        variant: results[index]?.data,
      },
    ]),
  );
};

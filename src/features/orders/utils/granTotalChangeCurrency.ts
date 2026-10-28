import type { MoneyFormatOverrides } from "@/src/utils/formatCurrency";

/**
 * Cómo pintar el aviso "Guardado hoy → se guardará" de la edición de Mesa de
 * Control (EC-606, decisión 5): el gran total guardado va en la moneda del
 * pedido y el nuevo en la elegida en el formulario.
 *
 * - Las dos conocidas y DISTINTAS: cada una con su código ("MXN 116.00 →
 *   USD 232.00"); "$" solo no distingue MXN de USD.
 * - Las dos conocidas e iguales: con su símbolo, como siempre ("$116.00 →
 *   $232.00").
 * - Alguna sin resolver (catálogo cargando o con error, PK que no trae): las
 *   DOS sin símbolo. Mezclar un número suelto con un importe con código haría
 *   parecer que la moneda cambió.
 */
export interface GranTotalChangeCurrency {
  /** Moneda con la que se formatea el gran total guardado (`null` = sin símbolo). */
  savedCodigo: string | null;
  /** Moneda con la que se formatea el gran total que se guardará. */
  nextCodigo: string | null;
  /** Overrides comunes a los dos importes. */
  overrides: MoneyFormatOverrides | undefined;
}

export const granTotalChangeCurrency = (
  savedCodigo: string | null,
  nextCodigo: string | null,
): GranTotalChangeCurrency => {
  if (!savedCodigo || !nextCodigo) {
    return { savedCodigo: null, nextCodigo: null, overrides: undefined };
  }
  return {
    savedCodigo,
    nextCodigo,
    overrides: savedCodigo === nextCodigo ? undefined : { currencyDisplay: "code" },
  };
};

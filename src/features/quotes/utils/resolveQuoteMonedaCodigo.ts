import type { QueryClient } from "@tanstack/react-query";
import { currenciesQueryOptions } from "@/src/features/currency/hooks/useCurrencies";
import { findCurrency } from "@/src/features/currency/utils/currencyLookup";
import type { QuoteById } from "../interfaces/quote.interface";

/**
 * Código ISO de la moneda de una cotización, para los documentos que recibe el
 * cliente (PDF y correo). El retrieve trae `moneda` como id, así que se resuelve
 * contra el catálogo de monedas, como `QuoteDetails`.
 *
 * El catálogo se ESPERA (`ensureQueryData`: usa la caché si ya cargó): un
 * documento no se genera con el catálogo a medio cargar. Si aun así no se
 * puede resolver —el catálogo falla, la cotización no tiene moneda o el id no
 * está en el catálogo— devuelve `null` y los importes salen sin símbolo
 * (`moneyFormatFor`); nunca se asume MXN.
 */
export const resolveQuoteMonedaCodigo = async (
  queryClient: QueryClient,
  quote: Pick<QuoteById, "moneda">,
): Promise<string | null> => {
  try {
    const currencies = await queryClient.ensureQueryData(currenciesQueryOptions());
    return findCurrency(currencies, quote.moneda)?.codigo_iso ?? null;
  } catch {
    return null;
  }
};

import type { QueryClient } from "@tanstack/react-query";
import { currenciesQueryOptions } from "@/src/features/currency/hooks/useCurrencies";
import { findCurrency } from "@/src/features/currency/utils/currencyLookup";
import type { QuoteById } from "../interfaces/quote.interface";
import { getQuoteById } from "../services/actions";

/** Reintentos del catálogo de monedas antes de abortar el documento. */
const CATALOGO_REINTENTOS = 2;

export const CATALOGO_MONEDAS_ERROR =
  "No se pudo cargar el catálogo de monedas; intenta de nuevo para generar el documento con la moneda de la cotización.";

/**
 * Cotización y código ISO de su moneda, para los documentos que recibe el
 * cliente (PDF y correo). Único punto de carga de ambos caminos —descarga y
 * correo— para que no diverjan.
 *
 * El retrieve trae `moneda` como id, así que se resuelve contra el catálogo de
 * monedas (como `QuoteDetails`). Cotización y catálogo se piden EN PARALELO; el
 * catálogo usa la caché si ya cargó y, si no, se reintenta. Si aun así falla,
 * se lanza `CATALOGO_MONEDAS_ERROR` y la acción se aborta (el `onError` de la
 * mutación lo muestra): un documento sin moneda por un fallo pasajero de red no
 * debe llegar al cliente.
 *
 * Solo con el catálogo cargado y una `moneda` que no aparece en él (o vacía)
 * `monedaCodigo` es `null` y los importes salen sin símbolo; nunca se asume MXN.
 */
export const loadQuoteForDocument = async (
  queryClient: QueryClient,
  quoteId: number,
): Promise<{ quote: QuoteById; monedaCodigo: string | null }> => {
  const [quote, currencies] = await Promise.all([
    getQuoteById(quoteId),
    queryClient
      .ensureQueryData({ ...currenciesQueryOptions(), retry: CATALOGO_REINTENTOS })
      .catch((error: unknown) => {
        throw new Error(CATALOGO_MONEDAS_ERROR, { cause: error });
      }),
  ]);

  return { quote, monedaCodigo: findCurrency(currencies, quote.moneda)?.codigo_iso ?? null };
};

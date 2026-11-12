import type { QueryClient } from "@tanstack/react-query";
import { currenciesQueryOptions } from "@/src/features/currency/hooks/useCurrencies";
import { findCurrency, getCurrencyLabel } from "@/src/features/currency/utils/currencyLookup";
import { pedidoDetailQueryOptions } from "../hooks/usePedidoDetail";
import type { PedidoDetail } from "../interfaces/order.interface";
import { canSeeAccounting } from "./orderAccounting";

/** Reintentos del catálogo de monedas antes de abortar el PDF. */
const CATALOGO_REINTENTOS = 2;

export const PEDIDO_PDF_CURRENCY_ERROR =
  "No se pudo cargar el catálogo de monedas; intenta de nuevo para generar el PDF con la moneda del pedido.";

/** Moneda del pedido para sus importes; `null` en ambos = sin símbolo. */
export interface PedidoPdfCurrency {
  /** Código ISO ("MXN"), o `null` si el catálogo no trae la `moneda` del pedido. */
  codigo: string | null;
  /** "MXN - Peso mexicano", o `null` en el mismo caso. */
  label: string | null;
}

export interface PedidoPdfData {
  pedido: PedidoDetail;
  /** `null` cuando el usuario no ve importes: no hay nada que formatear. */
  currency: PedidoPdfCurrency | null;
}

/**
 * Pedido y moneda para su PDF (EC-856).
 *
 * 1. El detalle se vuelve a pedir FRESCO (`staleTime: 0`), como la OC: el
 *    folio y el estatus reales deciden el nombre del archivo y la marca, y la
 *    respuesta ya viene sin los importes que el rol no puede ver.
 * 2. El pedido trae `moneda` como id. Igual que la pantalla
 *    (`OrderCurrencyProvider`), el catálogo de monedas solo se pide si el
 *    usuario ve importes; usa la caché si ya cargó y, si no, se reintenta.
 *    Si aun así falla, el PDF se aborta (mismo criterio que el PDF de la
 *    cotización): un documento no sale con importes sin moneda por un fallo
 *    pasajero de red.
 * 3. Con el catálogo cargado y una `moneda` que no aparece en él, los importes
 *    salen sin símbolo; nunca se asume MXN.
 */
export const loadPedidoForPdf = async (
  queryClient: QueryClient,
  pedidoId: number,
): Promise<PedidoPdfData> => {
  const pedido = await queryClient.fetchQuery({
    ...pedidoDetailQueryOptions(pedidoId),
    staleTime: 0,
  });
  if (!canSeeAccounting(pedido)) return { pedido, currency: null };

  const currencies = await queryClient
    .ensureQueryData({ ...currenciesQueryOptions(), retry: CATALOGO_REINTENTOS })
    .catch((error: unknown) => {
      throw new Error(PEDIDO_PDF_CURRENCY_ERROR, { cause: error });
    });
  const currency = findCurrency(currencies, pedido.moneda);
  return {
    pedido,
    currency: {
      codigo: currency?.codigo_iso ?? null,
      label: currency ? getCurrencyLabel(currency) : null,
    },
  };
};

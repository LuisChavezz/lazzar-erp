import type { QueryClient } from "@tanstack/react-query";
import { currenciesQueryOptions } from "@/src/features/currency/hooks/useCurrencies";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import { findCurrency, getCurrencyLabel } from "@/src/features/currency/utils/currencyLookup";
import type { PedidoDetail } from "../interfaces/order.interface";
import { getPedidoDetail } from "../services/actions";
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

type CatalogResult = { ok: true; currencies: Currency[] } | { ok: false; error: unknown };

/**
 * Pedido y moneda para su PDF (EC-856).
 *
 * 1. El detalle se lee FRESCO del backend con el servicio, SIN pasar por la
 *    caché de `["pedido-detail", id]`: la página observa esa consulta, y un
 *    fallo aquí (red, o 404 de un pedido que otro usuario canceló) no debe
 *    disparar su aviso de "no se pudo actualizar" ni cambiarla a "Pedido no
 *    encontrado"; el error lo avisa solo "Descargar PDF". El folio y el estatus
 *    reales deciden el nombre del archivo y la marca, y la respuesta ya viene
 *    sin los importes que el rol no puede ver.
 * 2. El pedido trae `moneda` como id. El catálogo de monedas se pide EN
 *    PARALELO con el detalle (usa la caché si ya cargó y, si no, se reintenta),
 *    pero solo se espera si el usuario ve importes. Si aun así falla, el PDF se
 *    aborta (mismo criterio que el PDF de la cotización): un documento no sale
 *    con importes sin moneda por un fallo pasajero de red.
 * 3. Con el catálogo cargado y una `moneda` que no aparece en él, los importes
 *    salen sin símbolo; nunca se asume MXN.
 */
export const loadPedidoForPdf = async (
  queryClient: QueryClient,
  pedidoId: number,
): Promise<PedidoPdfData> => {
  // El resultado del catálogo se captura (no queda una promesa rechazada sin
  // atender si el usuario no ve importes y nadie la espera).
  const catalog: Promise<CatalogResult> = queryClient
    .ensureQueryData({ ...currenciesQueryOptions(), retry: CATALOGO_REINTENTOS })
    .then(
      (currencies) => ({ ok: true, currencies }),
      (error: unknown) => ({ ok: false, error }),
    );
  const pedido = await getPedidoDetail(pedidoId);
  if (!canSeeAccounting(pedido)) return { pedido, currency: null };

  const result = await catalog;
  if (!result.ok) throw new Error(PEDIDO_PDF_CURRENCY_ERROR, { cause: result.error });
  const currency = findCurrency(result.currencies, pedido.moneda);
  return {
    pedido,
    currency: {
      codigo: currency?.codigo_iso ?? null,
      label: currency ? getCurrencyLabel(currency) : null,
    },
  };
};

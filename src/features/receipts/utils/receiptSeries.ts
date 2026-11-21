import type { ReceiptOnboardingSerieFolio } from "../interfaces/receipt-onboarding.interface";

/** Series de folio de una recepción, en el orden en que se ofrecen. */
export const RECEIPT_SERIE_CODES = ["RC", "RT", "RZ"] as const;
export type ReceiptSerieCodigo = (typeof RECEIPT_SERIE_CODES)[number];

const isReceiptSerieCodigo = (value: string): value is ReceiptSerieCodigo =>
  (RECEIPT_SERIE_CODES as readonly string[]).includes(value);

/**
 * El `serie_codigo` que el POST de la recepción espera para una serie del
 * onboarding (`catalogos.series_recepcion`). El backend acepta dos formas de
 * configurarla (`compras/api/views.py`, `_serie_folio_recepcion`): tipo
 * `RECEPCION` con serie RC/RT/RZ, o el tipo de documento mismo RC/RT/RZ. En la
 * primera el código es la serie; en la segunda, el tipo. `null` si no es
 * ninguna de las tres.
 */
export const receiptSerieCodigo = (serie: ReceiptOnboardingSerieFolio): ReceiptSerieCodigo | null => {
  const tipo = serie.tipo_documento.trim().toUpperCase();
  const codigo = tipo === "RECEPCION" ? serie.serie.trim().toUpperCase() : tipo;
  return isReceiptSerieCodigo(codigo) ? codigo : null;
};

/**
 * Series que se pueden usar para recibir en la sucursal de la orden (EC-922):
 * las activas de esa sucursal, sin repetir, en el orden RC, RT, RZ. El
 * onboarding las trae de toda la empresa; la recepción se folia con la serie
 * de la sucursal de la OC, la OP o la SM (`candidateSucursalId`). Sin sucursal
 * no hay ninguna. Ofrecer solo estas evita que el backend, al no encontrar la
 * elegida en la sucursal, folie en silencio con otra.
 */
export const receiptSeriesDeSucursal = (
  series: readonly ReceiptOnboardingSerieFolio[],
  sucursalId: number | null,
): ReceiptSerieCodigo[] => {
  if (sucursalId === null) return [];
  const codigos = new Set(
    series
      .filter((s) => s.sucursal_id === sucursalId)
      .map(receiptSerieCodigo)
      .filter((c): c is ReceiptSerieCodigo => c !== null),
  );
  return RECEIPT_SERIE_CODES.filter((c) => codigos.has(c));
};

/**
 * Tope de filas de `catalogos.series_recepcion`: el onboarding corta la lista a
 * 50 filas de TODA la empresa, ordenadas por serie (`compras/api/views.py`,
 * `[:50]`). Con exactamente 50 puede faltar la serie de alguna sucursal.
 */
export const SERIES_RECEPCION_TOPE_ONBOARDING = 50;

/**
 * Series que ofrece el formulario (EC-922). Con menos de 50 filas la lista
 * está completa y se ofrecen las de la sucursal (`receiptSeriesDeSucursal`).
 * Con exactamente 50 puede venir recortada: filtrar ocultaría (o dejaría sin
 * ninguna) una sucursal que sí tiene series, así que se ofrecen RC, RT y RZ
 * tal cual, como antes. Quitar este respaldo cuando el backend deje de
 * recortar la lista.
 */
export const receiptSeriesOfrecidas = (
  series: readonly ReceiptOnboardingSerieFolio[],
  sucursalId: number | null,
): ReceiptSerieCodigo[] =>
  series.length === SERIES_RECEPCION_TOPE_ONBOARDING
    ? [...RECEIPT_SERIE_CODES]
    : receiptSeriesDeSucursal(series, sucursalId);

/**
 * Serie que el formulario propone (EC-922): RC si la sucursal la tiene (la que
 * el backend usa cuando no se indica ninguna); si no, la única que haya. Con
 * varias y ninguna RC no se propone nada: el formulario no sabe si la
 * recepción es RT o RZ, así que la elige el usuario.
 */
export const receiptSeriePreseleccionada = (
  disponibles: readonly ReceiptSerieCodigo[],
): ReceiptSerieCodigo | "" => {
  if (disponibles.includes("RC")) return "RC";
  return disponibles.length === 1 ? disponibles[0] : "";
};

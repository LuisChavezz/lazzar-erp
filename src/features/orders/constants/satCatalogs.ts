/**
 * Etiquetas legibles para los códigos SAT que el pedido guarda como CÓDIGO
 * (string) en sus `TextChoices`: `forma_pago`, `metodo_pago`, `uso_cfdi`. Son
 * catálogos SAT fijos y acotados (el modelo del backend solo admite estos
 * valores), así que se resuelven con un mapa local — sin fetch.
 *
 * NO cubre `cliente_regimen_fiscal`: ese es una FK cuyo valor serializado es el
 * PK (`id_sat_regimen_fiscal`, p.ej. 17), NO el código SAT (601, 626…), así que
 * un mapa por código no casaría. Se resuelve por catálogo (`useSatInfo`) en el
 * componente. Ver `PedidoDetailContent`.
 *
 * Los getters caen al valor crudo cuando el código no está en el mapa y a "—"
 * cuando viene vacío/ausente — nunca "undefined".
 */

export const FORMA_PAGO_LABELS: Record<string, string> = {
  "01": "01 - Efectivo",
  "03": "03 - Transferencia electrónica de fondos",
  "04": "04 - Tarjeta de crédito",
};

export const METODO_PAGO_LABELS: Record<string, string> = {
  PUE: "PUE - Pago en una sola exhibición",
  PPD: "PPD - Pago en parcialidades o diferido",
  NA: "NA - No aplica",
};

export const USO_CFDI_LABELS: Record<string, string> = {
  G01: "G01 - Adquisición de mercancías",
  G03: "G03 - Gastos en general",
  I01: "I01 - Construcciones",
};

const labelFrom = (
  map: Record<string, string>,
  code: string | null | undefined,
): string => {
  if (!code || code.trim() === "") return "—";
  return map[code] ?? code;
};

export const getFormaPagoLabel = (code: string | null | undefined): string =>
  labelFrom(FORMA_PAGO_LABELS, code);

export const getMetodoPagoLabel = (code: string | null | undefined): string =>
  labelFrom(METODO_PAGO_LABELS, code);

export const getUsoCfdiLabel = (code: string | null | undefined): string =>
  labelFrom(USO_CFDI_LABELS, code);

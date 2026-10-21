import { MONEY_REGEX, toCents } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";

/**
 * Suma de los importes capturados en las líneas de un documento (pago, cobro),
 * en CENTAVOS enteros. Definición ÚNICA del total: la usan el indicador en vivo
 * de cada formulario y su `build…Payload`, así que lo que se ve y lo que viaja
 * al API no pueden discrepar.
 *
 * La captura a medias se normaliza ("12." cuenta como 12, ".5" como 0.5) para
 * que el total no salte mientras se teclea; un importe malformado se ignora (su
 * propio campo ya reporta el error).
 */
export const sumImportesEnCentavos = (
  lines: readonly { importe_aplicado: string }[],
): number =>
  lines.reduce((total, line) => {
    const importe = normalizeCapturedDecimal(line.importe_aplicado);
    return MONEY_REGEX.test(importe) ? total + toCents(importe) : total;
  }, 0);

/**
 * Centavos enteros → string decimal de 2 posiciones ("116000" → "1160.00").
 * Pareja de `sumImportesEnCentavos`: el total pintado y el que viaja salen de
 * esta misma función.
 */
export const centavosAMoneda = (cents: number): string => (cents / 100).toFixed(2);

import { KpiCurrencyAmount } from "@/src/components/KpiCurrency";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { formatCobroAmount } from "../utils/collection.utils";

interface CobroAmountProps {
  /** Decimal como string, tal cual lo devuelve el backend. */
  value: string;
  /** Código ISO de la moneda; `null` si no se pudo resolver. */
  moneda: string | null;
  /** `false` omite el código junto al importe (el símbolo se conserva). */
  showCode?: boolean;
}

/**
 * Importe de cobros: con su moneda conocida, `KpiCurrencyAmount` (símbolo y
 * código, el mismo marcado que los indicadores); sin ella, el número sin
 * símbolo ni código, en vez de adivinar una moneda.
 */
export function CobroAmount({ value, moneda, showCode = true }: CobroAmountProps) {
  if (moneda !== null && showCode) {
    return <KpiCurrencyAmount value={safeParseAmount(value)} moneda={moneda} />;
  }
  return <>{formatCobroAmount(value, moneda)}</>;
}

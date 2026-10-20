"use client";

import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { buildBankAccountIndex, formatCobroAmount, resolveCobroMoneda } from "../utils/collection.utils";

interface CobroAmountProps {
  value: string;
  cuentaBancariaId: number;
}

/**
 * Importe de un cobro en la moneda de su cuenta bancaria, con el código al lado.
 *
 * Lee el catálogo aquí (una sola consulta en caché para toda la tabla) en vez
 * de recibir la moneda por la factoría de columnas: un valor que cambia al
 * cargar el catálogo, pasado por `getCollectionColumns`, remontaría todas las
 * celdas. Sin cuenta resuelta, el importe va sin símbolo ni código.
 */
export function CobroAmount({ value, cuentaBancariaId }: CobroAmountProps) {
  const { bankAccounts } = useBankAccounts();
  const moneda = resolveCobroMoneda(
    { cuenta_bancaria: cuentaBancariaId },
    buildBankAccountIndex(bankAccounts),
  );

  return (
    <span className="whitespace-nowrap">
      {formatCobroAmount(value, moneda)}
      {moneda && (
        <span className="ml-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">{moneda}</span>
      )}
    </span>
  );
}

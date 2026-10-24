"use client";

import { StatusBadge } from "@/src/components/StatusBadge";
import { formatShortDate } from "@/src/utils/formatDate";
import { EmptyLines, LineItemsTable, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { useCobros } from "@/src/features/collections/hooks/useCobros";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { COBRO_ESTATUS_CONFIG } from "@/src/features/collections/constants/collectionStatus";
import { CobroAmount } from "@/src/features/collections/components/CobroAmount";
import {
  buildBankAccountIndex,
  cobroLabel,
  resolveCobroMoneda,
} from "@/src/features/collections/utils/collection.utils";
import { CobroRepState } from "@/src/features/collections/components/CobroRepState";
import { getCxcCobros } from "../utils/cxcCobros";

/**
 * Sección "Cobros" del detalle de CxC, de solo lectura: los cobros aplicados o
 * cancelados sobre esta cuenta (sin borradores), con su importe para ELLA (de
 * sus líneas, no el total del cobro). Sale del listado de cobros (`useCobros`, la misma
 * caché que la pantalla de Cobros) filtrado en el cliente por
 * `cobro_detalles[].cxc`: el backend no filtra cobros por CxC.
 *
 * El importe va en la moneda del cobro, que es la de su cuenta bancaria
 * (`resolveCobroMoneda`); sin catálogo de cuentas se muestra sin símbolo.
 *
 * Su carga y su error son propios: no bloquean el resto del detalle.
 */
export const AccountsReceivableCobrosSection = ({ cuentaId }: { cuentaId: number }) => {
  const { cobros, isLoading, isInitialError } = useCobros();
  const { bankAccounts } = useBankAccounts();
  const bankAccountIndex = buildBankAccountIndex(bankAccounts);
  const cobrosDeLaCuenta = getCxcCobros(cobros, cuentaId);

  return (
    <div>
      <SectionTitle>Cobros</SectionTitle>

      {isInitialError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          No se pudieron cargar los cobros de la cuenta. Intenta de nuevo más tarde.
        </p>
      ) : isLoading ? (
        <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
          Cargando cobros…
        </p>
      ) : cobrosDeLaCuenta.length === 0 ? (
        <EmptyLines>Esta cuenta no tiene cobros registrados.</EmptyLines>
      ) : (
        <LineItemsTable
          head={
            <>
              <th className="px-3 py-2 font-medium">Cobro</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium text-right">Importe</th>
              <th className="px-3 py-2 font-medium">Estatus</th>
              <th className="px-3 py-2 font-medium text-center">REP</th>
            </>
          }
        >
          {cobrosDeLaCuenta.map(({ cobro, importe }) => (
            <tr key={cobro.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{cobroLabel(cobro)}</td>
              <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                {formatShortDate(cobro.fecha_cobro, { timeZone: "UTC" })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                <CobroAmount value={importe} moneda={resolveCobroMoneda(cobro, bankAccountIndex)} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={cobro.estatus} config={COBRO_ESTATUS_CONFIG} />
              </td>
              <td className="px-3 py-2 text-center">
                <CobroRepState cobro={cobro} />
              </td>
            </tr>
          ))}
        </LineItemsTable>
      )}
    </div>
  );
};

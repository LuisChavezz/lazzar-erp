"use client";

import { StatusBadge } from "@/src/components/StatusBadge";
import { formatShortDate } from "@/src/utils/formatDate";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { EmptyLines, LineItemsTable, SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { useCobros } from "@/src/features/collections/hooks/useCobros";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { COBRO_ESTATUS_CONFIG } from "@/src/features/collections/constants/collectionStatus";
import { CobroAmount } from "@/src/features/collections/components/CobroAmount";
import { buildBankAccountIndex, resolveCobroMoneda } from "@/src/features/collections/utils/collection.utils";
import { isCobroRepPending } from "@/src/features/collections/utils/cobroRepStamping";
import type { Cobro } from "@/src/features/collections/interfaces/collection.interface";
import { getCxcCobros } from "../utils/cxcCobros";

/** Estado del REP con la misma regla y el mismo texto que la columna REP de cobros. */
const CobroRepState = ({ cobro }: { cobro: Cobro }) => {
  if (cobro.rep_uuid) {
    return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Timbrado</span>;
  }
  if (isCobroRepPending(cobro)) {
    return (
      <span
        className="text-xs font-medium text-amber-600 dark:text-amber-400"
        title="Timbrado sin confirmar en Facturama"
      >
        Pendiente
      </span>
    );
  }
  return <span className="text-slate-400">—</span>;
};

/**
 * Sección "Cobros" del detalle de CxC, de solo lectura: los cobros que
 * aplicaron a esta cuenta, con el importe que aplicaron A ELLA (de sus líneas,
 * no el total del cobro). Sale del listado de cobros (`useCobros`, la misma
 * caché que la pantalla de Cobros) filtrado en el cliente por
 * `cobro_detalles[].cxc`: el backend no filtra cobros por CxC.
 *
 * El importe va en la moneda del cobro, que es la de su cuenta bancaria
 * (`resolveCobroMoneda`); sin catálogo de cuentas se muestra sin símbolo.
 *
 * Su carga y su error son propios: no bloquean el resto del detalle.
 */
export const AccountsReceivableCobrosSection = ({ cuentaId }: { cuentaId: number }) => {
  const { cobros, isLoading, isInitialError, error } = useCobros();
  const { bankAccounts } = useBankAccounts();
  const bankAccountIndex = buildBankAccountIndex(bankAccounts);
  const cobrosDeLaCuenta = getCxcCobros(cobros, cuentaId);

  return (
    <div>
      <SectionTitle>Cobros</SectionTitle>

      {isInitialError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {`No se pudieron cargar los cobros: ${extractErrorMessage(error, "intenta de nuevo más tarde.")}`}
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
              <th className="px-3 py-2 font-medium text-right">Importe aplicado</th>
              <th className="px-3 py-2 font-medium">Estatus</th>
              <th className="px-3 py-2 font-medium text-center">REP</th>
            </>
          }
        >
          {cobrosDeLaCuenta.map(({ cobro, importe_aplicado }) => (
            <tr key={cobro.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">{`#${cobro.id}`}</td>
              <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                {formatShortDate(cobro.fecha_cobro, { timeZone: "UTC" })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                <CobroAmount value={importe_aplicado} moneda={resolveCobroMoneda(cobro, bankAccountIndex)} />
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

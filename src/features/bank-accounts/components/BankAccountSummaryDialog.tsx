"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { BancosIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  MOVIMIENTO_ESTATUS_CONFIG,
  TIPO_MOVIMIENTO_CONFIG,
} from "../constants/movimientoEstatus";
import { useBankAccountSummary } from "../hooks/useBankAccountSummary";
import type {
  CuentaBancaria,
  MovimientoCuentaBancaria,
} from "../interfaces/bank-account.interface";
import { formatSaldo } from "../utils/bankAccountMoney";

const MovimientosTable = ({
  items,
  monedaCodigo,
}: {
  items: MovimientoCuentaBancaria[];
  monedaCodigo: string | null;
}) => {
  if (items.length === 0) {
    return <EmptyLines>Esta cuenta no tiene movimientos registrados.</EmptyLines>;
  }

  return (
    <LineItemsTable
      head={
        <>
          <th className="px-3 py-2 font-medium">Fecha</th>
          <th className="px-3 py-2 font-medium">Concepto</th>
          <th className="px-3 py-2 font-medium">Referencia</th>
          <th className="px-3 py-2 font-medium">Tipo</th>
          <th className="px-3 py-2 font-medium text-right">Importe</th>
          <th className="px-3 py-2 font-medium text-right">Saldo</th>
          <th className="px-3 py-2 font-medium">Estatus</th>
        </>
      }
    >
      {/* Los movimientos se muestran TAL CUAL los devuelve el backend, los
          cancelados incluidos: ocultarlos escondería justo la razón por la que
          los totales del mes pueden no cuadrar (ver `ResumenCuentaBancaria`). */}
      {items.map((movimiento) => (
        <tr
          key={movimiento.id}
          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
            {/* `timeZone: "UTC"`: `fecha` es una fecha-calendario "YYYY-MM-DD"
                que `Date` interpreta a medianoche UTC; sin esto, un navegador
                al oeste de Greenwich la pinta un día antes. Mismo criterio que
                CxC/CxP y las pólizas. */}
            {formatShortDate(movimiento.fecha, { timeZone: "UTC" })}
          </td>
          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
            {textOrDash(movimiento.concepto)}
          </td>
          <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            {textOrDash(movimiento.referencia)}
          </td>
          <td className="px-3 py-2">
            <StatusBadge
              status={movimiento.tipo_movimiento}
              config={TIPO_MOVIMIENTO_CONFIG}
            />
          </td>
          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
            {formatSaldo(movimiento.importe, monedaCodigo)}
          </td>
          <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
            {formatSaldo(movimiento.saldo, monedaCodigo)}
          </td>
          <td className="px-3 py-2">
            <StatusBadge status={movimiento.estatus} config={MOVIMIENTO_ESTATUS_CONFIG} />
          </td>
        </tr>
      ))}
    </LineItemsTable>
  );
};

interface BankAccountSummaryDialogProps {
  /**
   * La cuenta ya cargada por el listado. De ella salen la identidad (alias,
   * número, banco) y, sobre todo, `moneda_codigo`, con el que se formatean
   * TODOS los importes: la acción `/resumen/` también devuelve `banco` y
   * `moneda`, pero no consta si viajan como nombre resuelto o como id crudo, y
   * el tipo de la cuenta sí está confirmado.
   */
  account: CuentaBancaria;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BankAccountSummaryDialog({
  account,
  open,
  onOpenChange,
}: BankAccountSummaryDialogProps) {
  // La consulta va por id y solo corre mientras el diálogo está montado.
  const { summary, isLoading, isError, error } = useBankAccountSummary(account.id);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <BancosIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Resumen de Cuenta
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {textOrDash(account.alias)}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Identidad de la cuenta: sale del renglón que el listado ya cargó, así
            que se pinta de inmediato aunque el resumen siga cargando. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Banco">{textOrDash(account.banco_nombre)}</InfoField>
          <InfoField label="No. de cuenta">{textOrDash(account.numero_cuenta)}</InfoField>
          <InfoField label="CLABE">{textOrDash(account.clabe)}</InfoField>
          <InfoField label="Titular">{textOrDash(account.titular)}</InfoField>
          <InfoField label="Sucursal bancaria">
            {textOrDash(account.sucursal_bancaria)}
          </InfoField>
          <InfoField label="Moneda">{textOrDash(account.moneda_codigo)}</InfoField>
          <InfoField label="Fecha de apertura">
            {formatShortDate(account.fecha_apertura, { timeZone: "UTC" })}
          </InfoField>
          <InfoField label="No. de cliente">{textOrDash(account.numero_cliente)}</InfoField>
          <InfoField label="Convenio">{textOrDash(account.convenio)}</InfoField>
        </div>

        {account.observaciones && (
          <div>
            <SectionTitle>Observaciones</SectionTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {account.observaciones}
            </p>
          </div>
        )}

        {isError ? (
          <ErrorState
            title="Error al cargar el resumen"
            message={extractErrorMessage(error, "No se pudo cargar la información.")}
          />
        ) : isLoading || !summary ? (
          // Alto acotado: el default del esqueleto (`h-96`) desborda el diálogo.
          <LoadingSkeleton className="h-64" />
        ) : (
          <>
            <div>
              <SectionTitle>Saldos</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* El saldo sale del RENGLÓN, no del resumen. La acción
                    `/resumen/` también lo devuelve, pero son dos cachés
                    distintas (`["bank-accounts"]` y
                    `["bank-account-summary", id]`) que se refrescan por separado:
                    leyendo cada superficie la suya, el diálogo y la fila que
                    asoma detrás podían mostrar dos saldos distintos de la misma
                    cuenta a la vez, sin señal de cuál era el vigente. Con una
                    sola fuente no pueden discrepar. */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Saldo actual</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-800 dark:text-white">
                    {formatSaldo(account.saldo_actual, account.moneda_codigo)}
                  </p>
                </div>
                {/* Ambos totales se etiquetan explícitamente como cifras DEL MES
                    y se muestran tal cual los entrega el backend. No se
                    recalculan ni se corrigen en el cliente: ver el defecto
                    conocido y aceptado documentado en `ResumenCuentaBancaria`. */}
                <div className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Cargos del mes
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {formatSaldo(summary.total_cargos_mes, account.moneda_codigo)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Abonos del mes
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-sky-600 dark:text-sky-400">
                    {formatSaldo(summary.total_abonos_mes, account.moneda_codigo)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle>Últimos movimientos</SectionTitle>
              <MovimientosTable
                items={summary.ultimos_movimientos}
                monedaCodigo={account.moneda_codigo}
              />
            </div>
          </>
        )}
      </div>
    </MainDialog>
  );
}

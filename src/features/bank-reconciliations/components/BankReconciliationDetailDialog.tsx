"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { ConciliacionIcon } from "@/src/components/Icons";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatSaldo } from "@/src/features/bank-accounts/utils/bankAccountMoney";
import { CONCILIACION_ESTATUS_CONFIG } from "../constants/conciliacionEstatus";
import {
  centavosAMoneda,
  conciliacionCuadra,
  diferenciaEnCentavos,
} from "../schemas/bank-reconciliation.schema";
import type { ConciliacionEnDetalle } from "../interfaces/bank-reconciliation.interface";

interface BankReconciliationDetailDialogProps {
  /**
   * La conciliación a mostrar, ya en memoria — SIN fetch propio.
   *
   * Normalmente es la fila del listado: listado y detalle comparten
   * `ConciliacionBancariaSerializer`, así que la fila trae lo mismo que el
   * retrieve. Justo después de preparar puede ser, en cambio, la respuesta de
   * `preparar` normalizada (ver `conciliacionEnDetalleDesdePreparar`), porque la
   * fila todavía no llegó al listado. Por eso el tipo es solo lo que este diálogo
   * lee, y no el modelo completo.
   */
  conciliacion: ConciliacionEnDetalle;
  /**
   * Código ISO de la moneda de la cuenta conciliada. No viaja en la fila y cada
   * cuenta tiene la suya, así que lo resuelve la vista contra el catálogo.
   */
  monedaCodigo: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de solo lectura de una conciliación bancaria.
 *
 * NO muestra los movimientos conciliados: `ConciliacionDetalle` existe en el
 * backend pero no viaja ni en el listado ni en el detalle —la única respuesta
 * que los trae es la de `preparar`—, así que enseñarlos aquí obligaría a una
 * consulta que no existe. El desglose queda para una fase 2.
 */
export function BankReconciliationDetailDialog({
  conciliacion,
  monedaCodigo,
  open,
  onOpenChange,
}: BankReconciliationDetailDialogProps) {
  // Mismo cálculo que el listado y que el backend al cerrar: centavos enteros,
  // tolerancia de un centavo.
  const diferenciaCentavos = diferenciaEnCentavos(
    conciliacion.saldo_estado_cuenta,
    conciliacion.saldo_libros,
  );
  const cuadra = conciliacionCuadra(
    conciliacion.saldo_estado_cuenta,
    conciliacion.saldo_libros,
  );

  // `timeZone: "UTC"`: las fechas son "YYYY-MM-DD" y `new Date` las lee como
  // medianoche UTC; sin la opción, al oeste de Greenwich el periodo se pintaría
  // un día antes. Mismo trato que el resto de finanzas.
  const periodo = `${
    conciliacion.fecha_inicio
      ? formatShortDate(conciliacion.fecha_inicio, { timeZone: "UTC" })
      : "—"
  } → ${
    conciliacion.fecha_final
      ? formatShortDate(conciliacion.fecha_final, { timeZone: "UTC" })
      : "—"
  }`;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ConciliacionIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de la Conciliación
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {textOrDash(conciliacion.cuenta_bancaria_alias)} · {periodo}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Cuenta bancaria">
            {textOrDash(conciliacion.cuenta_bancaria_alias)}
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge
              status={conciliacion.estatus}
              config={CONCILIACION_ESTATUS_CONFIG}
            />
          </InfoField>
          <InfoField label="Periodo">{periodo}</InfoField>
        </div>

        {/* El cuadre: los dos saldos enfrentados y su diferencia. Es el motivo
            de existir de la pantalla, así que va destacado y no dentro de la
            rejilla de datos. */}
        <div>
          <SectionTitle>Cuadre del periodo</SectionTitle>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-white/10">
              <div className="px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Saldo del estado de cuenta
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatSaldo(conciliacion.saldo_estado_cuenta, monedaCodigo)}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Saldo en libros
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatSaldo(conciliacion.saldo_libros, monedaCodigo)}
                </p>
              </div>
            </div>
            <div
              className={`px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-baseline justify-between gap-3 ${
                cuadra
                  ? "bg-emerald-50/60 dark:bg-emerald-500/5"
                  : "bg-rose-50/60 dark:bg-rose-500/5"
              }`}
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Diferencia
                </p>
                <p
                  className={`mt-1 text-xl font-bold tabular-nums ${
                    cuadra
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatSaldo(centavosAMoneda(diferenciaCentavos), monedaCodigo)}
                </p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  cuadra
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {cuadra ? "El periodo cuadra" : "El periodo no cuadra"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">
            {conciliacion.estatus === "Borrador"
              ? cuadra
                ? "Puede cerrarse: al hacerlo, los movimientos del periodo quedan marcados como Conciliado."
                : "Para cerrarla, ambos saldos deben coincidir. Si el saldo del estado de cuenta se capturó mal, vuelve a prepararla con el valor correcto."
              : "El periodo ya no admite cambios."}
          </p>
        </div>

        <div>
          <SectionTitle>Observaciones</SectionTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {textOrDash(conciliacion.observaciones)}
          </p>
        </div>
      </div>
    </MainDialog>
  );
}

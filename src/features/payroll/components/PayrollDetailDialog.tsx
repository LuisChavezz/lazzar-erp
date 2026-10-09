"use client";

import { PayrollIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  InfoGrid,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatLocalDate, formatShortDate } from "@/src/utils/formatDate";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { moneyToCents } from "@/src/utils/moneyCents";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import {
  ESTADO_CANCELADA,
  ESTADO_NOMINA_CFG,
  ESTADO_PAGADA,
  getTipoDetalleLabel,
} from "../constants/payrollChoices";
import { formatMoneyOrDash, type PayrollRow } from "./PayrollColumns";

interface PayrollDetailDialogProps {
  /**
   * La nómina YA cargada por el listado, con sus nombres resueltos: sin fetch
   * propio, porque listado y detalle de `/hr/nominas/` comparten la misma
   * forma, `detalles` incluidos.
   */
  payroll: PayrollRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TH = "px-3 py-2 font-semibold";

/**
 * Detalle de una nómina: cabecera, renglones y totales del servidor.
 * `pagada` y `cancelada` son de solo lectura; aquí solo se consultan.
 */
export function PayrollDetailDialog({ payroll, open, onOpenChange }: PayrollDetailDialogProps) {
  // `/usuarios/` es lento: se pide aquí, no en el listado (mismo criterio que
  // productividad). Falla o id ausente → "Usuario #N".
  const { data: users, isError: isUsersError } = useUsers();
  const usersById = users ? new Map(users.map((user) => [user.id, user])) : null;
  const creadoPorNombre = resolveUserName(payroll.creado_por, usersById, isUsersError);

  const netoCents = moneyToCents(payroll.neto);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <PayrollIcon className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de nómina
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {payroll.empleado_nombre} · {payroll.periodo_label}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Empleado">{payroll.empleado_nombre}</InfoField>
          <InfoField label="Sucursal">{payroll.sucursal_nombre}</InfoField>
          <InfoField label="Estado">
            <StatusBadge status={payroll.estado} config={ESTADO_NOMINA_CFG} />
          </InfoField>
          <InfoField label="Periodo">{payroll.periodo_label}</InfoField>
          <InfoField label="Fecha de pago">
            {payroll.fecha_pago ? formatLocalDate(payroll.fecha_pago) : "—"}
          </InfoField>
          <InfoField label="Salario base mensual">
            <span className="tabular-nums">{formatMoneyOrDash(payroll.salario_base)}</span>
          </InfoField>
          <InfoField label="Días pagados">{payroll.dias_pagados}</InfoField>
          <InfoField label="Horas extra pagadas">
            {formatQuantityValue(payroll.horas_extra_pagadas)}
          </InfoField>
          <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
            <span className="whitespace-pre-line">{textOrDash(payroll.observaciones)}</span>
          </InfoField>
        </div>

        <div>
          <SectionTitle>Percepciones y deducciones</SectionTitle>
          {payroll.detalles.length === 0 ? (
            <EmptyLines>La nómina no tiene renglones.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className={TH}>Código</th>
                  <th className={TH}>Concepto</th>
                  <th className={TH}>Tipo</th>
                  <th className={`${TH} text-right`}>Cantidad</th>
                  <th className={`${TH} text-right`}>Monto</th>
                </>
              }
            >
              {payroll.detalles.map((line) => (
                <tr key={line.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-3 py-2 whitespace-nowrap">{textOrDash(line.codigo)}</td>
                  <td className="px-3 py-2">{line.concepto}</td>
                  <td
                    className={`px-3 py-2 whitespace-nowrap ${
                      line.tipo === "deduccion"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {getTipoDetalleLabel(line.tipo)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {line.cantidad}
                    {line.unidad ? ` ${line.unidad}` : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {formatMoneyOrDash(line.monto)}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-right text-xs">
          <InfoField label="Percepciones">
            <span className="tabular-nums">{formatMoneyOrDash(payroll.total_percepciones)}</span>
          </InfoField>
          <InfoField label="Deducciones">
            <span className="tabular-nums">{formatMoneyOrDash(payroll.total_deducciones)}</span>
          </InfoField>
          <InfoField label="Neto">
            <span
              className={`tabular-nums text-sm font-bold ${
                netoCents !== null && netoCents < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatMoneyOrDash(payroll.neto)}
            </span>
          </InfoField>
        </div>

        <div>
          <SectionTitle>Trazabilidad</SectionTitle>
          <div className="px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 space-y-3">
            <InfoGrid>
              <InfoField label="Generada por">{creadoPorNombre ?? "—"}</InfoField>
              <InfoField label="Fecha de generación">
                {formatShortDate(payroll.fecha_generacion, { timeZone: MEXICO_TIME_ZONE })}
              </InfoField>
            </InfoGrid>
            {(payroll.estado === ESTADO_PAGADA || payroll.estado === ESTADO_CANCELADA) && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nómina {payroll.estado === ESTADO_PAGADA ? "pagada" : "cancelada"}: es de solo
                lectura.
              </p>
            )}
          </div>
        </div>
      </div>
    </MainDialog>
  );
}

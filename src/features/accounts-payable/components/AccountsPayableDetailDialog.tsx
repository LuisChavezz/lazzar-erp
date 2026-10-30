"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoTile,
  InfoTileGrid,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { CxpIcon, InfoIcon } from "@/src/components/Icons";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  CXP_ESTATUS_CONFIG,
  CXP_VENCIDA_BADGE_CONFIG,
  CXP_VENCIDA_BADGE_KEY,
} from "../constants/cxpEstatus";
import {
  hasAppliedPayments,
  isCuentaPorPagarVencida,
} from "../utils/accounts-payable.utils";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";

interface AccountsPayableDetailDialogProps {
  /**
   * La cuenta ya cargada por el listado — SIN fetch propio: `GET
   * /finanzas/cuentas-por-pagar/` y el retrieve comparten el mismo
   * `CuentaPorPagarSerializer`, así que el renglón ES el documento completo.
   *
   * La vista la busca en su arreglo en cada render, de modo que si un pago
   * aplicado en otra pantalla invalida el listado, este diálogo refleja el saldo
   * y el estatus nuevos sin cerrarse.
   */
  cuenta: CuentaPorPagar;
  /** "Hoy" en la zona del backend, el mismo que usa la tabla. */
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountsPayableDetailDialog({
  cuenta,
  today,
  open,
  onOpenChange,
}: AccountsPayableDetailDialogProps) {
  const money = (value: string) =>
    formatMoneyValueOrDash(value, cuenta.moneda_codigo);
  const vencida = isCuentaPorPagarVencida(cuenta, today);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle de la Cuenta por Pagar"
          subtitle={`#${cuenta.id}`}
          statusColor="sky"
          icon={CxpIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Encabezado: lo que se busca primero al abrir el registro. */}
        <InfoTileGrid>
          <InfoTile label="Estatus">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={cuenta.estatus} config={CXP_ESTATUS_CONFIG} />
              {vencida && (
                <StatusBadge status={CXP_VENCIDA_BADGE_KEY} config={CXP_VENCIDA_BADGE_CONFIG} />
              )}
            </div>
          </InfoTile>
          <InfoTile label="Proveedor">{textOrDash(cuenta.proveedor_nombre)}</InfoTile>
          <InfoTile label="Saldo">
            <span className="tabular-nums">{money(cuenta.saldo)}</span>
          </InfoTile>
          <InfoTile label="Factura">
            <span className="font-mono">
              {cuenta.factura_proveedor_folio || `#${cuenta.factura_proveedor}`}
            </span>
          </InfoTile>
          <InfoTile label="Total">
            <span className="tabular-nums">{money(cuenta.total)}</span>
          </InfoTile>
          <InfoTile label="Pagado">
            {/* Calculado por el BACKEND (`total − saldo`): se muestra tal cual. */}
            <span className="tabular-nums">{money(cuenta.total_pagado)}</span>
          </InfoTile>
          <InfoTile label="Fecha de emisión">
            {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". */}
            {formatShortDate(cuenta.fecha_emision, { timeZone: "UTC" })}
          </InfoTile>
          <InfoTile label="Vencimiento">
            <span className={vencida ? "text-red-600 dark:text-red-400" : undefined}>
              {formatShortDate(cuenta.fecha_vencimiento, { timeZone: "UTC" })}
            </span>
          </InfoTile>
          <InfoTile label="Último pago">
            {formatShortDate(cuenta.fecha_ultimo_pago, { timeZone: "UTC" })}
          </InfoTile>
          <InfoTile label="Moneda">{textOrDash(cuenta.moneda_codigo)}</InfoTile>
        </InfoTileGrid>

        {cuenta.fecha_vencimiento === null && (
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
            Esta cuenta no tiene fecha de vencimiento, así que nunca se marca como
            vencida.
          </p>
        )}

        {hasAppliedPayments(cuenta) && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <InfoIcon
              className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Esta cuenta tiene pagos aplicados por {money(cuenta.total_pagado)}, así
              que no puede eliminarse. Cancela los pagos aplicados primero desde{" "}
              <Link
                href="/finance/payments"
                className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-200"
              >
                Pagos
              </Link>
              .
            </p>
          </div>
        )}

        {cuenta.observaciones && (
          <div>
            <SectionTitle>Observaciones</SectionTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {cuenta.observaciones}
            </p>
          </div>
        )}
      </div>
    </MainDialog>
  );
}

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
import { ReceiptIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  MOVIMIENTO_ESTATUS_CONFIG,
  TIPO_MOVIMIENTO_CONFIG,
} from "@/src/features/bank-accounts/constants/movimientoEstatus";
import { PAGO_ESTATUS_CONFIG } from "../constants/paymentStatus";
import { useMovimientosByPago } from "../hooks/useMovimientosByPago";
import type { Pago } from "../interfaces/payment.interface";

interface PaymentDetailDialogProps {
  /**
   * El pago ya cargado por el listado — sin fetch propio de la cabecera ni de
   * las líneas: `GET /finanzas/pagos/` y el retrieve comparten el mismo
   * `PagoSerializer`, y `pago_detalles` viene anidado en ambos. Lo único que el
   * listado NO trae son los movimientos bancarios, que sí llevan su consulta
   * aparte (ver `useMovimientosByPago`).
   */
  pago: Pago;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDetailDialog({
  pago,
  open,
  onOpenChange,
}: PaymentDetailDialogProps) {
  const { movimientos, isLoading, isError, error } = useMovimientosByPago(pago.id);

  // El pago no expone moneda propia: la divisa es la de las CxP aplicadas, que
  // el alta obliga a ser una sola (candado de moneda en `CxpSelectorDialog`).
  // Aquí no está disponible desde el renglón, así que los importes se muestran
  // con el formato por defecto — la moneda concreta se ve en el detalle de cada
  // CxP en su propio módulo.
  const money = (value: string) => formatMoneyValueOrDash(value);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ReceiptIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle del Pago
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {`#${pago.id}`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Cabecera: sale del renglón que el listado ya cargó. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
          <InfoField label="Proveedor">{textOrDash(pago.proveedor_nombre)}</InfoField>
          <InfoField label="Cuenta bancaria">
            {textOrDash(pago.cuenta_bancaria_alias)}
          </InfoField>
          <InfoField label="Fecha de pago">
            {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". Sin esto un
                navegador al oeste de Greenwich pinta el día anterior. */}
            {formatShortDate(pago.fecha_pago, { timeZone: "UTC" })}
          </InfoField>
          <InfoField label="Método">{pago.metodo_pago}</InfoField>
          <InfoField label="Referencia">{textOrDash(pago.referencia)}</InfoField>
          <InfoField label="Referencia de operación">
            {textOrDash(pago.referencia_operacion)}
          </InfoField>
          <InfoField label="Total pagado">
            <span className="tabular-nums font-semibold">{money(pago.total_pagado)}</span>
          </InfoField>
          <InfoField label="Estatus">
            <StatusBadge status={pago.estatus} config={PAGO_ESTATUS_CONFIG} />
          </InfoField>
        </div>

        {pago.observaciones && (
          <div>
            <SectionTitle>Observaciones</SectionTitle>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {pago.observaciones}
            </p>
          </div>
        )}

        {/* ── Cuentas por pagar aplicadas ─────────────────────────────── */}
        <div>
          <SectionTitle>Cuentas por pagar aplicadas</SectionTitle>
          {pago.pago_detalles.length === 0 ? (
            <EmptyLines>Este pago no tiene cuentas aplicadas.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Cuenta por pagar</th>
                  <th className="px-3 py-2 font-medium text-right">Importe aplicado</th>
                  <th className="px-3 py-2 font-medium">Observaciones</th>
                </>
              }
            >
              {pago.pago_detalles.map((linea) => (
                <tr
                  key={linea.id}
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {`CxP #${linea.cxp}`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {money(linea.importe_aplicado)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {textOrDash(linea.observaciones)}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </div>

        {/* ── Movimientos bancarios ligados ───────────────────────────── */}
        <div>
          <SectionTitle>Movimientos bancarios ligados</SectionTitle>
          {/* Los tres estados se resuelven DENTRO de la sección: el diálogo (y su
              cabecera, que ya tiene todos sus datos) nunca se desmonta por un
              fallo de esta consulta secundaria. */}
          {isError ? (
            <ErrorState
              title="Error al cargar los movimientos"
              message={extractErrorMessage(error, "No se pudo cargar la información.")}
            />
          ) : isLoading ? (
            <LoadingSkeleton className="h-24" />
          ) : movimientos.length === 0 ? (
            <EmptyLines>Este pago no generó movimientos bancarios.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Concepto</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium text-right">Importe</th>
                  <th className="px-3 py-2 font-medium">Estatus</th>
                </>
              }
            >
              {movimientos.map((movimiento) => (
                <tr
                  key={movimiento.id}
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatShortDate(movimiento.fecha, { timeZone: "UTC" })}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {textOrDash(movimiento.concepto)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={movimiento.tipo_movimiento}
                      config={TIPO_MOVIMIENTO_CONFIG}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {money(movimiento.importe)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={movimiento.estatus}
                      config={MOVIMIENTO_ESTATUS_CONFIG}
                    />
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </div>
      </div>
    </MainDialog>
  );
}

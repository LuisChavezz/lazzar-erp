"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import {
  EmptyLines,
  InfoTile,
  InfoTileGrid,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { ReceiptIcon } from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatAmountNoCurrency } from "@/src/utils/formatCurrency";
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
  // Aquí no está disponible desde el renglón, así que los importes van sin
  // símbolo y con 2 decimales (un "$" afirmaría pesos) — la moneda concreta se
  // ve en el detalle de cada CxP en su propio módulo.
  const money = (value: string) => formatAmountNoCurrency(value);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={true}
      title={
        <DialogHeader
          title="Detalle del Pago"
          subtitle={`#${pago.id}`}
          statusColor="emerald"
          icon={ReceiptIcon}
        />
      }
    >
      <div className="space-y-5">
        {/* Cabecera: sale del renglón que el listado ya cargó. */}
        <InfoTileGrid>
          <InfoTile label="Estatus">
            <StatusBadge status={pago.estatus} config={PAGO_ESTATUS_CONFIG} />
          </InfoTile>
          <InfoTile label="Proveedor">{textOrDash(pago.proveedor_nombre)}</InfoTile>
          <InfoTile label="Total pagado">
            <span className="tabular-nums">{money(pago.total_pagado)}</span>
          </InfoTile>
          <InfoTile label="Fecha de pago">
            {/* `timeZone: "UTC"`: fecha-calendario "YYYY-MM-DD". Sin esto un
                navegador al oeste de Greenwich pinta el día anterior. */}
            {formatShortDate(pago.fecha_pago, { timeZone: "UTC" })}
          </InfoTile>
          <InfoTile label="Método">{pago.metodo_pago}</InfoTile>
          <InfoTile label="Cuenta bancaria">{textOrDash(pago.cuenta_bancaria_alias)}</InfoTile>
          <InfoTile label="Referencia">{textOrDash(pago.referencia)}</InfoTile>
          <InfoTile label="Referencia de operación">
            {textOrDash(pago.referencia_operacion)}
          </InfoTile>
        </InfoTileGrid>

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

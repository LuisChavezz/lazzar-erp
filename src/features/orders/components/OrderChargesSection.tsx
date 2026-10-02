"use client";

import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { PedidoDetail } from "../interfaces/order.interface";
import { useOrderMoney } from "./OrderCurrencyContext";
import { AmountRow, SheetCard } from "./OrderSheetPrimitives";

// Cargos de cabecera, en el orden del formulario (Flete, Seguros, Anticipo) y
// luego los demás importes de cabecera que el pedido trae y que la página ya
// mostraba. Todos opcionales: solo se pintan si son > 0, como hasta ahora.
const CHARGES: { key: keyof PedidoDetail; label: string }[] = [
  { key: "flete", label: "Flete" },
  { key: "seguros", label: "Seguros" },
  { key: "anticipo", label: "A cuenta (Anticipo)" },
  { key: "envio", label: "Envío" },
  { key: "programa_bordados", label: "Programa bordados" },
  { key: "serigrafia", label: "Serigrafía" },
  { key: "reflejante", label: "Reflejante" },
  { key: "bordado_pantalones_extras", label: "Bordado pantalones (extras)" },
];

interface OrderChargesSectionProps {
  pedido: PedidoDetail;
  showAccounting: boolean;
}

/**
 * Tarjeta inferior derecha del formulario: "Cargos Adicionales" y "Servicios
 * Extras" a la izquierda, totales a la derecha.
 *
 * Sin datos contables, cargos y totales desaparecen por completo (no hay
 * columnas vacías ni guiones en lugar de dinero) y queda solo la lista de
 * servicios extra, sin montos.
 *
 * Los totales son EXACTAMENTE los del backend (`subtotal`, `descuento_global`,
 * `ieps`, `gran_total`): no se recalcula nada. El IVA va como tasa, igual que
 * antes, y no hay "Saldo pendiente": ambos serían cálculos de cliente.
 */
export function OrderChargesSection({ pedido, showAccounting }: OrderChargesSectionProps) {
  const { formatMoney, currencyLabel } = useOrderMoney();
  const visibleCharges = CHARGES.filter(
    (charge) => safeParseAmount(pedido[charge.key] as string | null | undefined) > 0,
  );

  const extraServices = (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
        Servicios Extras ({pedido.servicios_extras.length})
      </h3>
      {pedido.servicios_extras.length === 0 ? (
        <EmptyLines>Este pedido no tiene servicios extra.</EmptyLines>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {pedido.servicios_extras.map((servicio) => (
            <div key={servicio.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-700 dark:text-slate-200 truncate">{servicio.nombre}</span>
                {!servicio.visible_en_factura && (
                  <span className="inline-flex items-center rounded bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    No visible en factura
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs tabular-nums">
                <span className="text-slate-500 dark:text-slate-400">Cant. {servicio.cantidad}</span>
                {showAccounting && (
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {formatMoney(servicio.monto)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!showAccounting) {
    return (
      <SheetCard>
        {extraServices}
      </SheetCard>
    );
  }

  return (
    <SheetCard>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Cargos Adicionales</h3>
          {visibleCharges.length === 0 ? (
            <EmptyLines>Este pedido no tiene cargos adicionales.</EmptyLines>
          ) : (
            <div className="space-y-2">
              {visibleCharges.map((charge) => (
                <AmountRow
                  key={charge.key as string}
                  label={charge.label}
                  value={formatMoney(pedido[charge.key] as string | undefined)}
                />
              ))}
            </div>
          )}

          <hr className="border-slate-200 dark:border-slate-700" />

          {extraServices}
        </div>

        <div className="space-y-3 pl-0 md:pl-8 md:border-l border-slate-100 dark:border-slate-800">
          <AmountRow label="Subtotal" value={formatMoney(pedido.subtotal)} />
          {safeParseAmount(pedido.descuento_global) > 0 && (
            <AmountRow label="Descuento global" value={formatMoney(pedido.descuento_global)} />
          )}
          {safeParseAmount(pedido.ieps) > 0 && (
            <AmountRow label="IEPS" value={formatMoney(pedido.ieps)} />
          )}
          <AmountRow label="Moneda" value={currencyLabel ?? "—"} />
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">IVA</span>
            <span className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {pedido.iva !== undefined ? `${pedido.iva}%` : "—"}
            </span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 my-2 pt-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-lg font-bold text-slate-800 dark:text-white">Gran Total</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                {formatMoney(pedido.gran_total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SheetCard>
  );
}

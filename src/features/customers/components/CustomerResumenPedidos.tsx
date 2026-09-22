"use client";

import Link from "next/link";
import {
  EmptyLines,
  LineItemsTable,
  Section,
} from "@/src/components/DetailDialogPrimitives";
import { getPedidoEstatusConfig } from "@/src/features/orders/constants/pedidoStatus";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type { ResumenComercial } from "../interfaces/customer.interface";
import { buildPedidoEstatusChips } from "../utils/customer-detail";

const EstatusPill = ({ label, className }: { label: string; className: string }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${className}`}
  >
    {label}
  </span>
);

export const CustomerResumenPedidos = ({ resumen }: { resumen: ResumenComercial }) => {
  const chips = buildPedidoEstatusChips(resumen.pedidos_por_estatus);

  return (
    <div className="space-y-6">
      <Section title="Pedidos por estatus">
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.key}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${chip.className} ${
                chip.count === 0 ? "opacity-60" : ""
              }`}
            >
              <span>{chip.label}</span>
              <span className="font-mono font-bold tabular-nums">{chip.count}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Pedidos recientes">
        {resumen.pedidos_recientes.length === 0 ? (
          <EmptyLines>Este cliente aún no tiene pedidos.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Folio</th>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Estatus</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </>
            }
          >
            {resumen.pedidos_recientes.map((pedido) => {
              const estatus = getPedidoEstatusConfig(pedido.estatus);
              return (
                <tr key={pedido.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-3 py-2">
                    {/* `?from=customers` hace que el "Volver" del detalle 360°
                        regrese al listado de clientes. Mismo estilo de enlace a
                        pedido que el resto de páginas de detalle
                        (`EmbroideryOrderDetailContent`): en color desde el
                        reposo, no solo al pasar el cursor. */}
                    <Link
                      href={`/orders/${pedido.id}?from=customers`}
                      title="Ver detalle"
                      className="font-mono text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                    >
                      {pedido.folio}
                    </Link>
                  </td>
                  {/* Timestamp real: sin `timeZone: "UTC"` (ver `formatShortDate`). */}
                  <td className="px-3 py-2 whitespace-nowrap">{formatShortDate(pedido.fecha)}</td>
                  <td className="px-3 py-2">
                    <EstatusPill label={estatus.label} className={estatus.className} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatMoneyValue(pedido.gran_total, { currency: pedido.moneda })}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </Section>
    </div>
  );
};

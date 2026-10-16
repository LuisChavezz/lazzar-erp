"use client";

import {
  EmptyLines,
  LineItemsTable,
  Section,
} from "@/src/components/DetailDialogPrimitives";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { formatKpiCurrencyAmount } from "@/src/utils/kpiFormat";
import type { CarteraMoneda } from "../interfaces/customer.interface";

type CarteraAmountKey = Exclude<keyof CarteraMoneda, "moneda">;

/** Columnas de importe, en el orden del contrato. */
const COLUMNS: { key: CarteraAmountKey; label: string }[] = [
  { key: "saldo_total", label: "Saldo total" },
  { key: "por_vencer", label: "Por vencer" },
  { key: "vencido_1_30", label: "1–30 días" },
  { key: "vencido_31_60", label: "31–60 días" },
  { key: "vencido_61_90", label: "61–90 días" },
  { key: "vencido_91_120", label: "91–120 días" },
  { key: "vencido_mas_120", label: "Más de 120 días" },
];

const TH_CLASS = "px-3 py-2 font-medium whitespace-nowrap";
const TD_CLASS = "px-3 py-2 whitespace-nowrap";

interface CustomerCarteraProps {
  cartera: CarteraMoneda[];
  title?: string;
  /**
   * Texto con `cartera` vacía. Por defecto afirma que el cliente no debe nada,
   * que es lo que significa un `[]` en el detalle del cliente. Donde un `[]`
   * también puede significar "no puedes ver a este cliente" (la cartera del
   * detalle de una oportunidad) se pasa uno neutro.
   */
  emptyMessage?: string;
}

/**
 * Antigüedad de saldos por moneda: una fila por moneda con su saldo total, lo
 * que está por vencer y lo vencido por tramo de días.
 *
 * Presentacional y SIN consulta propia: recibe el arreglo `cartera` tal cual lo
 * entrega el backend, para poder montarse en cualquier detalle que lo traiga
 * (`resumen_comercial.cartera` del cliente, `cartera` del detalle de una
 * oportunidad). Los importes llegan como
 * string y solo se convierten para formatearlos; aquí no se suma ni se compara
 * nada, y las monedas nunca se mezclan.
 */
export const CustomerCartera = ({
  cartera,
  title = "Antigüedad de saldos de este cliente",
  emptyMessage = "Este cliente no tiene saldo pendiente.",
}: CustomerCarteraProps) => (
  <Section title={title}>
    {cartera.length === 0 ? (
      <EmptyLines>{emptyMessage}</EmptyLines>
    ) : (
      <LineItemsTable
        head={
          <>
            <th className={TH_CLASS}>Moneda</th>
            {COLUMNS.map((column) => (
              <th key={column.key} className={`${TH_CLASS} text-right`}>
                {column.label}
              </th>
            ))}
          </>
        }
      >
        {cartera.map((row) => (
          <tr key={row.moneda} className="text-slate-700 dark:text-slate-200">
            <td className={`${TD_CLASS} font-semibold`}>{row.moneda}</td>
            {COLUMNS.map((column) => (
              <td
                key={column.key}
                className={`${TD_CLASS} text-right tabular-nums ${
                  column.key === "saldo_total" ? "font-semibold" : ""
                } ${
                  // Un tramo en cero se atenúa para que resalten los que tienen saldo.
                  safeParseAmount(row[column.key]) === 0
                    ? "text-slate-400 dark:text-slate-500"
                    : ""
                }`}
              >
                {/* Símbolo de su moneda (`formatKpiCurrencyAmount`); el código
                    ya va en la primera columna. */}
                {formatKpiCurrencyAmount(row[column.key], row.moneda)}
              </td>
            ))}
          </tr>
        ))}
      </LineItemsTable>
    )}
  </Section>
);

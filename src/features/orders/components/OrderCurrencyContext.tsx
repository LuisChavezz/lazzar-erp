"use client";

import type React from "react";
import { createContext, useContext } from "react";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import { formatMoneyValueOrDash, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";

/**
 * Moneda REAL del pedido para formatear sus importes.
 *
 * El pedido solo trae la PK (`moneda`); el código ISO sale del catálogo de
 * monedas con el MISMO hook y la misma caché (`["currencies"]`) que usa el
 * formulario de cotización. El hook no admite `enabled`, así que el catálogo se
 * pide montando `OrderCurrencyProvider`, y quien lo monta lo hace SOLO cuando el
 * usuario ve datos contables: sin ellos no hay importes que formatear y la
 * petición no sale.
 *
 * Mientras el catálogo carga, si falla o si la PK no aparece, los importes se
 * pintan SIN símbolo: nunca se asume pesos, porque un "$" sobre un pedido en
 * otra moneda afirmaría algo falso.
 */
interface OrderCurrencyValue {
  currency: Currency | null;
}

const OrderCurrencyContext = createContext<OrderCurrencyValue>({ currency: null });

export function OrderCurrencyProvider({
  monedaId,
  children,
}: {
  monedaId: number;
  children: React.ReactNode;
}) {
  const { data: currencies } = useCurrencies();
  const currency = currencies?.find((item) => item.id === monedaId) ?? null;
  return (
    <OrderCurrencyContext.Provider value={{ currency }}>{children}</OrderCurrencyContext.Provider>
  );
}

export function useOrderMoney() {
  const { currency } = useContext(OrderCurrencyContext);
  const options: Intl.NumberFormatOptions = currency
    ? { currency: currency.codigo_iso }
    : NO_CURRENCY_FORMAT;
  return {
    /** Importe del backend formateado en la moneda del pedido; "—" si falta. */
    formatMoney: (value: string | number | null | undefined) =>
      formatMoneyValueOrDash(value, options),
    /** "MXN - Peso mexicano", o `null` mientras no se conozca. */
    currencyLabel: currency ? `${currency.codigo_iso} - ${currency.nombre}` : null,
  };
}

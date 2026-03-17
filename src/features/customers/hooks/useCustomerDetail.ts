"use client";

import { useMemo } from "react";
import { useCustomerStore } from "../stores/customer.store";
import { buildCustomerKpis, getSelectedCustomer } from "../utils/customer-detail";

export const useCustomerDetail = (customerId: string) => {
  const customers = useCustomerStore((state) => state.customers);
  const hasHydrated = useCustomerStore((state) => state.hasHydrated);

  // Resuelve el cliente seleccionado usando el id de la ruta.
  const selectedCustomer = useMemo(
    () => getSelectedCustomer(customers, customerId),
    [customerId, customers]
  );

  // Genera KPIs derivados del cliente para que el componente de UI sea solo de presentación.
  const items = useMemo(
    () => buildCustomerKpis(),
    []
  );

  return {
    hasHydrated,
    selectedCustomer,
    items,
  };
};

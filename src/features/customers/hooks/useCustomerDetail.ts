"use client";

import { useMemo } from "react";
import { useCustomers } from "./useCustomers";
import { buildCustomerKpis, getSelectedCustomer } from "../utils/customer-detail";

export const useCustomerDetail = (customerId: string) => {
  const { customers, isLoading } = useCustomers();
  const selectedCustomer = useMemo(
    () => getSelectedCustomer(customers, customerId),
    [customerId, customers]
  );
  const items = useMemo(
    () => buildCustomerKpis(),
    []
  );

  return {
    isLoading,
    selectedCustomer,
    items,
  };
};

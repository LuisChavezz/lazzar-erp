"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import KpiGrid from "@/src/components/KpiGrid";
import { CustomerViews } from "./CustomerViews";
import { useCustomerDetail } from "../hooks/useCustomerDetail";

interface CustomerDetailContentProps {
  customerId: string;
}

export const CustomerDetailContent = ({ customerId }: CustomerDetailContentProps) => {
  const router = useRouter();
  const { hasHydrated, selectedCustomer, items } = useCustomerDetail(customerId);

  // Redirige al listado cuando la store terminó de hidratar y no existe el cliente solicitado.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!selectedCustomer) {
      router.replace("/sales/customers");
    }
  }, [hasHydrated, router, selectedCustomer]);



  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCustomer?.nombre}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {selectedCustomer?.razonSocial} · Vendedor: {selectedCustomer?.vendedor}
        </p>
      </div>

      <KpiGrid items={items} />

      <CustomerViews />
    </div>
  );
};

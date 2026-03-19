"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import KpiGrid from "@/src/components/KpiGrid";
import { Loader } from "@/src/components/Loader";
import { CustomerViews } from "./CustomerViews";
import { useCustomerDetail } from "../hooks/useCustomerDetail";

interface CustomerDetailContentProps {
  customerId: string;
}

export const CustomerDetailContent = ({ customerId }: CustomerDetailContentProps) => {
  const router = useRouter();
  const { isLoading, selectedCustomer, items } = useCustomerDetail(customerId);

  useEffect(() => {
    if (isLoading) return;
    if (!selectedCustomer) {
      router.replace("/sales/customers");
    }
  }, [isLoading, router, selectedCustomer]);

  if (isLoading) {
    return <Loader title="Cargando cliente" message="Obteniendo detalle del cliente..." />;
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCustomer?.nombre}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {selectedCustomer?.razon_social} · {selectedCustomer?.correo}
        </p>
      </div>
      <KpiGrid items={items} />
      <CustomerViews />
    </div>
  );
};

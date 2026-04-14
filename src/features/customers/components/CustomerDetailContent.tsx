"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import KpiGrid from "@/src/components/KpiGrid";
import { WarningFilledIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { CustomerViews } from "./CustomerViews";
import { useCustomer } from "../hooks/useCustomer";
import { buildCustomerKpis } from "../utils/customer-detail";

interface CustomerDetailContentProps {
  customerId: string;
}

export const CustomerDetailContent = ({ customerId }: CustomerDetailContentProps) => {
  const router = useRouter();
  const { data: selectedCustomer, isLoading, isError } = useCustomer(customerId);
  const items = useMemo(() => buildCustomerKpis(), []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (isError || !selectedCustomer) {
      router.replace("/sales/customers");
    }
  }, [isError, isLoading, router, selectedCustomer]);

  if (isLoading) {
    return <Loader title="Cargando cliente" message="Obteniendo detalle del cliente..." />;
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCustomer?.nombre}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedCustomer?.razon_social} · {selectedCustomer?.correo}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 shrink-0">
          <div className="flex gap-3 items-start">
            <div className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <WarningFilledIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Datos de prueba</p>
              <p className="text-amber-700 dark:text-amber-300">Los valores mostrados en esta pantalla son valores de prueba.</p>
            </div>
          </div>
        </div>
      </div>

      <KpiGrid items={items} />
      <CustomerViews />
    </div>
  );
};

"use client";

import { useMemo } from "react";
import { TrendingUpIcon, ClockIcon, OrdenesIcon } from "../../../components/Icons";
import { useOrderStore } from "../stores/order.store";
import { formatCurrency } from "@/src/utils/formatCurrency";
import {
  getCriticalOrdersCount,
  getOrdersDueSoonCount,
  getReceivableOrdersCount,
  getTotalReceivableBalance,
} from "../utils/orderMetrics";

export const OrderStats = () => {
  const orders = useOrderStore((state) => state.orders);

  const { dueSoonCount, receivableBalance, receivableCount, criticalCount } = useMemo(
    () => ({
      dueSoonCount: getOrdersDueSoonCount(orders, 7),
      receivableBalance: getTotalReceivableBalance(orders),
      receivableCount: getReceivableOrdersCount(orders),
      criticalCount: getCriticalOrdersCount(orders),
    }),
    [orders]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <ClockIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg">
            {dueSoonCount.toLocaleString("es-MX")}
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          Pedidos por vencer (7 días)
        </p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
          {dueSoonCount.toLocaleString("es-MX")}
        </h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <TrendingUpIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
            {receivableCount.toLocaleString("es-MX")}
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          Saldo total por cobrar
        </p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
          {formatCurrency(receivableBalance)}
        </h3>
      </div>

      <div className="p-8 rounded-4xl bg-white dark:bg-black border border-slate-100 dark:border-white/20 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500">
            <OrdenesIcon className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg">
            {criticalCount.toLocaleString("es-MX")}
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          Pedidos críticos (alto monto + vencidos)
        </p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
          {criticalCount.toLocaleString("es-MX")}
        </h3>
      </div>
    </div>
  );
};

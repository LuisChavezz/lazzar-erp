"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DialogHeader } from "@/src/components/DialogHeader";
import { MainDialog } from "@/src/components/MainDialog";
import { OrderStatusPathIcon } from "@/src/components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { OrderDetails } from "@/src/features/orders/components/OrderDetails";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { Order } from "@/src/features/orders/interfaces/order.interface";
import { getStatusStyles } from "@/src/features/orders/utils/getStatusStyle";
import { capitalize } from "@/src/utils/capitalize";

const statusDialogColors: Record<number, "sky" | "emerald" | "amber" | "rose"> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

const parseOrderDate = (value?: string | null) => {
  if (!value) return null;
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (normalizedValue.includes("/")) {
    const [rawDatePart, rawTimePart] = normalizedValue.split(" ");
    const [day, month, year] = rawDatePart.split("/").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const [hours = 0, minutes = 0, seconds = 0] = (rawTimePart ?? "")
      .split(":")
      .map((part) => Number(part));
    const parsedDate = new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getStatusIconConfig = (status: number) => {
  if (status === 4) {
    return {
      iconClassName: "text-rose-500",
      iconPath: "M6 18L18 6M6 6l12 12",
    };
  }
  if (status === 3) {
    return {
      iconClassName: "text-emerald-500",
      iconPath: "M5 13l4 4L19 7",
    };
  }
  if (status === 2) {
    return {
      iconClassName: "text-amber-500",
      iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    };
  }
  return {
    iconClassName: "text-amber-500",
    iconPath: "M12 6v6l4 2",
  };
};

export const RecentOrders = () => {
  const { orders, isLoading, isError } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const aDate = parseOrderDate(a.created_at)?.getTime() ?? 0;
        const bDate = parseOrderDate(b.created_at)?.getTime() ?? 0;
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [orders]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Cotizaciones Recientes</h3>
        <Link
          href="/sales/orders"
          aria-label="Ver todos los cotizaciones"
          className="text-xs text-sky-600 hover:text-sky-500 font-bold uppercase tracking-wider transition-colors"
        >
          Ver todos
        </Link>
      </div>
      <div className="flex-1 space-y-4">
        {isLoading ? (
          <>
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse" />
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse" />
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-white/10 animate-pulse" />
          </>
        ) : null}

        {!isLoading && !isError && recentOrders.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-xs text-slate-500 dark:text-slate-400">
            No hay cotizaciones recientes.
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div className="rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200">
            No se pudieron cargar los cotizaciones recientes.
          </div>
        ) : null}

        {!isLoading &&
          !isError &&
          recentOrders.map((order: Order) => {
            const statusClassName = getStatusStyles(order);
            const icon = getStatusIconConfig(order.estatus);

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-white/5">
                    <OrderStatusPathIcon className={`w-4 h-4 ${icon.iconClassName}`} path={icon.iconPath} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                      {`OC${order.oc}` || `PED-${order.id}`}
                    </div>
                    <div className="text-[10px] text-slate-500">{order.cliente_razon_social}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(Number(order.gran_total) || 0)}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${statusClassName}`}>
                    {capitalize(order.estatus_label)}
                  </span>
                </div>
              </button>
            );
          })}
      </div>
      {selectedOrder ? (
        <MainDialog
          open={selectedOrderId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedOrderId(null);
            }
          }}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles del pedido #${selectedOrder.id}`}
              subtitle={selectedOrder.cliente_nombre || selectedOrder.cliente_razon_social}
              statusColor={statusDialogColors[selectedOrder.estatus] ?? "sky"}
            />
          }
        >
          <OrderDetails orderId={selectedOrder.id} />
        </MainDialog>
      ) : null}
    </section>
  );
};

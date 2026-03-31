"use client";

import { useMemo } from "react";
import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { PedidosIcon, RejectIcon } from "@/src/components/Icons";
import { useOrders } from "@/src/features/orders/hooks/useOrders";

export const OrderStats = () => {
  const { orders, isLoading } = useOrders();

  const pendingApprovalCount = useMemo(
    () => orders.filter((order) => order.estatus === 2).length,
    [orders]
  );
  const rejectedCount = useMemo(
    () => orders.filter((order) => order.estatus === 4).length,
    [orders]
  );
  const rejectedRatio = useMemo(() => {
    if (orders.length === 0) {
      return 0;
    }
    return Math.round((rejectedCount / orders.length) * 100);
  }, [orders.length, rejectedCount]);

  const items: KpiItem[] = [
    {
      label: "Por Autorizar",
      value: pendingApprovalCount.toLocaleString("es-MX"),
      icon: PedidosIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      subLabel: "Pedidos pendientes de autorización",
      status: "neutral",
      progress: Math.min(100, pendingApprovalCount * 5),
      actionLabel: "Ver pedidos",
      actionHref: "/operations/orders",
    },
    {
      label: "Rechazadas",
      value: rejectedCount.toLocaleString("es-MX"),
      icon: RejectIcon,
      iconBgClass: "bg-rose-50 dark:bg-rose-500/10",
      iconClass: "text-rose-500",
      subLabel: `${rejectedRatio}% del total de pedidos`,
      status: rejectedCount > 0 ? "negative" : "neutral",
      progress: rejectedRatio,
    },
  ];

  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="status"
        aria-live="polite"
        aria-label="Cargando estadísticas operativas de pedidos"
      >
        <LoadingSkeleton className="h-32 rounded-xl" />
        <LoadingSkeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return <KpiGrid items={items} />;
};

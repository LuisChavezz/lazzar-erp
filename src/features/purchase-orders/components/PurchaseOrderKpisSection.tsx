"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, {
  buildUntypedKpiCard,
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClockIcon, ComprasIcon, ExclamationTriangleIcon, WalletIcon } from "@/src/components/Icons";
import { usePurchaseOrderKpis } from "../hooks/usePurchaseOrderKpis";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";
import type {
  PurchaseOrderKpis,
  PurchaseOrderOpenKpi,
  PurchaseOrderOverdueKpi,
  PurchaseOrderSpendKpi,
} from "../interfaces/purchase-order-kpis.interface";
import {
  formatKpiMonto,
  getPurchaseOrderKpiAmountVisibility,
  type PurchaseOrderKpiAmountVisibility,
} from "../utils/purchaseOrderKpis";
import { PurchaseOrderKpiDialog, type PurchaseOrderKpiDialogKind } from "./PurchaseOrderKpiDialog";

const SECTION_TITLE = "Indicadores";

/** Motivo de "Gasto por categoría" cuando los importes se ocultan (ver `getPurchaseOrderKpiAmountVisibility`). */
const HIDDEN_AMOUNTS_MOTIVO: Record<Exclude<PurchaseOrderKpiAmountVisibility, "visible" | "pending">, string> = {
  "no-permission": "No tienes permiso para ver los importes de las órdenes de compra.",
  undetermined: "No se pudo verificar si puedes ver los importes de las órdenes de compra.",
};

/**
 * OCs abiertas: conteo, con el monto como detalle solo si el usuario puede ver
 * importes. Sin meta ni semáforo: sin insignia y sin barra.
 */
function openCard(kpi: PurchaseOrderOpenKpi, showAmounts: boolean, onOpen: () => void): KpiCompactItem {
  const base = { label: "OCs abiertas", icon: ComprasIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const monto = showAmounts && kpi.monto !== undefined ? kpi.monto : undefined;
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: String(kpi.total),
    info:
      "Cuenta las OCs en Borrador, Pendiente a confirmar, Autorizada y Parcialmente recibida." +
      (monto !== undefined
        ? " El monto es su total con IVA, de todo el histórico, y suma monedas sin distinguirlas."
        : ""),
    hideProgress: true,
    detail: monto !== undefined ? `Monto ${formatKpiMonto(monto)}` : undefined,
    action: (
      <KpiDrillDownButton
        label="Por estatus"
        ariaLabel="Ver OCs abiertas por estatus"
        isEmpty={kpi.por_estatus.length === 0}
        onClick={onOpen}
      />
    ),
  };
}

/**
 * OCs vencidas sin recibir. Hoy suele dar 0: ningún flujo del frontend captura
 * `fecha_entrega_estimada`, y el backend excluye las OCs sin esa fecha.
 */
function overdueCard(kpi: PurchaseOrderOverdueKpi, onOpen: () => void): KpiCompactItem {
  const base = { label: "OCs vencidas sin recibir", icon: ExclamationTriangleIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-red-500" } : KPI_MUTED_ICON),
    value: String(kpi.total),
    info: "OCs abiertas cuya fecha de entrega estimada ya pasó. Las OCs sin fecha de entrega estimada no se cuentan.",
    hideProgress: true,
    action: (
      <KpiDrillDownButton
        label="Ver OCs"
        ariaLabel="Ver OCs vencidas sin recibir"
        isEmpty={kpi.drill_down.length === 0}
        onClick={onOpen}
      />
    ),
  };
}

/**
 * Gasto por categoría: todo el indicador ES un importe, así que sin permiso
 * para verlos la tarjeta se muestra no disponible. El valor es la suma de los
 * montos por categoría que trae el payload; el detalle, la categoría mayor
 * (el backend las ordena por `-monto`).
 */
function spendCard(
  kpi: PurchaseOrderSpendKpi,
  visibility: PurchaseOrderKpiAmountVisibility,
  onOpen: () => void,
): KpiCompactItem {
  const base = { label: "Gasto por categoría", icon: WalletIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  if (visibility !== "visible") {
    // `pending` no llega aquí (la sección sigue en skeleton); por si acaso se
    // trata como no verificado, nunca como falta de permiso.
    const motivo = HIDDEN_AMOUNTS_MOTIVO[visibility === "no-permission" ? "no-permission" : "undetermined"];
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: motivo };
  }
  // Con importes visibles, un `monto` ausente en alguna categoría no se suma
  // a medias: la tarjeta queda no verificada.
  if (kpi.categorias.some((row) => row.monto === undefined)) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: HIDDEN_AMOUNTS_MOTIVO.undetermined };
  }
  const total = kpi.categorias.reduce((sum, row) => sum + (row.monto ?? 0), 0);
  const top = kpi.categorias[0];
  return {
    ...base,
    ...(total > 0 ? { iconClass: "text-violet-500" } : KPI_MUTED_ICON),
    value: formatKpiMonto(total),
    info:
      "Monto ordenado sin IVA de las OCs Autorizada, Parcialmente recibida y Recibida, de todo el histórico, " +
      "agrupado por categoría de producto. Suma monedas sin distinguirlas.",
    hideProgress: true,
    detail: top ? `${top.categoria}: ${formatKpiMonto(top.monto ?? 0)}` : "Sin gasto registrado",
    action: (
      <KpiDrillDownButton
        label="Ver categorías"
        ariaLabel="Ver gasto por categoría"
        isEmpty={kpi.categorias.length === 0}
        onClick={onOpen}
      />
    ),
  };
}

function buildCards(
  data: PurchaseOrderKpis,
  visibility: PurchaseOrderKpiAmountVisibility,
  openDialog: (kind: PurchaseOrderKpiDialogKind) => void,
): KpiCompactItem[] {
  const showAmounts = visibility === "visible";
  return [
    openCard(data.ocs_abiertas, showAmounts, () => openDialog("ocs_abiertas")),
    overdueCard(data.ocs_vencidas_sin_recibir, () => openDialog("ocs_vencidas_sin_recibir")),
    // Hoy siempre llega no disponible (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.ciclo_compra, { label: "Ciclo de compra", icon: ClockIcon }),
    spendCard(data.gasto_por_categoria, visibility, () => openDialog("gasto_por_categoria")),
  ];
}

/**
 * Indicadores de órdenes de compra (`GET /compras/ordenes/kpis/`, EC-432): OCs
 * abiertas, vencidas sin recibir, ciclo de compra y gasto por categoría, en ese
 * orden. Todo es el valor del backend; cada bloque decide solo por su
 * `disponible`.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * tabla de OCs. El listado (`usePurchaseOrders`, misma llave y caché que la
 * tabla) se lee SOLO como señal de permiso para importes (ver
 * `getPurchaseOrderKpiAmountVisibility`, #373). Sin gate de permiso: la ruta ya
 * exige `R-COMPRAS-OC` (`routePermissions`). Mismo patrón que `PedidoKpisSection`.
 */
export function PurchaseOrderKpisSection() {
  const { data, isInitialError, isFetching, refetch } = usePurchaseOrderKpis();
  const { purchaseOrders, hasLoaded: isListLoaded, isError: isListError } = usePurchaseOrders();
  const amountVisibility = getPurchaseOrderKpiAmountVisibility({
    orders: purchaseOrders,
    hasLoaded: isListLoaded,
    isError: isListError,
  });
  const showAmounts = amountVisibility === "visible";

  // `dialogKind` es el ÚLTIMO detalle abierto y no se limpia al cerrar: así el
  // diálogo conserva título y filas durante su animación de salida.
  const [dialogKind, setDialogKind] = useState<PurchaseOrderKpiDialogKind | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = (kind: PurchaseOrderKpiDialogKind) => {
    setDialogKind(kind);
    setIsDialogOpen(true);
  };

  let body: ReactNode;
  // Con el listado aún sin responder se sigue en skeleton (como en la primera
  // carga de los KPIs): así no se pinta una tarjeta sin importes que luego los
  // "aparece", ni el motivo de permiso antes de saber si aplica.
  if (data && amountVisibility !== "pending") {
    body = <KpiGrid compact items={buildCards(data, amountVisibility, openDialog)} />;
  } else if (isInitialError) {
    body = (
      <SectionErrorNotice
        title="No se pudieron cargar los indicadores"
        message="Intenta de nuevo en unos momentos."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  } else {
    body = <KpiGridSkeleton compact count={4} />;
  }

  return (
    <section aria-label={SECTION_TITLE}>
      {body}
      <PurchaseOrderKpiDialog
        open={isDialogOpen}
        kind={dialogKind}
        data={data}
        showAmounts={showAmounts}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  );
}

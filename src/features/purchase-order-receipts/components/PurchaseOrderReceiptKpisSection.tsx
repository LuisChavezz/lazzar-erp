"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, {
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { CheckCircleIcon, ExclamationTriangleIcon, RecepcionesIcon, WalletIcon } from "@/src/components/Icons";
import { usePurchaseOrders } from "@/src/features/purchase-orders/hooks/usePurchaseOrders";
import {
  getPurchaseOrderKpiAmountVisibility,
  type PurchaseOrderKpiAmountVisibility,
} from "@/src/features/purchase-orders/utils/purchaseOrderKpis";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import {
  formatKpiMonto,
  formatKpiPctOrDash,
  formatKpiSignedMonto,
  formatKpiSignedPctOrDash,
  plural,
} from "@/src/utils/kpiFormat";
import { usePurchaseOrderReceiptKpis } from "../hooks/usePurchaseOrderReceiptKpis";
import type {
  PurchaseOrderReceiptFulfillmentKpi,
  PurchaseOrderReceiptKpis,
  PurchaseOrderReceiptPartialKpi,
  PurchaseOrderReceiptPriceKpi,
  PurchaseOrderReceiptRejectedKpi,
} from "../interfaces/purchase-order-receipt-kpis.interface";
import {
  PurchaseOrderReceiptKpiDialog,
  type PurchaseOrderReceiptKpiDialogKind,
} from "./PurchaseOrderReceiptKpiDialog";

const SECTION_TITLE = "Indicadores";


const unavailable = (
  base: Pick<KpiCompactItem, "label" | "icon">,
  motivo: string,
): KpiCompactItem => ({ ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: motivo });

/** % de cumplimiento de cantidad: recibida sobre ordenada. Sin meta: sin barra ni insignia. */
function fulfillmentCard(kpi: PurchaseOrderReceiptFulfillmentKpi, onOpen: () => void): KpiCompactItem {
  const base = { label: "% Cumplimiento de cantidad", icon: CheckCircleIcon };
  if (!kpi.disponible) return unavailable(base, kpi.motivo);
  const counts = `${formatQuantityValue(kpi.cantidad_recibida)} de ${formatQuantityValue(kpi.cantidad_ordenada)}`;
  return {
    ...base,
    ...(kpi.pct !== null ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: formatKpiPctOrDash(kpi.pct),
    info:
      "Cantidad recibida sobre la ordenada de las OCs Autorizada, Parcialmente recibida y Recibida. " +
      "Suma las cantidades de todos los productos sin distinguir unidad de medida, así que una OC con " +
      "muchas unidades (p. ej. metros de tela) domina el resultado. Lo rechazado en calidad cuenta como recibido.",
    hideProgress: true,
    detail: `${counts} recibidas`,
    action: (
      <KpiDrillDownButton
        label="Ver OCs"
        ariaLabel="Ver cumplimiento de cantidad por OC"
        isEmpty={kpi.drill_down.length === 0}
        onClick={onOpen}
      />
    ),
  };
}

/** Recepciones parciales: % de OCs con recepción que aún están parciales. Sin drill-down. */
function partialCard(kpi: PurchaseOrderReceiptPartialKpi): KpiCompactItem {
  const base = { label: "Recepciones parciales", icon: RecepcionesIcon };
  if (!kpi.disponible) return unavailable(base, kpi.motivo);
  return {
    ...base,
    ...(kpi.pct !== null ? { iconClass: "text-orange-500" } : KPI_MUTED_ICON),
    value: formatKpiPctOrDash(kpi.pct),
    hideProgress: true,
    detail: `${kpi.ocs_parciales} de ${kpi.ocs_recibidas_o_parciales} ${plural(
      kpi.ocs_recibidas_o_parciales,
      "OC recibida o parcial",
      "OCs recibidas o parciales",
    )}`,
  };
}

/**
 * Por qué una tarjeta muestra porcentaje o cantidad en lugar de importe (ver
 * `getPurchaseOrderKpiAmountVisibility`). Mismo reparto que "Gasto por
 * categoría" de los indicadores de OC: el motivo de permiso solo cuando es
 * cierto.
 */
const HIDDEN_AMOUNTS_REASON: Record<Exclude<PurchaseOrderKpiAmountVisibility, "visible" | "pending">, string> = {
  "no-permission": "No tienes permiso para ver los importes de compras.",
  undetermined: "No se pudo verificar si puedes ver los importes de compras.",
};

/**
 * Diferencias de precio/costo: la diferencia con signo si se pueden ver
 * importes; si no, el porcentaje con signo (que no revela montos), con un ⓘ que
 * dice por qué. Con `pct: null` (nada pactado contra qué comparar) muestra "—"
 * en ambos modos: un "0.00" se leería como "sin diferencias". El icono se
 * enciende con cualquier diferencia en ambos modos: la alerta no depende del
 * permiso.
 */
function priceCard(
  kpi: PurchaseOrderReceiptPriceKpi,
  visibility: Exclude<PurchaseOrderKpiAmountVisibility, "pending">,
  onOpen: () => void,
): KpiCompactItem {
  const base = { label: "Diferencias de precio/costo", icon: WalletIcon };
  if (!kpi.disponible) return unavailable(base, kpi.motivo);
  const action = (
    <KpiDrillDownButton
      label="Ver partidas"
      ariaLabel="Ver partidas con diferencia de precio"
      isEmpty={kpi.drill_down.length === 0}
      onClick={onOpen}
    />
  );
  const common = { ...base, ...KPI_MUTED_ICON, hideProgress: true, action };
  const showAmount = visibility === "visible" && kpi.diferencia !== undefined;
  // Sin importe a la vista, el ⓘ dice por qué (un `diferencia` ausente con
  // `visible` cuenta como no verificado).
  const hiddenInfo = showAmount
    ? {}
    : { info: HIDDEN_AMOUNTS_REASON[visibility === "no-permission" ? "no-permission" : "undetermined"] };
  if (kpi.pct === null) {
    return { ...common, ...hiddenInfo, value: "—" };
  }
  const amber = { iconClass: "text-amber-500" };
  if (showAmount && kpi.diferencia !== undefined) {
    return {
      ...common,
      ...(kpi.diferencia !== 0 ? amber : {}),
      value: formatKpiSignedMonto(kpi.diferencia),
      detail: `${formatKpiSignedPctOrDash(kpi.pct)} sobre lo pactado en la OC`,
    };
  }
  return {
    ...common,
    ...hiddenInfo,
    ...(kpi.pct !== 0 ? amber : {}),
    value: formatKpiSignedPctOrDash(kpi.pct),
    detail: "Sobre lo pactado en la OC",
  };
}

/**
 * Material rechazado: cantidad, con su valor como detalle si se pueden ver
 * importes. Sin ellos, el ⓘ no menciona el valor (mismo criterio que "OCs
 * abiertas" de los indicadores de OC).
 */
function rejectedCard(kpi: PurchaseOrderReceiptRejectedKpi, showAmounts: boolean, onOpen: () => void): KpiCompactItem {
  const base = { label: "Material rechazado", icon: ExclamationTriangleIcon };
  if (!kpi.disponible) return unavailable(base, kpi.motivo);
  const valor = showAmounts && kpi.valor_rechazado !== undefined ? kpi.valor_rechazado : undefined;
  return {
    ...base,
    ...(kpi.cantidad_rechazada > 0 ? { iconClass: "text-red-500" } : KPI_MUTED_ICON),
    value: formatQuantityValue(kpi.cantidad_rechazada),
    info:
      "Unidades rechazadas en la inspección de calidad de las recepciones, incluidas las de producción; " +
      "no son devoluciones al proveedor." +
      (valor !== undefined ? " El valor solo incluye rechazos de recepciones de OC." : ""),
    hideProgress: true,
    detail: valor !== undefined ? `Valor ${formatKpiMonto(valor)}` : undefined,
    action: (
      <KpiDrillDownButton
        label="Ver rechazos"
        ariaLabel="Ver material rechazado"
        isEmpty={kpi.drill_down.length === 0}
        onClick={onOpen}
      />
    ),
  };
}

function buildCards(
  data: PurchaseOrderReceiptKpis,
  visibility: Exclude<PurchaseOrderKpiAmountVisibility, "pending">,
  openDialog: (kind: PurchaseOrderReceiptKpiDialogKind) => void,
): KpiCompactItem[] {
  return [
    fulfillmentCard(data.cumplimiento_cantidad, () => openDialog("cumplimiento_cantidad")),
    partialCard(data.recepciones_parciales),
    priceCard(data.diferencia_precio, visibility, () => openDialog("diferencia_precio")),
    rejectedCard(data.material_rechazado, visibility === "visible", () => openDialog("material_rechazado")),
  ];
}

/**
 * Indicadores de recepciones de compra (`GET /compras/recepciones/kpis/`,
 * EC-434): cumplimiento de cantidad, recepciones parciales, diferencias de
 * precio y material rechazado, en ese orden. Todo es el valor del backend; cada
 * bloque decide solo por su `disponible`.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * tabla de recepciones. Los importes siguen la MISMA regla que los indicadores
 * de OC (`getPurchaseOrderKpiAmountVisibility`, parche por el backend): el
 * listado de OC (`usePurchaseOrders`, misma llave y caché que en la página de
 * OC) se lee SOLO como señal de permiso, y mientras no responde la sección
 * sigue en skeleton. Porcentajes y cantidades se muestran siempre. Sin gate de
 * permiso: la ruta ya exige `R-COMPRAS-RECEP` (`routePermissions`).
 */
export function PurchaseOrderReceiptKpisSection() {
  const { data, isInitialError, isFetching, refetch } = usePurchaseOrderReceiptKpis();
  const { purchaseOrders, hasLoaded: isListLoaded, isError: isListError } = usePurchaseOrders();
  const amountVisibility = getPurchaseOrderKpiAmountVisibility({
    orders: purchaseOrders,
    hasLoaded: isListLoaded,
    isError: isListError,
  });
  const showAmounts = amountVisibility === "visible";

  // `dialogKind` es el ÚLTIMO detalle abierto y no se limpia al cerrar: así el
  // diálogo conserva título y filas durante su animación de salida.
  const [dialogKind, setDialogKind] = useState<PurchaseOrderReceiptKpiDialogKind | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = (kind: PurchaseOrderReceiptKpiDialogKind) => {
    setDialogKind(kind);
    setIsDialogOpen(true);
  };

  let body: ReactNode;
  // Con el listado de OC aún sin responder se sigue en skeleton (como en la
  // primera carga de los KPIs): así no se pinta una tarjeta sin importes que
  // luego los "aparece".
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
      <PurchaseOrderReceiptKpiDialog
        open={isDialogOpen}
        kind={dialogKind}
        data={data}
        showAmounts={showAmounts}
        onClose={() => setIsDialogOpen(false)}
      />
    </section>
  );
}

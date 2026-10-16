"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, {
  buildUntypedKpiCard,
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiCurrencyBlocks, KpiMutedValue, SEPARATE_CURRENCIES_NOTE } from "@/src/components/KpiCurrency";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { KpiSectionErrorBoundary } from "@/src/components/KpiSectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClockIcon, ComprasIcon, ExclamationTriangleIcon, WalletIcon } from "@/src/components/Icons";
import { purchaseOrderKpisQueryKey, usePurchaseOrderKpis } from "../hooks/usePurchaseOrderKpis";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";
import type {
  PurchaseOrderKpis,
  PurchaseOrderOpenKpi,
  PurchaseOrderOverdueKpi,
  PurchaseOrderSpendKpi,
} from "../interfaces/purchase-order-kpis.interface";
import { formatKpiCurrencyAmount, plural } from "@/src/utils/kpiFormat";
import {
  getPurchaseOrderKpiAmountVisibility,
  groupPurchaseOrderKpiSpend,
  resolveKpiAmountState,
  type KpiHiddenAmountsReason,
  type PurchaseOrderKpiAmountVisibility,
} from "../utils/purchaseOrderKpis";
import { PurchaseOrderKpiDialog, type PurchaseOrderKpiDialogKind } from "./PurchaseOrderKpiDialog";

const SECTION_TITLE = "Indicadores";

/** Por qué una tarjeta no muestra importes (ver `resolveKpiAmountState`). */
const HIDDEN_AMOUNTS_MOTIVO: Record<KpiHiddenAmountsReason, string> = {
  "no-permission": "No tienes permiso para ver los importes de las órdenes de compra.",
  undetermined: "No se pudo verificar si puedes ver los importes de las órdenes de compra.",
};

/**
 * OCs abiertas: un bloque por moneda con su monto y, en el detalle, el conteo
 * de todas las monedas (un conteo sí se puede sumar; un importe no). Sin
 * importes a la vista el valor es el conteo (que sí se puede ver) y el detalle
 * dice que los importes no se muestran, con el porqué en el ⓘ. Sin meta ni
 * semáforo: sin insignia y sin barra.
 */
function openCard(
  kpi: PurchaseOrderOpenKpi,
  visibility: PurchaseOrderKpiAmountVisibility,
  onOpen: () => void,
): KpiCompactItem {
  const base = { label: "OCs abiertas", icon: ComprasIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const criterio = "Cuenta las OCs en Borrador, Pendiente a confirmar, Autorizada y Parcialmente recibida.";
  const amounts = resolveKpiAmountState(
    visibility,
    kpi.por_moneda.every((fila) => fila.monto !== undefined),
  );
  const count = `${kpi.total} ${plural(kpi.total, "OC abierta", "OCs abiertas")}`;
  let value: ReactNode;
  let info: string;
  let detail: string | undefined = kpi.total > 0 ? count : undefined;
  if (kpi.total === 0) {
    value = <KpiMutedValue>Sin OCs abiertas</KpiMutedValue>;
    info = criterio;
  } else if (amounts.show) {
    // Con una sola moneda su conteo es el del detalle: no se repite en el bloque.
    const showCurrencyCount = kpi.por_moneda.length > 1;
    value = (
      <KpiCurrencyBlocks
        blocks={kpi.por_moneda.map((fila) => ({
          moneda: fila.moneda,
          monto: fila.monto ?? 0,
          detail: showCurrencyCount ? `${fila.total} ${plural(fila.total, "OC", "OCs")}` : undefined,
        }))}
      />
    );
    info = `${criterio} El monto es su total con IVA, de todo el histórico. ${SEPARATE_CURRENCIES_NOTE}`;
  } else {
    value = String(kpi.total);
    detail = "Importes no visibles";
    info = `${criterio} ${HIDDEN_AMOUNTS_MOTIVO[amounts.reason]}`;
  }
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value,
    info,
    hideProgress: true,
    ...(detail ? { detail } : {}),
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
 * Gasto por categoría: todo el indicador ES un importe, así que sin importes a
 * la vista la tarjeta se muestra no disponible. Un bloque por moneda con el
 * total de ESA moneda (suma de sus categorías, que el backend no expone) y su
 * categoría mayor: cada moneda tiene su propio ranking.
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
  const amounts = resolveKpiAmountState(visibility, true);
  if (!amounts.show) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: HIDDEN_AMOUNTS_MOTIVO[amounts.reason] };
  }
  const monedas = groupPurchaseOrderKpiSpend(kpi.categorias);
  const hasSpend = monedas.some((moneda) => moneda.total > 0);
  return {
    ...base,
    ...(hasSpend ? { iconClass: "text-violet-500" } : KPI_MUTED_ICON),
    value:
      monedas.length === 0 ? (
        <KpiMutedValue>Sin gasto registrado</KpiMutedValue>
      ) : (
        <KpiCurrencyBlocks
          blocks={monedas.map((moneda) => {
            const [top] = moneda.categorias;
            return {
              moneda: moneda.moneda,
              monto: moneda.total,
              detail: top ? `${top.categoria}: ${formatKpiCurrencyAmount(top.monto, moneda.moneda)}` : undefined,
            };
          })}
        />
      ),
    info:
      "Monto ordenado sin IVA de las OCs Autorizada, Parcialmente recibida y Recibida, de todo el histórico, " +
      "agrupado por categoría de producto; debajo de cada moneda, su categoría mayor. " +
      SEPARATE_CURRENCIES_NOTE,
    hideProgress: true,
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
  return [
    openCard(data.ocs_abiertas, visibility, () => openDialog("ocs_abiertas")),
    overdueCard(data.ocs_vencidas_sin_recibir, () => openDialog("ocs_vencidas_sin_recibir")),
    // Hoy siempre llega no disponible (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.ciclo_compra, { label: "Ciclo de compra", icon: ClockIcon }),
    spendCard(data.gasto_por_categoria, visibility, () => openDialog("gasto_por_categoria")),
  ];
}

function PurchaseOrderKpisSectionContent() {
  const { data, isInitialError, isFetching, refetch } = usePurchaseOrderKpis();
  const { purchaseOrders, hasLoaded: isListLoaded, isInitialError: isListError } =
    usePurchaseOrders();
  const amountVisibility = getPurchaseOrderKpiAmountVisibility({
    orders: purchaseOrders,
    hasLoaded: isListLoaded,
    isError: isListError,
  });
  // Los desgloses muestran importes con la misma regla que la tarjeta de OCs
  // abiertas: el listado dice `visible` y el bloque los trae.
  const showAmounts =
    data?.ocs_abiertas.disponible === true
      ? resolveKpiAmountState(
          amountVisibility,
          data.ocs_abiertas.por_moneda.every((fila) => fila.monto !== undefined),
        ).show
      : amountVisibility === "visible";

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
    <>
      {body}
      <PurchaseOrderKpiDialog
        open={isDialogOpen}
        kind={dialogKind}
        data={data}
        showAmounts={showAmounts}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
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
 * `getPurchaseOrderKpiAmountVisibility`). Sin gate de permiso: la ruta ya
 * exige `R-COMPRAS-OC` (`routePermissions`). Mismo patrón que `PedidoKpisSection`.
 *
 * Tiene su propio límite de error: si el payload cambia de forma y el render
 * lanza, se pinta un aviso aquí y la tabla de OCs sigue usable.
 */
export function PurchaseOrderKpisSection() {
  return (
    <section aria-label={SECTION_TITLE}>
      <KpiSectionErrorBoundary
        queryKey={purchaseOrderKpisQueryKey}
        message="Ocurrió un error al mostrarlos. La tabla de OCs sigue disponible."
      >
        <PurchaseOrderKpisSectionContent />
      </KpiSectionErrorBoundary>
    </section>
  );
}

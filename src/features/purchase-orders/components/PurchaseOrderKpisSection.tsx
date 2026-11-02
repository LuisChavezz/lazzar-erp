"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, {
  buildUntypedKpiCard,
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import {
  KpiCurrencyBlocks,
  KpiMutedValue,
  KpiTaggedBlocks,
  SEPARATE_CURRENCIES_NOTE,
} from "@/src/components/KpiCurrency";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { KpiSectionErrorBoundary } from "@/src/components/KpiSectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { ClockIcon, ComprasIcon, ExclamationTriangleIcon, WalletIcon } from "@/src/components/Icons";
import { purchaseOrderKpisQueryKey, usePurchaseOrderKpis } from "../hooks/usePurchaseOrderKpis";
import type {
  PurchaseOrderKpis,
  PurchaseOrderOpenKpi,
  PurchaseOrderOverdueKpi,
  PurchaseOrderSpendKpi,
} from "../interfaces/purchase-order-kpis.interface";
import { formatKpiTaggedCurrencyAmount, plural } from "@/src/utils/kpiFormat";
import {
  canSeeKpiAmounts,
  groupPurchaseOrderKpiSpend,
  HIDDEN_KPI_AMOUNT_TEXT,
  HIDDEN_KPI_AMOUNTS_REASON,
  isAmountOnlyKpiHidden,
} from "../utils/purchaseOrderKpis";
import { hiddenAmountCard } from "../utils/kpiAmountCards";
import { PurchaseOrderKpiDialog, type PurchaseOrderKpiDialogKind } from "./PurchaseOrderKpiDialog";

const SECTION_TITLE = "Indicadores";

/**
 * OCs abiertas: un bloque por moneda con su monto y, en el detalle, el conteo
 * de todas las monedas (un conteo sí se puede sumar; un importe no). Sin
 * importes a la vista solo el monto cambia a "No visible": el conteo del
 * detalle se queda, con el porqué en el ⓘ. Sin meta ni semáforo: sin insignia
 * y sin barra.
 */
function openCard(kpi: PurchaseOrderOpenKpi, showAmounts: boolean, onOpen: () => void): KpiCompactItem {
  const base = { label: "OCs abiertas", icon: ComprasIcon };
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
  }
  const criterio = "Cuenta las OCs en Borrador, Pendiente a confirmar, Autorizada y Parcialmente recibida.";
  const count = `${kpi.total} ${plural(kpi.total, "OC abierta", "OCs abiertas")}`;
  let value: ReactNode;
  let info: string;
  if (kpi.total === 0) {
    value = <KpiMutedValue>Sin OCs abiertas</KpiMutedValue>;
    info = criterio;
  } else if (showAmounts) {
    // Con una sola moneda su conteo es el del detalle: no se repite en el bloque.
    const showCurrencyCount = kpi.por_moneda.length > 1;
    // Un `monto` ausente con permiso es un hueco del payload, no un cero ni
    // falta de permiso: "—", como en el desglose por estatus.
    value = (
      <KpiTaggedBlocks
        blocks={kpi.por_moneda.map((fila) => ({
          key: fila.moneda,
          value: fila.monto === undefined ? "—" : formatKpiTaggedCurrencyAmount(fila.monto, fila.moneda),
          tag: fila.moneda,
          detail: showCurrencyCount ? `${fila.total} ${plural(fila.total, "OC", "OCs")}` : undefined,
        }))}
      />
    );
    info = `${criterio} El monto es su total con IVA, de todo el histórico. ${SEPARATE_CURRENCIES_NOTE}`;
  } else {
    value = <KpiMutedValue>{HIDDEN_KPI_AMOUNT_TEXT}</KpiMutedValue>;
    info = `${criterio} ${HIDDEN_KPI_AMOUNTS_REASON}`;
  }
  return {
    ...base,
    ...(kpi.total > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value,
    info,
    hideProgress: true,
    ...(kpi.total > 0 ? { detail: count } : {}),
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
 * la vista la tarjeta se queda con "No visible" y sin drill-down (sin permiso
 * el backend manda el bloque no disponible). Un bloque por moneda con el total
 * de ESA moneda (suma de sus categorías, que el backend no expone) y su
 * categoría mayor: cada moneda tiene su propio ranking.
 */
function spendCard(
  kpi: PurchaseOrderSpendKpi,
  puedeVerImportes: boolean | undefined,
  onOpen: () => void,
): KpiCompactItem {
  const base = { label: "Gasto por categoría", icon: WalletIcon };
  if (isAmountOnlyKpiHidden(kpi.disponible, puedeVerImportes)) {
    return hiddenAmountCard(base, HIDDEN_KPI_AMOUNTS_REASON);
  }
  if (!kpi.disponible) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: kpi.motivo };
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
              detail: top ? `${top.categoria}: ${formatKpiTaggedCurrencyAmount(top.monto, moneda.moneda)}` : undefined,
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
  openDialog: (kind: PurchaseOrderKpiDialogKind) => void,
): KpiCompactItem[] {
  return [
    openCard(data.ocs_abiertas, canSeeKpiAmounts(data.puede_ver_importes), () => openDialog("ocs_abiertas")),
    overdueCard(data.ocs_vencidas_sin_recibir, () => openDialog("ocs_vencidas_sin_recibir")),
    // Hoy siempre llega no disponible (ver `buildUntypedKpiCard`).
    buildUntypedKpiCard(data.ciclo_compra, { label: "Ciclo de compra", icon: ClockIcon }),
    spendCard(data.gasto_por_categoria, data.puede_ver_importes, () => openDialog("gasto_por_categoria")),
  ];
}

function PurchaseOrderKpisSectionContent() {
  const { data, isInitialError, isFetching, refetch } = usePurchaseOrderKpis();

  // `dialogKind` es el ÚLTIMO detalle abierto y no se limpia al cerrar: así el
  // diálogo conserva título y filas durante su animación de salida.
  const [dialogKind, setDialogKind] = useState<PurchaseOrderKpiDialogKind | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = (kind: PurchaseOrderKpiDialogKind) => {
    setDialogKind(kind);
    setIsDialogOpen(true);
  };

  let body: ReactNode;
  if (data) {
    body = <KpiGrid compact items={buildCards(data, openDialog)} />;
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
        showAmounts={canSeeKpiAmounts(data?.puede_ver_importes)}
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
 * tabla de OCs. Los importes siguen `puede_ver_importes` de la misma respuesta
 * (`canSeeKpiAmounts`); sin él, cada tarjeta se queda y su importe dice "No
 * visible". Sin gate de permiso: la ruta ya exige `R-COMPRAS-OC`
 * (`routePermissions`). Mismo patrón que `PedidoKpisSection`.
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

"use client";

import { useState, type ReactNode } from "react";
import KpiGrid, {
  KPI_MUTED_ICON,
  KpiGridSkeleton,
  type KpiCompactItem,
} from "@/src/components/KpiGrid";
import { KpiMutedValue, KpiTaggedBlocks, SEPARATE_CURRENCIES_NOTE } from "@/src/components/KpiCurrency";
import { KpiDrillDownButton } from "@/src/components/KpiDrillDownButton";
import { KpiSectionErrorBoundary } from "@/src/components/KpiSectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { CheckCircleIcon, ExclamationTriangleIcon, RecepcionesIcon, WalletIcon } from "@/src/components/Icons";
import { usePurchaseOrders } from "@/src/features/purchase-orders/hooks/usePurchaseOrders";
import { pendingAmountCard } from "@/src/features/purchase-orders/utils/kpiAmountCards";
import {
  getPurchaseOrderKpiAmountVisibility,
  resolveKpiAmountState,
  type KpiHiddenAmountsReason,
  type PurchaseOrderKpiAmountVisibility,
} from "@/src/features/purchase-orders/utils/purchaseOrderKpis";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import {
  formatKpiPctOrDash,
  formatKpiSignedPctOrDash,
  formatKpiTaggedCurrencyAmount,
  formatKpiTaggedSignedCurrencyAmount,
  plural,
} from "@/src/utils/kpiFormat";
import { purchaseOrderReceiptKpisQueryKey, usePurchaseOrderReceiptKpis } from "../hooks/usePurchaseOrderReceiptKpis";
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
import { unitLabel } from "../utils/receiptKpiFormat";

const SECTION_TITLE = "Indicadores";

const SEPARATE_UNITS_NOTE = "Cada unidad de medida va por separado: no se suman cantidades de unidades distintas.";

const unavailable = (
  base: Pick<KpiCompactItem, "label" | "icon">,
  motivo: string,
): KpiCompactItem => ({ ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: motivo });

/**
 * % de cumplimiento de cantidad: recibido neto sobre ordenado. Con varias
 * unidades de medida el backend no da un total (no se suman metros con piezas):
 * un bloque por unidad con su porcentaje. Sin meta: sin barra ni insignia.
 */
function fulfillmentCard(kpi: PurchaseOrderReceiptFulfillmentKpi, onOpen: () => void): KpiCompactItem {
  const base = { label: "% Cumplimiento de cantidad", icon: CheckCircleIcon };
  if (!kpi.disponible) return unavailable(base, kpi.motivo);
  const common = {
    ...base,
    info:
      "Cantidad recibida sobre la ordenada de las OCs Autorizada, Parcialmente recibida y Recibida. " +
      `Lo rechazado en calidad no cuenta como recibido. ${SEPARATE_UNITS_NOTE}`,
    hideProgress: true,
    action: (
      <KpiDrillDownButton
        label="Ver OCs"
        ariaLabel="Ver cumplimiento de cantidad por OC"
        isEmpty={kpi.drill_down.length === 0}
        onClick={onOpen}
      />
    ),
  };
  if (kpi.mezcla_unidades) {
    return {
      ...common,
      ...(kpi.por_unidad.some((fila) => fila.pct !== null) ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
      value: (
        <KpiTaggedBlocks
          blocks={kpi.por_unidad.map((fila) => ({
            key: String(fila.unidad_id ?? "sin-unidad"),
            value: formatKpiPctOrDash(fila.pct),
            tag: unitLabel(fila.unidad),
            detail: `${formatQuantityValue(fila.cantidad_recibida)} de ${formatQuantityValue(fila.cantidad_ordenada)} recibidas`,
          }))}
        />
      ),
    };
  }
  const counts = `${formatQuantityValue(kpi.cantidad_recibida ?? 0)} de ${formatQuantityValue(kpi.cantidad_ordenada ?? 0)}`;
  return {
    ...common,
    ...(kpi.pct !== null ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
    value: formatKpiPctOrDash(kpi.pct),
    detail: `${counts} recibidas`,
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

/** Por qué una tarjeta no muestra importes (ver `resolveKpiAmountState`). */
const HIDDEN_AMOUNTS_REASON: Record<KpiHiddenAmountsReason, string> = {
  "no-permission": "No tienes permiso para ver los importes de compras.",
  undetermined: "No se pudo verificar si puedes ver los importes de compras.",
};

/**
 * Diferencias de precio/costo: un bloque por moneda (la de la factura, que es
 * la de su OC) con la diferencia con signo y su porcentaje. Sin importes a la
 * vista, el porcentaje con signo por moneda (que no revela montos), con un ⓘ
 * que dice por qué. Un `pct` `null` o ausente (nada pactado contra qué
 * comparar) es "—", nunca "NaN%". El icono se enciende con cualquier
 * diferencia en ambos modos: la alerta no depende del permiso.
 *
 * Sin permiso de contabilidad el backend manda el bloque no disponible con su
 * motivo, así que no llega aquí.
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
  const distinta = kpi.lineas_moneda_distinta;
  const criterio = [
    "Facturas de proveedor registradas contra el precio pactado en su OC, línea por línea.",
    SEPARATE_CURRENCIES_NOTE,
    distinta > 0
      ? `${distinta} ${plural(distinta, "línea no se compara", "líneas no se comparan")} porque su factura está en una moneda distinta a la de su OC.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  const common = { ...base, ...KPI_MUTED_ICON, hideProgress: true, action };
  if (kpi.por_moneda.length === 0) {
    return { ...common, info: criterio, value: <KpiMutedValue>Sin partidas evaluadas</KpiMutedValue> };
  }
  const amber = { iconClass: "text-amber-500" };
  const amounts = resolveKpiAmountState(visibility, true);
  if (amounts.show) {
    return {
      ...common,
      ...(kpi.por_moneda.some((moneda) => moneda.diferencia !== 0) ? amber : {}),
      info: criterio,
      value: (
        <KpiTaggedBlocks
          blocks={kpi.por_moneda.map((moneda) => ({
            key: moneda.moneda,
            value: formatKpiTaggedSignedCurrencyAmount(moneda.diferencia, moneda.moneda),
            tag: moneda.moneda,
            detail: `${formatKpiSignedPctOrDash(moneda.pct ?? null)} sobre lo pactado en la OC`,
          }))}
        />
      ),
    };
  }
  return {
    ...common,
    ...(kpi.por_moneda.some((moneda) => (moneda.pct ?? 0) !== 0) ? amber : {}),
    info: `${criterio} ${HIDDEN_AMOUNTS_REASON[amounts.reason]}`,
    value: (
      <KpiTaggedBlocks
        blocks={kpi.por_moneda.map((moneda) => ({
          key: moneda.moneda,
          value: formatKpiSignedPctOrDash(moneda.pct ?? null),
          tag: moneda.moneda,
          detail: "Sobre lo pactado en la OC",
        }))}
      />
    ),
  };
}

/**
 * Material rechazado: cantidad por unidad de medida y, como detalle, su valor
 * por moneda (la de la OC). Sin importes a la vista el detalle lo dice en lugar
 * de desaparecer, y el ⓘ explica por qué.
 */
function rejectedCard(
  kpi: PurchaseOrderReceiptRejectedKpi,
  visibility: Exclude<PurchaseOrderKpiAmountVisibility, "pending">,
  onOpen: () => void,
): KpiCompactItem {
  const base = { label: "Material rechazado", icon: ExclamationTriangleIcon };
  if (!kpi.disponible) return unavailable(base, kpi.motivo);
  const criterio =
    "Unidades rechazadas por Calidad en las recepciones de OC; no son devoluciones al proveedor. " +
    SEPARATE_UNITS_NOTE;
  const hasRejects = kpi.por_unidad.some((fila) => fila.cantidad_rechazada > 0);
  const amounts = resolveKpiAmountState(visibility, kpi.por_moneda !== undefined);
  let info = criterio;
  let detail: string | undefined;
  if (hasRejects && amounts.show && kpi.por_moneda && kpi.por_moneda.length > 0) {
    detail = `Valor ${kpi.por_moneda
      .map((moneda) => `${formatKpiTaggedCurrencyAmount(moneda.valor_rechazado, moneda.moneda)} ${moneda.moneda}`)
      .join(" · ")}`;
    info = `${criterio} El valor es a precio pactado en la OC. ${SEPARATE_CURRENCIES_NOTE}`;
  } else if (hasRejects && !amounts.show) {
    detail = "Valor no visible";
    info = `${criterio} ${HIDDEN_AMOUNTS_REASON[amounts.reason]}`;
  }
  return {
    ...base,
    ...(hasRejects ? { iconClass: "text-red-500" } : KPI_MUTED_ICON),
    value:
      kpi.por_unidad.length === 0 ? (
        "0"
      ) : (
        <KpiTaggedBlocks
          blocks={kpi.por_unidad.map((fila) => ({
            key: String(fila.unidad_id ?? "sin-unidad"),
            value: formatQuantityValue(fila.cantidad_rechazada),
            tag: unitLabel(fila.unidad),
          }))}
        />
      ),
    info,
    hideProgress: true,
    ...(detail ? { detail } : {}),
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
  visibility: PurchaseOrderKpiAmountVisibility,
  openDialog: (kind: PurchaseOrderReceiptKpiDialogKind) => void,
): KpiCompactItem[] {
  // Cumplimiento y parciales no tienen importes: se pintan en cuanto llegan los
  // KPIs. Las otras dos esperan, cada una con su propio marcador, a que el
  // listado de OC diga si se pueden ver importes. Un bloque no disponible no
  // espera: no tiene nada que decidir.
  const waits = visibility === "pending";
  return [
    fulfillmentCard(data.cumplimiento_cantidad, () => openDialog("cumplimiento_cantidad")),
    partialCard(data.recepciones_parciales),
    waits && data.diferencia_precio.disponible
      ? pendingAmountCard({ label: "Diferencias de precio/costo", icon: WalletIcon })
      : priceCard(
          data.diferencia_precio,
          visibility === "pending" ? "undetermined" : visibility,
          () => openDialog("diferencia_precio"),
        ),
    waits && data.material_rechazado.disponible
      ? pendingAmountCard({ label: "Material rechazado", icon: ExclamationTriangleIcon })
      : rejectedCard(
          data.material_rechazado,
          visibility === "pending" ? "undetermined" : visibility,
          () => openDialog("material_rechazado"),
        ),
  ];
}

function PurchaseOrderReceiptKpisSectionContent() {
  const { data, isInitialError, isFetching, refetch } = usePurchaseOrderReceiptKpis();
  const { purchaseOrders, hasLoaded: isListLoaded, isInitialError: isListError } =
    usePurchaseOrders();
  const amountVisibility = getPurchaseOrderKpiAmountVisibility({
    orders: purchaseOrders,
    hasLoaded: isListLoaded,
    isError: isListError,
  });
  // Los drill-downs muestran importes con la misma regla que su tarjeta.
  const showPriceAmounts = resolveKpiAmountState(amountVisibility, true).show;
  const showRejectedAmounts = resolveKpiAmountState(
    amountVisibility,
    data?.material_rechazado.disponible === true && data.material_rechazado.por_moneda !== undefined,
  ).show;

  // `dialogKind` es el ÚLTIMO detalle abierto y no se limpia al cerrar: así el
  // diálogo conserva título y filas durante su animación de salida.
  const [dialogKind, setDialogKind] = useState<PurchaseOrderReceiptKpiDialogKind | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openDialog = (kind: PurchaseOrderReceiptKpiDialogKind) => {
    setDialogKind(kind);
    setIsDialogOpen(true);
  };

  let body: ReactNode;
  // Las tarjetas se pintan en cuanto llegan los KPIs; las que dependen de
  // importes esperan aparte a la señal del listado de OC (ver `buildCards`).
  if (data) {
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
      <PurchaseOrderReceiptKpiDialog
        open={isDialogOpen}
        kind={dialogKind}
        data={data}
        showPriceAmounts={showPriceAmounts}
        showRejectedAmounts={showRejectedAmounts}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}

/**
 * Indicadores de recepciones de compra (`GET /compras/recepciones/kpis/`,
 * EC-434): cumplimiento de cantidad, recepciones parciales, diferencias de
 * precio y material rechazado, en ese orden. Todo es el valor del backend; cada
 * bloque decide solo por su `disponible`.
 *
 * Tiene su propia consulta: carga y falla dentro de la sección sin tocar la
 * tabla de recepciones. Los importes siguen la MISMA regla que los indicadores
 * de OC (`getPurchaseOrderKpiAmountVisibility` + `resolveKpiAmountState`): el
 * listado de OC (`usePurchaseOrders`, misma llave y caché que en la página de
 * OC) se lee SOLO como señal de permiso; mientras no responde, solo las dos
 * tarjetas con importes esperan con su propio marcador. Porcentajes y
 * cantidades se muestran siempre. Sin gate de
 * permiso: la ruta ya exige `R-COMPRAS-RECEP` (`routePermissions`).
 *
 * Tiene su propio límite de error: si el payload cambia de forma y el render
 * lanza, se pinta un aviso aquí y la tabla de recepciones sigue usable.
 */
export function PurchaseOrderReceiptKpisSection() {
  return (
    <section aria-label={SECTION_TITLE}>
      <KpiSectionErrorBoundary
        queryKey={purchaseOrderReceiptKpisQueryKey}
        message="Ocurrió un error al mostrarlos. La tabla de recepciones sigue disponible."
      >
        <PurchaseOrderReceiptKpisSectionContent />
      </KpiSectionErrorBoundary>
    </section>
  );
}

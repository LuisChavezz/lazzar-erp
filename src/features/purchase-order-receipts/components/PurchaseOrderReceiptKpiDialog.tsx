"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import {
  formatKpiCurrencyAmount,
  formatKpiPctOrDash,
  formatKpiSignedCurrencyAmount,
  plural,
} from "@/src/utils/kpiFormat";
import type { PurchaseOrderReceiptKpis } from "../interfaces/purchase-order-receipt-kpis.interface";
import { unitLabel } from "../utils/receiptKpiFormat";

/** Bloques con drill-down (`recepciones_parciales` no lo tiene). */
export type PurchaseOrderReceiptKpiDialogKind = "cumplimiento_cantidad" | "diferencia_precio" | "material_rechazado";

const FOLIO_LINK_CLASS =
  "font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";
const NUM_TD_CLASS = `${TD_CLASS} text-right tabular-nums whitespace-nowrap`;

/**
 * Descripción del diálogo: el CONTEO de lo que se muestra frente al total del
 * backend (`drill_down_total`), y si la lista viene cortada
 * (`drill_down_truncado`, tope de 20 filas sin "ver todas"). Sin filas solo da
 * el aviso de "sin datos" (el cuerpo lo repite con `EmptyLines`, con otra
 * frase).
 */
function describeRows(
  shown: number,
  total: number,
  truncated: boolean,
  singular: string,
  pluralForm: string,
  order: string,
): string {
  if (shown === 0) return `Sin ${pluralForm} que mostrar`;
  const rows = `${total} ${plural(total, singular, pluralForm)}`;
  return truncated ? `Mostrando ${shown} de ${rows}, ${order}` : `Mostrando ${shown} de ${rows}`;
}

function getDescription(kind: PurchaseOrderReceiptKpiDialogKind | null, data: PurchaseOrderReceiptKpis | undefined) {
  if (kind === "cumplimiento_cantidad" && data?.cumplimiento_cantidad.disponible) {
    const kpi = data.cumplimiento_cantidad;
    return describeRows(
      kpi.drill_down.length,
      kpi.drill_down_total,
      kpi.drill_down_truncado,
      "OC pendiente por unidad",
      "OCs pendientes por unidad",
      "las de menor cumplimiento",
    );
  }
  if (kind === "diferencia_precio" && data?.diferencia_precio.disponible) {
    const kpi = data.diferencia_precio;
    return describeRows(
      kpi.drill_down.length,
      kpi.drill_down_total,
      kpi.drill_down_truncado,
      "partida",
      "partidas",
      "ordenadas por diferencia sin convertir monedas",
    );
  }
  if (kind === "material_rechazado" && data?.material_rechazado.disponible) {
    const kpi = data.material_rechazado;
    return describeRows(
      kpi.drill_down.length,
      kpi.drill_down_total,
      kpi.drill_down_truncado,
      "renglón rechazado",
      "renglones rechazados",
      "los de mayor cantidad sin distinguir unidad",
    );
  }
  return "Indicador no disponible por ahora.";
}

/** OCs con algo pendiente: una fila por OC y unidad de medida (no se suman unidades). */
function FulfillmentContent({ kpi }: { kpi: PurchaseOrderReceiptKpis["cumplimiento_cantidad"] }) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>No hay OCs para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Folio OC</th>
          <th className={TH_CLASS}>Unidad</th>
          <th className={`${TH_CLASS} text-right`}>Ordenada</th>
          <th className={`${TH_CLASS} text-right`}>Recibida</th>
          <th className={`${TH_CLASS} text-right`}>Cumplimiento</th>
        </>
      }
    >
      {kpi.drill_down.map((row) => (
        <tr key={`${row.oc_id}-${row.unidad_id ?? "sin-unidad"}`}>
          <td className={TD_CLASS}>
            {/* Enlace real al detalle de la OC, cuyo "Volver" regresa a esta
                lista. Sin folio sigue siendo clicable con `#id`, igual que los
                indicadores de OC y `PedidoFolioLink`: el enlace solo necesita
                `oc_id`. */}
            <Link
              href={purchaseOrderDetailHref(row.oc_id, "purchase-order-receipts")}
              className={FOLIO_LINK_CLASS}
              title="Ver detalle"
            >
              {row.folio || `#${row.oc_id}`}
            </Link>
          </td>
          <td className={TD_CLASS}>{unitLabel(row.unidad)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.cantidad_ordenada)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.cantidad_recibida)}</td>
          <td className={NUM_TD_CLASS}>{formatKpiPctOrDash(row.pct)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

function PriceContent({
  kpi,
  showAmounts,
}: {
  kpi: PurchaseOrderReceiptKpis["diferencia_precio"];
  showAmounts: boolean;
}) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>No hay partidas con diferencia de precio para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Factura</th>
          <th className={TH_CLASS}>Producto</th>
          <th className={TH_CLASS}>Moneda</th>
          {showAmounts && (
            <>
              <th className={`${TH_CLASS} text-right`}>Precio facturado</th>
              <th className={`${TH_CLASS} text-right`}>Precio OC</th>
              <th className={`${TH_CLASS} text-right`}>Diferencia</th>
            </>
          )}
        </>
      }
    >
      {kpi.drill_down.map((row) => (
        <tr key={row.id}>
          {/* Sin ruta de detalle de factura de proveedor: folio en texto. */}
          <td className={`${TD_CLASS} font-mono`}>{textOrDash(row.factura_folio)}</td>
          <td className={TD_CLASS}>{textOrDash(row.producto)}</td>
          <td className={TD_CLASS}>{row.moneda}</td>
          {showAmounts && (
            <>
              <td className={NUM_TD_CLASS}>{formatKpiCurrencyAmount(row.precio_facturado, row.moneda)}</td>
              <td className={NUM_TD_CLASS}>{formatKpiCurrencyAmount(row.precio_pactado, row.moneda)}</td>
              {/* Con signo, igual que la tarjeta. */}
              <td className={NUM_TD_CLASS}>{formatKpiSignedCurrencyAmount(row.diferencia_linea, row.moneda)}</td>
            </>
          )}
        </tr>
      ))}
    </LineItemsTable>
  );
}

function RejectedContent({
  kpi,
  showAmounts,
}: {
  kpi: PurchaseOrderReceiptKpis["material_rechazado"];
  showAmounts: boolean;
}) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>No hay material rechazado para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Recepción</th>
          <th className={TH_CLASS}>Producto</th>
          <th className={`${TH_CLASS} text-right`}>Rechazado</th>
          <th className={TH_CLASS}>Unidad</th>
          {showAmounts && (
            <>
              <th className={TH_CLASS}>Moneda</th>
              <th className={`${TH_CLASS} text-right`}>Valor</th>
            </>
          )}
          <th className={TH_CLASS}>Motivo</th>
        </>
      }
    >
      {kpi.drill_down.map((row) => (
        <tr key={row.id}>
          {/* Sin ruta de detalle de recepción: folio en texto. */}
          <td className={`${TD_CLASS} font-mono`}>{textOrDash(row.recepcion_folio)}</td>
          <td className={TD_CLASS}>{textOrDash(row.producto)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.cantidad_rechazada)}</td>
          <td className={TD_CLASS}>{unitLabel(row.unidad)}</td>
          {showAmounts && (
            <>
              <td className={TD_CLASS}>{row.moneda}</td>
              <td className={NUM_TD_CLASS}>
                {row.valor_linea === undefined ? "—" : formatKpiCurrencyAmount(row.valor_linea, row.moneda)}
              </td>
            </>
          )}
          <td className={TD_CLASS}>{textOrDash(row.motivo_rechazo)}</td>
        </tr>
      ))}
    </LineItemsTable>
  );
}

const TITLES: Record<PurchaseOrderReceiptKpiDialogKind, string> = {
  cumplimiento_cantidad: "Cumplimiento de cantidad por OC",
  diferencia_precio: "Diferencias de precio/costo",
  material_rechazado: "Material rechazado",
};

interface PurchaseOrderReceiptKpiDialogProps {
  open: boolean;
  /**
   * ÚLTIMO bloque abierto (estado de la sección). Se conserva al cerrar, así
   * que el título y las filas siguen ahí durante la animación de salida;
   * `null` solo antes de la primera apertura.
   */
  kind: PurchaseOrderReceiptKpiDialogKind | null;
  data: PurchaseOrderReceiptKpis | undefined;
  /** Misma regla que su tarjeta (`resolveKpiAmountState`). */
  showPriceAmounts: boolean;
  /** Misma regla que su tarjeta (`resolveKpiAmountState`). */
  showRejectedAmounts: boolean;
  onClose: () => void;
}

/**
 * Drill-down de un indicador de recepciones, armado con el payload ya cargado
 * (sin fetch propio). Lee siempre los datos ACTUALES de la consulta, así que un
 * refetch con el diálogo abierto se refleja sin reabrirlo. Cada importe va en
 * la moneda de SU fila; sin importes visibles se ocultan las columnas de
 * dinero, y cantidades y porcentajes se muestran siempre.
 */
export function PurchaseOrderReceiptKpiDialog({
  open,
  kind,
  data,
  showPriceAmounts,
  showRejectedAmounts,
  onClose,
}: PurchaseOrderReceiptKpiDialogProps) {
  return (
    <MainDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={kind ? TITLES[kind] : ""}
      description={getDescription(kind, data)}
      maxWidth="820px"
    >
      {kind === "cumplimiento_cantidad" && data && <FulfillmentContent kpi={data.cumplimiento_cantidad} />}
      {kind === "diferencia_precio" && data && (
        <PriceContent kpi={data.diferencia_precio} showAmounts={showPriceAmounts} />
      )}
      {kind === "material_rechazado" && data && (
        <RejectedContent kpi={data.material_rechazado} showAmounts={showRejectedAmounts} />
      )}
    </MainDialog>
  );
}

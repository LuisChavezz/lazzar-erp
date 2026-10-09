"use client";

import Link from "next/link";
import { MainDialog } from "@/src/components/MainDialog";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { formatMoneyValue, formatQuantityValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { formatKpiMonto, formatKpiPct, plural } from "@/src/utils/kpiFormat";
import type { PurchaseOrderReceiptKpis } from "../interfaces/purchase-order-receipt-kpis.interface";

/** Bloques con drill-down (`recepciones_parciales` no lo tiene). */
export type PurchaseOrderReceiptKpiDialogKind = "cumplimiento_cantidad" | "diferencia_precio" | "material_rechazado";

const FOLIO_LINK_CLASS =
  "font-mono font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer";

const TH_CLASS = "px-3 py-2 font-semibold";
const TD_CLASS = "px-3 py-2 text-slate-600 dark:text-slate-300";
const NUM_TD_CLASS = `${TD_CLASS} text-right tabular-nums whitespace-nowrap`;

// Tope de filas de cada drill-down. El backend no avisa si recortó, así que con
// la lista llena solo se puede decir que PUEDE haber más.
const DRILL_DOWN_BACKEND_LIMIT = 20;

const pctOrDash = (value: number | null): string => (value === null ? "—" : formatKpiPct(value));

/** Importe opcional: ausente o `null` → "—" (nunca un 0.00 engañoso). */
const montoOrDash = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : formatKpiMonto(value);

/**
 * Descripción del diálogo: el CONTEO de lo que se muestra. Sin filas solo da el
 * aviso de "sin datos" (el cuerpo lo repite con `EmptyLines`, con otra frase).
 */
function describeRows(count: number, singular: string, pluralForm: string): string {
  if (count === 0) return `Sin ${pluralForm} que mostrar`;
  const rows = `${count} ${plural(count, singular, pluralForm)}`;
  return count >= DRILL_DOWN_BACKEND_LIMIT ? `Mostrando ${rows}; puede haber más` : `Mostrando ${rows}`;
}

function getDescription(kind: PurchaseOrderReceiptKpiDialogKind | null, data: PurchaseOrderReceiptKpis | undefined) {
  if (kind === "cumplimiento_cantidad" && data?.cumplimiento_cantidad.disponible) {
    return describeRows(data.cumplimiento_cantidad.drill_down.length, "OC", "OCs");
  }
  if (kind === "diferencia_precio" && data?.diferencia_precio.disponible) {
    return describeRows(data.diferencia_precio.drill_down.length, "partida", "partidas");
  }
  if (kind === "material_rechazado" && data?.material_rechazado.disponible) {
    return describeRows(data.material_rechazado.drill_down.length, "renglón rechazado", "renglones rechazados");
  }
  return "Indicador no disponible por ahora.";
}

function FulfillmentContent({ kpi }: { kpi: PurchaseOrderReceiptKpis["cumplimiento_cantidad"] }) {
  if (!kpi.disponible || kpi.drill_down.length === 0) {
    return <EmptyLines>No hay OCs para mostrar.</EmptyLines>;
  }
  return (
    <LineItemsTable
      head={
        <>
          <th className={TH_CLASS}>Folio OC</th>
          <th className={`${TH_CLASS} text-right`}>Ordenada</th>
          <th className={`${TH_CLASS} text-right`}>Recibida</th>
          <th className={`${TH_CLASS} text-right`}>Cumplimiento</th>
        </>
      }
    >
      {kpi.drill_down.map((row) => (
        <tr key={row.oc_id}>
          <td className={TD_CLASS}>
            {/* Sin folio, texto plano; con folio, enlace real al detalle de la
                OC, cuyo "Volver" regresa a esta lista. */}
            {row.folio ? (
              <Link
                href={purchaseOrderDetailHref(row.oc_id, "purchase-order-receipts")}
                className={FOLIO_LINK_CLASS}
                title="Ver detalle"
              >
                {row.folio}
              </Link>
            ) : (
              <span className="font-mono">{`#${row.oc_id}`}</span>
            )}
          </td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.cantidad_ordenada)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.cantidad_recibida)}</td>
          <td className={NUM_TD_CLASS}>{pctOrDash(row.pct)}</td>
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
          <td className={`${TD_CLASS} font-mono`}>{textOrDash(row.factura_proveedor__folio)}</td>
          <td className={TD_CLASS}>{textOrDash(row.oc_detalle__producto__nombre)}</td>
          {showAmounts && (
            <>
              <td className={NUM_TD_CLASS}>{montoOrDash(row.precio_unitario)}</td>
              <td className={NUM_TD_CLASS}>{montoOrDash(row.oc_detalle__precio)}</td>
              {/* Con signo, igual que la tarjeta. */}
              <td className={NUM_TD_CLASS}>
                {row.diferencia_linea === undefined
                  ? "—"
                  : formatMoneyValue(row.diferencia_linea, { ...NO_CURRENCY_FORMAT, signDisplay: "exceptZero" })}
              </td>
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
          {showAmounts && <th className={`${TH_CLASS} text-right`}>Valor</th>}
          <th className={TH_CLASS}>Motivo</th>
        </>
      }
    >
      {kpi.drill_down.map((row) => (
        <tr key={row.id}>
          {/* Sin ruta de detalle de recepción por folio: texto. */}
          <td className={`${TD_CLASS} font-mono`}>{textOrDash(row.recepcion_detalle__recepcion__folio)}</td>
          <td className={TD_CLASS}>{textOrDash(row.recepcion_detalle__producto__nombre)}</td>
          <td className={NUM_TD_CLASS}>{formatQuantityValue(row.cantidad_rechazada)}</td>
          {/* `valor_linea` es `null` en recepciones de producción. */}
          {showAmounts && <td className={NUM_TD_CLASS}>{montoOrDash(row.valor_linea)}</td>}
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
  /** Ver `getPurchaseOrderKpiAmountVisibility`: solo `visible` muestra importes. */
  showAmounts: boolean;
  onClose: () => void;
}

/**
 * Drill-down de un indicador de recepciones, armado con el payload ya cargado
 * (sin fetch propio). Lee siempre los datos ACTUALES de la consulta, así que un
 * refetch con el diálogo abierto se refleja sin reabrirlo. Sin importes
 * visibles se ocultan las columnas de dinero; cantidades y porcentajes siempre
 * se muestran.
 */
export function PurchaseOrderReceiptKpiDialog({
  open,
  kind,
  data,
  showAmounts,
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
      maxWidth="760px"
    >
      {kind === "cumplimiento_cantidad" && data && <FulfillmentContent kpi={data.cumplimiento_cantidad} />}
      {kind === "diferencia_precio" && data && (
        <PriceContent kpi={data.diferencia_precio} showAmounts={showAmounts} />
      )}
      {kind === "material_rechazado" && data && (
        <RejectedContent kpi={data.material_rechazado} showAmounts={showAmounts} />
      )}
    </MainDialog>
  );
}

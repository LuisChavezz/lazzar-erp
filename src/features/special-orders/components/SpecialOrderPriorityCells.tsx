"use client";

import Link from "next/link";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useClientNow } from "@/src/hooks/useClientNow";
import { PRE_ORDER_STATUS_CFG } from "@/src/features/pre-orders/constants/preOrderStatus";
import { SemaforoBadge } from "@/src/features/pre-orders/components/PreOrderTracking";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { getMexicoTodayDate, MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import {
  isClosedProductionOrderStatus,
  productionOrderStatusEntry,
} from "@/src/features/production-orders/constants/productionOrderStatus";
import type { SpecialOrderListItem } from "../interfaces/special-order.interface";

const DASH = <span className="text-sm text-slate-400 dark:text-slate-600">—</span>;

/** Días de calendario entre dos llaves `YYYY-MM-DD` (b − a). */
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Fecha compromiso con los días que faltan. El conteo se calcula después de
 * montar (`useClientNow`): el prerender y la hidratación pintan solo la fecha.
 */
export function EntregaCell({ fecha }: { fecha: string | null | undefined }) {
  const now = useClientNow();
  if (!fecha) return DASH;
  const key = fecha.slice(0, 10);
  const dias = now === null ? null : daysBetween(getMexicoTodayDate(new Date(now)), key);
  const tone =
    dias === null
      ? "text-slate-500 dark:text-slate-400"
      : dias < 0
        ? "text-red-600 dark:text-red-400"
        : dias <= 7
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-500 dark:text-slate-400";
  const label =
    dias === null
      ? null
      : dias < 0
        ? `Vencido hace ${-dias} ${-dias === 1 ? "día" : "días"}`
        : dias === 0
          ? "Vence hoy"
          : `Faltan ${dias} ${dias === 1 ? "día" : "días"}`;

  return (
    <div className="flex flex-col">
      <span className="text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {formatShortDate(`${key}T12:00:00Z`, { timeZone: MEXICO_TIME_ZONE })}
      </span>
      {label && <span className={`text-[11px] font-semibold whitespace-nowrap ${tone}`}>{label}</span>}
    </div>
  );
}

const SERVICIOS = [
  { key: "bordado", label: "Bordado" },
  { key: "reflejante", label: "Reflejante" },
  { key: "corte_manga", label: "Corte manga" },
] as const;

/** "3 prendas · 120 pzs" y, debajo, los servicios que lleva. */
export function TrabajoCell({ order }: { order: SpecialOrderListItem }) {
  if (order.prendas_total === undefined && order.piezas_total === undefined) return DASH;
  const partes = [
    order.prendas_total !== undefined &&
      `${order.prendas_total} ${order.prendas_total === 1 ? "prenda" : "prendas"}`,
    order.piezas_total !== undefined && `${formatQuantityValue(order.piezas_total)} pzs`,
  ].filter(Boolean);
  const servicios = SERVICIOS.filter(({ key }) => order.servicios?.[key]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {partes.join(" · ")}
      </span>
      {servicios.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {servicios.map(({ key, label }) => (
            <span
              key={key}
              className="rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 whitespace-nowrap"
            >
              {label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

type Paso = { label: string; cls: string };

const PASO = {
  sku: { label: "Generar SKU", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  validar: { label: "Validar existencias", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  material: { label: "Esperando material", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" },
  op: { label: "Crear OP", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
  produccion: { label: "En producción", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" },
  terminado: { label: "OP cerradas", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
} satisfies Record<string, Paso>;

/**
 * Siguiente paso del pedido, derivado de lo que ya trae la fila: primero el
 * alta de SKU, luego crear la OP, luego producción. `null` si falta el dato.
 */
export const getSiguientePaso = (order: SpecialOrderListItem): Paso | null => {
  const { tallas_total: total, tallas_con_sku: conSku, ordenes_produccion: ops } = order;
  if (total !== undefined && conSku !== undefined && total > 0 && conSku < total) return PASO.sku;
  if (ops === undefined) return null;
  if (ops.length === 0) {
    // Con pre-orden, el paso lo marca su estatus: almacén valida, compras
    // surte y, con todo el material, ya se puede crear la OP.
    switch (order.pre_orden?.estatus) {
      case "pendiente_validar":
        return PASO.validar;
      case "faltan_materiales":
      case "en_compra":
        return PASO.material;
      default:
        return PASO.op;
    }
  }
  return ops.every((op) => isClosedProductionOrderStatus(op.estatus_op)) ? PASO.terminado : PASO.produccion;
};

export function SiguientePasoCell({ order }: { order: SpecialOrderListItem }) {
  const paso = getSiguientePaso(order);
  if (!paso) return DASH;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${paso.cls}`}>
      {paso.label}
    </span>
  );
}

/** Estatus de la pre-orden con enlace a su página; "Sin pre-orden" si aún no hay. */
export function PreOrdenCell({ order }: { order: SpecialOrderListItem }) {
  const pre = order.pre_orden;
  if (pre === undefined) return DASH;
  if (pre === null) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Sin pre-orden</span>;
  }
  return (
    <Link
      href={`/manufacturing/pre-orders/${pre.id}`}
      title="Ver pre-orden"
      className="inline-flex flex-col items-start gap-1 hover:opacity-80"
    >
      <StatusBadge status={pre.estatus} config={PRE_ORDER_STATUS_CFG} />
      {pre.estatus !== "convertida" && pre.estatus !== "cancelada" && pre.semaforo && (
        <SemaforoBadge semaforo={pre.semaforo} />
      )}
    </Link>
  );
}

/** Folios de las OP ligadas, cada uno con su estatus y enlace a su detalle. */
export function OpsCell({ order }: { order: SpecialOrderListItem }) {
  const ops = order.ordenes_produccion;
  if (ops === undefined) return DASH;
  if (ops.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Sin OP</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {ops.map((op) => (
        <span key={op.op_id} className="flex items-center gap-1.5 whitespace-nowrap">
          <Link
            href={`/manufacturing/production-orders/${op.op_id}`}
            title="Ver orden de producción"
            className="font-mono text-xs text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline"
          >
            {op.folio_op}
          </Link>
          <StatusBadge
            status={String(op.estatus_op)}
            config={{ [op.estatus_op]: productionOrderStatusEntry(op.estatus_op, op.estatus_op_display) }}
          />
        </span>
      ))}
    </div>
  );
}

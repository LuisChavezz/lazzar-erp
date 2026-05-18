"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { PurchaseOrderReview, ReviewStatus, TipoCompra } from "../interfaces/purchase-order-review.interface";
import {
  REVIEW_STEPS,
  REVIEW_STATUS_LABELS,
  TIPO_COMPRA_LABELS,
} from "../interfaces/purchase-order-review.interface";
import { ActionMenu } from "@/src/components/ActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { PurchaseOrderReviewDialog } from "./PurchaseOrderReviewDialog";
import {
  HistoryIcon,
  ClipboardListIcon,
  PackageCheckIcon,
  ReceiptIcon,
  CheckCircleIcon,
  RejectIcon,
  RefreshIcon,
  ComprasIcon,
  ErrorIcon,
} from "@/src/components/Icons";

// ── Configuración visual por estatus ─────────────────────────────────────────

const ESTATUS_CFG: Record<ReviewStatus, { cls: string; dot: string }> = {
  solicitud_generada:     { cls: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',           dot: 'bg-slate-400' },
  oc_creada:              { cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',                   dot: 'bg-sky-500' },
  esperando_confirmacion: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',           dot: 'bg-amber-400' },
  en_seguimiento:         { cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',       dot: 'bg-indigo-500' },
  contando_registrando:   { cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',       dot: 'bg-violet-500' },
  recepcion_confirmada:   { cls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',               dot: 'bg-teal-500' },
  factura_subida:         { cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',               dot: 'bg-cyan-500' },
  cxp_revisado:           { cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',       dot: 'bg-orange-400' },
  completado:             { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',   dot: 'bg-emerald-500' },
  no_recontactar:         { cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',                   dot: 'bg-red-500' },
  material_no_recibido:   { cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',       dot: 'bg-orange-500' },
  cancelado:              { cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',               dot: 'bg-zinc-400' },
};

const TIPO_CLS: Record<TipoCompra, string> = {
  directa: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  stock:   'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
};

// ── Subcomponente: badge de estatus ───────────────────────────────────────────

const EstatusBadge = ({ estatus }: { estatus: ReviewStatus }) => {
  const cfg = ESTATUS_CFG[estatus];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {REVIEW_STATUS_LABELS[estatus]}
    </span>
  );
};

// ── Subcomponente: mini stepper de progreso ───────────────────────────────────

/**
 * Indicador visual de progreso sobre los 8 pasos canónicos.
 * Estados especiales (no_recontactar, material_no_recibido, cancelado, completado)
 * solo muestran los puntos, sin etiqueta de texto.
 */
const MiniStepper = ({ pasoActual, estatus }: { pasoActual: number; estatus: ReviewStatus }) => {
  const total           = REVIEW_STEPS.length; // 8
  const esCancelado     = estatus === 'cancelado';
  const esNoRec         = estatus === 'no_recontactar';
  const esCompletado    = estatus === 'completado';
  const esMaterialNoRec = estatus === 'material_no_recibido';
  const filled = Math.min(pasoActual, total);

  // Solo los pasos activos (no terminales) muestran el contador de progreso
  const esEspecial = esCancelado || esNoRec || esCompletado || esMaterialNoRec;
  const label = esEspecial ? null : `Paso ${filled} / ${total}`;

  return (
    <div className="flex flex-col gap-1 min-w-28">
      {label && (
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{label}</span>
      )}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {REVIEW_STEPS.map((_, i) => {
          const isDone    = i < filled;
          const isCurrent = i === filled - 1 && !esCompletado;

          let dotCls: string;
          if (esCancelado) {
            dotCls = isDone
              ? 'bg-zinc-400 w-2.5 h-2.5 rounded-sm'
              : 'bg-zinc-200 dark:bg-zinc-700 w-2.5 h-2.5 rounded-sm';
          } else if (esNoRec) {
            // Último punto en rojo (el paso bloqueado), los anteriores en azul
            dotCls = isDone
              ? `${i < filled - 1 ? 'bg-blue-400' : 'bg-red-500'} w-2.5 h-2.5 rounded-sm`
              : 'bg-slate-200 dark:bg-slate-700 w-2.5 h-2.5 rounded-sm';
          } else if (esMaterialNoRec) {
            // Último punto en naranja (material no llegó), los anteriores en azul
            dotCls = isDone
              ? `${i < filled - 1 ? 'bg-blue-400' : 'bg-orange-500'} w-2.5 h-2.5 rounded-sm`
              : 'bg-slate-200 dark:bg-slate-700 w-2.5 h-2.5 rounded-sm';
          } else if (esCompletado) {
            dotCls = 'bg-emerald-500 w-2.5 h-2.5 rounded-sm';
          } else if (isCurrent) {
            dotCls = 'bg-sky-500 w-2.5 h-2.5 rounded-sm ring-2 ring-sky-200 dark:ring-sky-800';
          } else {
            dotCls = isDone
              ? 'bg-sky-400 w-2.5 h-2.5 rounded-sm'
              : 'bg-slate-200 dark:bg-slate-700 w-2.5 h-2.5 rounded-sm';
          }

          return <span key={i} className={`${dotCls} transition-all`} />;
        })}
      </div>
    </div>
  );
};

// ── Subcomponente: celda de monto ─────────────────────────────────────────────

const MontoCelda = ({ monto }: { monto: number }) => (
  <div className="flex flex-col items-start">
    <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200 font-mono">
      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)}
    </span>
    <span className="text-[10px] font-semibold text-slate-400">MXN</span>
  </div>
);

// ── Mapa de acciones por estatus ──────────────────────────────────────────────

/**
 * Retorna las acciones disponibles según el estatus actual de la revisión.
 * Las acciones de mutación solo muestran un alert en el mock.
 */
function getAcciones(review: PurchaseOrderReview, onVerHistorial: () => void): ActionMenuItem[] {
  const { estatus } = review;

  // Acción universal: ver historial del flujo
  const verHistorial: ActionMenuItem = {
    label:    'Ver historial',
    icon:     HistoryIcon,
    onSelect: onVerHistorial,
  };

  // Acciones dependientes del estatus
  const acciones: ActionMenuItem[] = [verHistorial];

  switch (estatus) {
    case 'solicitud_generada':
      acciones.push({
        label:    'Crear OC',
        icon:     ComprasIcon,
        onSelect: () => alert(`[Mock] Crear OC para ${review.folio}`),
      });
      break;

    case 'oc_creada':
      acciones.push({
        label:    'Enviar a proveedor',
        icon:     ClipboardListIcon,
        onSelect: () => alert(`[Mock] Enviar OC ${review.oc_referencia} al proveedor`),
      });
      break;

    case 'esperando_confirmacion':
      acciones.push(
        {
          label:    'Registrar confirmación del proveedor',
          icon:     CheckCircleIcon,
          onSelect: () => alert(`[Mock] Proveedor confirmó recepción de ${review.folio}`),
        },
        {
          label:    'Marcar NO recontactar',
          icon:     ErrorIcon,
          onSelect: () => alert(`[Mock] ${review.folio} marcada como NO recontactar`),
        },
      );
      break;

    case 'en_seguimiento':
      acciones.push(
        {
          label:    'Registrar recepción de material',
          icon:     PackageCheckIcon,
          onSelect: () => alert(`[Mock] Registrar llegada de material para ${review.folio}`),
        },
      );
      break;

    case 'material_no_recibido':
      acciones.push(
        {
          label:    'Registrar segunda recepción',
          icon:     PackageCheckIcon,
          onSelect: () => alert(`[Mock] Reintentar recepción para ${review.folio}`),
        },
        {
          label:    'Cancelar revisión',
          icon:     RejectIcon,
          onSelect: () => alert(`[Mock] Cancelar ${review.folio}`),
        },
      );
      break;

    case 'contando_registrando':
      acciones.push({
        label:    'Confirmar recepción en sistema',
        icon:     PackageCheckIcon,
        onSelect: () => alert(`[Mock] Confirmar recepción y generar folio R.T. para ${review.folio}`),
      });
      break;

    case 'recepcion_confirmada':
      acciones.push({
        label:    'Subir factura (R.T.)',
        icon:     ReceiptIcon,
        onSelect: () => alert(`[Mock] Subir factura según R.T. ${review.folio_rt ?? ''} para ${review.folio}`),
      });
      break;

    case 'factura_subida':
      acciones.push(
        {
          label:    'Aplicar nota de crédito / devolución',
          icon:     RefreshIcon,
          onSelect: () => alert(`[Mock] Aplicar nota de crédito para ${review.folio}`),
        },
        {
          label:    'Consultar CxP pagos pendientes',
          icon:     ReceiptIcon,
          onSelect: () => alert(`[Mock] Consultar CxP para ${review.folio}`),
        },
      );
      break;

    case 'cxp_revisado':
      acciones.push({
        label:    'Cerrar revisión',
        icon:     CheckCircleIcon,
        onSelect: () => alert(`[Mock] Cerrar revisión ${review.folio}`),
      });
      break;

    case 'no_recontactar':
      acciones.push(
        {
          label:    'Reactivar revisión',
          icon:     RefreshIcon,
          onSelect: () => alert(`[Mock] Reactivar ${review.folio}`),
        },
        {
          label:    'Cancelar revisión',
          icon:     RejectIcon,
          onSelect: () => alert(`[Mock] Cancelar ${review.folio}`),
        },
      );
      break;

    default:
      // completado / cancelado — solo lectura
      break;
  }

  return acciones;
}

// ── Columnas del DataTable ────────────────────────────────────────────────────

const col = createColumnHelper<PurchaseOrderReview>();

/**
 * Genera las columnas del DataTable para revisiones de pedidos.
 * El callback `onVerDetalle` es inyectado externamente para poder abrir
 * el dialog de detalle desde la columna de acciones.
 */
export function getReviewColumns(): ColumnDef<PurchaseOrderReview, unknown>[] {
  return [
    // ── Folio / OC referencia ─────────────────────────────────────────────
    col.accessor('folio', {
      header: 'Folio',
      size:   130,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-white">{r.folio}</span>
            <span className="text-[10px] text-slate-400 font-mono">{r.oc_referencia}</span>
          </div>
        );
      },
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Tipo de compra ────────────────────────────────────────────────────
    col.accessor('tipo_compra', {
      header: 'Tipo',
      size:   130,
      cell: ({ getValue }) => {
        const tipo = getValue() as TipoCompra;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${TIPO_CLS[tipo]}`}>
            {TIPO_COMPRA_LABELS[tipo]}
          </span>
        );
      },
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Proveedor ─────────────────────────────────────────────────────────
    col.accessor('proveedor', {
      header: 'Proveedor',
      size:   200,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">
              {r.proveedor}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{r.rfc_proveedor}</span>
          </div>
        );
      },
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Descripción / categoría ───────────────────────────────────────────
    col.accessor('descripcion', {
      header: 'Descripción',
      size:   200,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug">{r.descripcion}</span>
            <span className="text-[10px] text-slate-400">{r.categoria}</span>
          </div>
        );
      },
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Monto ─────────────────────────────────────────────────────────────
    col.accessor('monto_total', {
      header: 'Monto',
      size:   120,
      cell: ({ row }) => (
        <MontoCelda monto={row.original.monto_total} />
      ),
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Progreso ──────────────────────────────────────────────────────────
    col.accessor('paso_actual', {
      header: 'Progreso',
      size:   160,
      cell: ({ row }) => (
        <MiniStepper pasoActual={row.original.paso_actual} estatus={row.original.estatus} />
      ),
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Estatus ───────────────────────────────────────────────────────────
    col.accessor('estatus', {
      header: 'Estatus',
      size:   185,
      cell: ({ getValue }) => <EstatusBadge estatus={getValue() as ReviewStatus} />,
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Responsable de compras ────────────────────────────────────────────
    col.accessor('responsable_compras', {
      header: 'Responsable',
      size:   130,
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{getValue() as string}</span>
      ),
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Fecha solicitud ───────────────────────────────────────────────────
    col.accessor('fecha_solicitud', {
      header: 'F. Solicitud',
      size:   110,
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {new Date(getValue() as string).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
        </span>
      ),
    }) as ColumnDef<PurchaseOrderReview, unknown>,

    // ── Acciones ──────────────────────────────────────────────────────────
    col.display({
      id:   'acciones',
      size: 60,
      cell: ({ row }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [open, setOpen] = useState(false);
        const acciones = getAcciones(row.original, () => setOpen(true));

        return (
          <>
            <ActionMenu items={acciones} ariaLabel={`Acciones para ${row.original.folio}`} />
            <PurchaseOrderReviewDialog
              review={row.original}
              open={open}
              onOpenChange={setOpen}
            />
          </>
        );
      },
    }) as ColumnDef<PurchaseOrderReview, unknown>,
  ];
}

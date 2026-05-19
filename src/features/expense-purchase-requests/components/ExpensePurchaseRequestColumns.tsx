"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type {
  ExpensePurchaseRequest,
  ExpenseRequestStatus,
  TipoGasto,
} from "../interfaces/expense-purchase-request.interface";
import {
  EXPENSE_REQUEST_STEPS,
  EXPENSE_REQUEST_STATUS_LABELS,
  TIPO_GASTO_LABELS,
} from "../interfaces/expense-purchase-request.interface";
import { ActionMenu } from "@/src/components/ActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { ExpensePurchaseRequestDialog } from "./ExpensePurchaseRequestDialog";
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
  EmailIcon,
  TasksIcon,
  CxpIcon,
} from "@/src/components/Icons";

// ── Configuración visual por estatus ─────────────────────────────────────────

const ESTATUS_CFG: Record<ExpenseRequestStatus, { cls: string; dot: string }> = {
  revision_requerimiento: { cls: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',           dot: 'bg-slate-400' },
  contactando_proveedor:  { cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',                   dot: 'bg-sky-500' },
  cotizacion_solicitada:  { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',               dot: 'bg-blue-500' },
  en_revision:            { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',           dot: 'bg-amber-400' },
  pedido_emitido:         { cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',       dot: 'bg-indigo-500' },
  en_seguimiento:         { cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',       dot: 'bg-violet-500' },
  compra_recibida:        { cls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',               dot: 'bg-teal-500' },
  factura_firmada:        { cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',               dot: 'bg-cyan-500' },
  rg_registrado:          { cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',       dot: 'bg-orange-400' },
  documentos_integrados:  { cls: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400',               dot: 'bg-lime-500' },
  completado:             { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',   dot: 'bg-emerald-500' },
  rechazado:              { cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',                   dot: 'bg-red-500' },
  cancelado:              { cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',               dot: 'bg-zinc-400' },
};

// Colores por tipo de gasto (pill-badge)
const TIPO_GASTO_CLS: Record<TipoGasto, string> = {
  papeleria:               'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  material_oficina:        'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  limpieza:                'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  mantenimiento:           'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  servicios_profesionales: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  transportacion:          'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  hospedaje_viaticos:      'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  suscripciones:           'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  seguridad:               'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  cafeteria:               'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  otros:                   'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
};

// ── Subcomponente: badge de estatus ───────────────────────────────────────────

const EstatusBadge = ({ estatus }: { estatus: ExpenseRequestStatus }) => {
  const cfg = ESTATUS_CFG[estatus];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {EXPENSE_REQUEST_STATUS_LABELS[estatus]}
    </span>
  );
};

// ── Subcomponente: badge de tipo de gasto ─────────────────────────────────────

const TipoGastoBadge = ({ tipo }: { tipo: TipoGasto }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${TIPO_GASTO_CLS[tipo]}`}>
    {TIPO_GASTO_LABELS[tipo]}
  </span>
);

// ── Subcomponente: mini stepper de 10 pasos ───────────────────────────────────

/**
 * Indicador de progreso sobre los 10 pasos canónicos del flujo de gastos.
 * Estados especiales (rechazado, cancelado, completado) no muestran etiqueta.
 */
const MiniStepper = ({ pasoActual, estatus }: { pasoActual: number; estatus: ExpenseRequestStatus }) => {
  const total        = EXPENSE_REQUEST_STEPS.length; // 10
  const esCancelado  = estatus === 'cancelado';
  const esRechazado  = estatus === 'rechazado';
  const esCompletado = estatus === 'completado';
  const filled       = Math.min(pasoActual, total);

  const esEspecial = esCancelado || esRechazado || esCompletado;
  const label = esEspecial ? null : `Paso ${filled} / ${total}`;

  return (
    <div className="flex flex-col gap-1 min-w-28">
      {label && (
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{label}</span>
      )}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {EXPENSE_REQUEST_STEPS.map((_, i) => {
          const isDone    = i < filled;
          const isCurrent = i === filled - 1 && !esCompletado;

          let dotCls: string;
          if (esCancelado) {
            dotCls = isDone
              ? 'bg-zinc-400 w-2.5 h-2.5 rounded-sm'
              : 'bg-zinc-200 dark:bg-zinc-700 w-2.5 h-2.5 rounded-sm';
          } else if (esRechazado) {
            // Último punto relleno en rojo (bloqueado en revisión), anteriores en azul
            dotCls = isDone
              ? `${i < filled - 1 ? 'bg-blue-400' : 'bg-red-500'} w-2.5 h-2.5 rounded-sm`
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
 * Retorna las acciones disponibles según el estatus de la solicitud de gasto.
 * Las acciones de mutación solo muestran un alert en el mock.
 */
function getAcciones(
  request: ExpensePurchaseRequest,
  onVerHistorial: () => void,
): ActionMenuItem[] {
  const { estatus } = request;

  // Acción universal: ver historial del flujo
  const verHistorial: ActionMenuItem = {
    label:    'Ver historial',
    icon:     HistoryIcon,
    onSelect: onVerHistorial,
  };

  const acciones: ActionMenuItem[] = [verHistorial];

  switch (estatus) {
    case 'revision_requerimiento':
      acciones.push({
        label:    'Contactar proveedor',
        icon:     EmailIcon,
        onSelect: () => alert(`[Mock] Contactar proveedor para ${request.folio}`),
      });
      break;

    case 'contactando_proveedor':
      acciones.push({
        label:    'Registrar cotización solicitada',
        icon:     ClipboardListIcon,
        onSelect: () => alert(`[Mock] Cotización solicitada para ${request.folio}`),
      });
      break;

    case 'cotizacion_solicitada':
      acciones.push({
        label:    'Enviar a revisión (Cobranza / Gerencia)',
        icon:     TasksIcon,
        onSelect: () => alert(`[Mock] Enviando ${request.folio} a revisión`),
      });
      break;

    case 'en_revision':
      acciones.push(
        {
          label:    'Aprobar y emitir pedido',
          icon:     CheckCircleIcon,
          onSelect: () => alert(`[Mock] Solicitud ${request.folio} aprobada`),
        },
        {
          label:    'Rechazar solicitud',
          icon:     RejectIcon,
          onSelect: () => alert(`[Mock] Solicitud ${request.folio} rechazada`),
        },
      );
      break;

    case 'pedido_emitido':
      acciones.push({
        label:    'Registrar seguimiento de entrega',
        icon:     HistoryIcon,
        onSelect: () => alert(`[Mock] Seguimiento registrado para ${request.folio}`),
      });
      break;

    case 'en_seguimiento':
      acciones.push({
        label:    'Registrar recepción de compra',
        icon:     PackageCheckIcon,
        onSelect: () => alert(`[Mock] Recepción registrada para ${request.folio}`),
      });
      break;

    case 'compra_recibida':
      acciones.push({
        label:    'Registrar firma de factura',
        icon:     ReceiptIcon,
        onSelect: () => alert(`[Mock] Factura firmada para ${request.folio}`),
      });
      break;

    case 'factura_firmada':
      acciones.push({
        label:    'Registrar R.G. en PROSCAI',
        icon:     ClipboardListIcon,
        onSelect: () => alert(`[Mock] R.G. registrado en PROSCAI para ${request.folio}`),
      });
      break;

    case 'rg_registrado':
      acciones.push({
        label:    'Integrar documentos',
        icon:     ClipboardListIcon,
        onSelect: () => alert(`[Mock] Documentos integrados para ${request.folio}`),
      });
      break;

    case 'documentos_integrados':
      acciones.push({
        label:    'Enviar a Cobranza para cierre',
        icon:     CxpIcon,
        onSelect: () => alert(`[Mock] Enviando ${request.folio} a Cobranza`),
      });
      break;

    case 'rechazado':
      acciones.push(
        {
          label:    'Reactivar solicitud',
          icon:     RefreshIcon,
          onSelect: () => alert(`[Mock] Reactivar ${request.folio}`),
        },
        {
          label:    'Cancelar solicitud',
          icon:     RejectIcon,
          onSelect: () => alert(`[Mock] Cancelar ${request.folio}`),
        },
      );
      break;

    case 'cancelado':
      acciones.push({
        label:    'Reabrir solicitud',
        icon:     RefreshIcon,
        onSelect: () => alert(`[Mock] Reabrir ${request.folio}`),
      });
      break;

    default:
      // completado — solo lectura
      break;
  }

  return acciones;
}

// ── Columnas del DataTable ────────────────────────────────────────────────────

const col = createColumnHelper<ExpensePurchaseRequest>();

/** Genera las columnas del DataTable para solicitudes de compras de gastos */
export function getExpenseRequestColumns(): ColumnDef<ExpensePurchaseRequest, unknown>[] {
  return [
    // ── Folio ─────────────────────────────────────────────────────────────
    col.accessor('folio', {
      header: 'Folio',
      size:   130,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-white">{r.folio}</span>
            <span className="text-[10px] text-slate-400">{r.area}</span>
          </div>
        );
      },
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

    // ── Tipo de gasto ─────────────────────────────────────────────────────
    col.accessor('tipo_gasto', {
      header: 'Tipo de Gasto',
      size:   155,
      cell: ({ getValue }) => (
        <TipoGastoBadge tipo={getValue() as TipoGasto} />
      ),
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

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
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

    // ── Descripción ───────────────────────────────────────────────────────
    col.accessor('descripcion', {
      header: 'Descripción',
      size:   210,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug">{r.descripcion}</span>
            <span className="text-[10px] text-slate-400">Sol. {r.solicitante}</span>
          </div>
        );
      },
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

    // ── Monto ─────────────────────────────────────────────────────────────
    col.accessor('monto', {
      header: 'Monto',
      size:   120,
      cell: ({ row }) => (
        <MontoCelda monto={row.original.monto} />
      ),
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

    // ── Progreso ──────────────────────────────────────────────────────────
    col.accessor('paso_actual', {
      header: 'Progreso',
      size:   175,
      cell: ({ row }) => (
        <MiniStepper pasoActual={row.original.paso_actual} estatus={row.original.estatus} />
      ),
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

    // ── Estatus ───────────────────────────────────────────────────────────
    col.accessor('estatus', {
      header: 'Estatus',
      size:   185,
      cell: ({ getValue }) => <EstatusBadge estatus={getValue() as ExpenseRequestStatus} />,
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

    // ── Fecha solicitud ───────────────────────────────────────────────────
    col.accessor('fecha_solicitud', {
      header: 'F. Solicitud',
      size:   110,
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {new Date(getValue() as string).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: '2-digit',
          })}
        </span>
      ),
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,

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
            <ExpensePurchaseRequestDialog
              request={row.original}
              open={open}
              onOpenChange={setOpen}
            />
          </>
        );
      },
    }) as ColumnDef<ExpensePurchaseRequest, unknown>,
  ];
}

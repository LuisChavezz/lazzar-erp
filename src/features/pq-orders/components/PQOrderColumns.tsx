"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type {
  PQOrder,
  PQOrderStatus,
  CategoriaInsumo,
} from "../interfaces/pq-order.interface";
import {
  PQ_ORDER_STEPS,
  PQ_ORDER_STATUS_LABELS,
  CATEGORIA_INSUMO_LABELS,
} from "../interfaces/pq-order.interface";
import { ActionMenu } from "@/src/components/ActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { PQOrderDialog } from "./PQOrderDialog";
import {
  HistoryIcon,
  ClipboardListIcon,
  TasksIcon,
  EmailIcon,
  CheckCircleIcon,
  PackageCheckIcon,
  RefreshIcon,
} from "@/src/components/Icons";

// ── Configuración visual por estatus ─────────────────────────────────────────

const ESTATUS_CFG: Record<PQOrderStatus, { cls: string; dot: string }> = {
  pedido_generado:       { cls: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',       dot: 'bg-slate-400' },
  cantidades_ingresadas: { cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',               dot: 'bg-sky-500' },
  verificando_surtido:   { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',           dot: 'bg-blue-500' },
  en_seguimiento:        { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',       dot: 'bg-amber-400' },
  confirmando_proveedor: { cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',   dot: 'bg-orange-400' },
  proveedor_procesando:  { cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',   dot: 'bg-indigo-500' },
  contactando_almacen:   { cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',   dot: 'bg-violet-500' },
  surtido:               { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500' },
  cancelado:             { cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',           dot: 'bg-zinc-400' },
};

// Colores por categoría de insumo (pill-badge)
const CATEGORIA_CLS: Record<CategoriaInsumo, string> = {
  telas_insumos:        'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  hilos_accesorios:     'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  empaque:              'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  bordados_serigrafia:  'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  etiquetado:           'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  otros_materiales:     'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
};

// ── Subcomponente: badge de estatus ───────────────────────────────────────────

const EstatusBadge = ({ estatus }: { estatus: PQOrderStatus }) => {
  const cfg = ESTATUS_CFG[estatus];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {PQ_ORDER_STATUS_LABELS[estatus]}
    </span>
  );
};

// ── Subcomponente: badge de categoría ─────────────────────────────────────────

const CategoriaBadge = ({ categoria }: { categoria: CategoriaInsumo }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${CATEGORIA_CLS[categoria]}`}>
    {CATEGORIA_INSUMO_LABELS[categoria]}
  </span>
);

// ── Subcomponente: mini stepper de 7 pasos ────────────────────────────────────

/**
 * Indicador de progreso visual sobre los 7 pasos canónicos del flujo PQ.
 * Muestra el número de paso activo; estados terminales usan colores propios.
 */
const MiniStepper = ({ pasoActual, estatus }: { pasoActual: number; estatus: PQOrderStatus }) => {
  const total       = PQ_ORDER_STEPS.length; // 7
  const esCancelado = estatus === 'cancelado';
  const esSurtido   = estatus === 'surtido';
  const filled      = Math.min(pasoActual, total);

  const esEspecial = esCancelado || esSurtido;
  const label      = esEspecial ? null : `Paso ${filled} / ${total}`;

  return (
    <div className="flex flex-col gap-1 min-w-28">
      {label && (
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{label}</span>
      )}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {PQ_ORDER_STEPS.map((_, i) => {
          const isDone    = i < filled;
          const isCurrent = i === filled - 1 && !esSurtido;

          let dotCls: string;
          if (esCancelado) {
            // Todos en zinc apagado
            dotCls = isDone
              ? 'bg-zinc-400 w-2.5 h-2.5 rounded-sm'
              : 'bg-zinc-200 dark:bg-zinc-700 w-2.5 h-2.5 rounded-sm';
          } else if (esSurtido) {
            // Todos en emerald — pedido completado
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

// ── Subcomponente: celda de cantidades con barra de progreso ──────────────────

/**
 * Muestra la relación surtida/solicitada con una barra de progreso.
 * La barra es emerald cuando está al 100%, sky en caso contrario.
 */
const CantidadCelda = ({
  solicitada,
  surtida,
  unidad,
}: {
  solicitada: number;
  surtida: number;
  unidad: string;
}) => {
  const percent = Math.min(100, solicitada > 0 ? Math.round((surtida / solicitada) * 100) : 0);
  return (
    <div className="flex flex-col gap-1 min-w-24">
      <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {surtida} / {solicitada}{' '}
        <span className="text-[10px] text-slate-400">{unidad}</span>
      </span>
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percent >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// ── Mapa de acciones por estatus ──────────────────────────────────────────────

/**
 * Retorna las acciones disponibles para un Pedido PQ según su estatus actual.
 * Las acciones de mutación muestran un alert en el entorno mock.
 */
function getAcciones(
  pedido: PQOrder,
  onVerHistorial: () => void,
): ActionMenuItem[] {
  const { estatus } = pedido;

  // Acción universal de solo lectura
  const verHistorial: ActionMenuItem = {
    label:    'Ver historial',
    icon:     HistoryIcon,
    onSelect: onVerHistorial,
  };

  const acciones: ActionMenuItem[] = [verHistorial];

  switch (estatus) {
    case 'pedido_generado':
      acciones.push({
        label:    'Ingresar cantidades',
        icon:     ClipboardListIcon,
        onSelect: () => alert(`[Mock] Ingresar cantidades para ${pedido.folio}`),
      });
      break;

    case 'cantidades_ingresadas':
      acciones.push({
        label:    'Verificar surtido',
        icon:     TasksIcon,
        onSelect: () => alert(`[Mock] Verificando surtido de ${pedido.folio}`),
      });
      break;

    case 'verificando_surtido':
      acciones.push(
        {
          label:    'Confirmar surtido completo',
          icon:     CheckCircleIcon,
          onSelect: () => alert(`[Mock] Surtido confirmado para ${pedido.folio}`),
        },
        {
          label:    'Pasar a seguimiento logístico',
          icon:     HistoryIcon,
          onSelect: () => alert(`[Mock] Enviando ${pedido.folio} a seguimiento logístico`),
        },
      );
      break;

    case 'en_seguimiento':
      acciones.push({
        label:    'Confirmar con proveedor',
        icon:     EmailIcon,
        onSelect: () => alert(`[Mock] Confirmando disponibilidad con proveedor para ${pedido.folio}`),
      });
      break;

    case 'confirmando_proveedor':
      acciones.push({
        label:    'Registrar confirmación del proveedor',
        icon:     CheckCircleIcon,
        onSelect: () => alert(`[Mock] Confirmación de proveedor registrada para ${pedido.folio}`),
      });
      break;

    case 'proveedor_procesando':
      acciones.push({
        label:    'Contactar almacén y compras',
        icon:     PackageCheckIcon,
        onSelect: () => alert(`[Mock] Contactando almacén y compras para ${pedido.folio}`),
      });
      break;

    case 'contactando_almacen':
      acciones.push({
        label:    'Registrar nuevo intento de surtido',
        icon:     RefreshIcon,
        onSelect: () => alert(`[Mock] Nuevo intento de surtido registrado para ${pedido.folio}`),
      });
      break;

    // Estados terminales: solo lectura
    case 'surtido':
    case 'cancelado':
    default:
      break;
  }

  return acciones;
}

// ── Columnas de la tabla ──────────────────────────────────────────────────────

const columnHelper = createColumnHelper<PQOrder>();

/**
 * Devuelve la definición de columnas para la tabla de Pedidos PQ.
 * Encapsula el estado del diálogo por fila en un componente interno.
 */
export function getPQOrderColumns(): ColumnDef<PQOrder, unknown>[] {
  return [
    // 1. Folio / OC
    columnHelper.accessor('folio', {
      id:     'folio',
      header: 'Folio / O.C.',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono whitespace-nowrap">
              {row.folio}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {row.oc_referencia}
            </span>
          </div>
        );
      },
    }) as ColumnDef<PQOrder, unknown>,

    // 2. Descripción / Categoría
    columnHelper.accessor('descripcion', {
      id:     'descripcion',
      header: 'Descripción / Categoría',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex flex-col gap-1 max-w-48">
            <span className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
              {row.descripcion}
            </span>
            <CategoriaBadge categoria={row.categoria} />
          </div>
        );
      },
    }) as ColumnDef<PQOrder, unknown>,

    // 3. Proveedor
    columnHelper.accessor('proveedor', {
      id:     'proveedor',
      header: 'Proveedor',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex flex-col gap-0.5 max-w-44">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-2">
              {row.proveedor}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{row.rfc_proveedor}</span>
          </div>
        );
      },
    }) as ColumnDef<PQOrder, unknown>,

    // 4. Cantidades con barra de progreso (exclusivo de esta feature)
    columnHelper.accessor('cantidad_solicitada', {
      id:     'cantidades',
      header: 'Cantidades',
      cell: (info) => {
        const row = info.row.original;
        return (
          <CantidadCelda
            solicitada={row.cantidad_solicitada}
            surtida={row.cantidad_surtida}
            unidad={row.unidad}
          />
        );
      },
    }) as ColumnDef<PQOrder, unknown>,

    // 5. Monto estimado
    columnHelper.accessor('monto_estimado', {
      id:     'monto',
      header: 'Monto Estimado',
      cell: (info) => <MontoCelda monto={info.getValue() as number} />,
    }) as ColumnDef<PQOrder, unknown>,

    // 6. Progreso (mini stepper 7 pasos)
    columnHelper.accessor('paso_actual', {
      id:     'progreso',
      header: 'Progreso',
      cell: (info) => {
        const row = info.row.original;
        return (
          <MiniStepper pasoActual={row.paso_actual} estatus={row.estatus} />
        );
      },
    }) as ColumnDef<PQOrder, unknown>,

    // 7. Estatus
    columnHelper.accessor('estatus', {
      id:     'estatus',
      header: 'Estatus',
      cell: (info) => <EstatusBadge estatus={info.getValue() as PQOrderStatus} />,
    }) as ColumnDef<PQOrder, unknown>,

    // 8. Fecha de solicitud
    columnHelper.accessor('fecha_solicitud', {
      id:     'fecha_solicitud',
      header: 'F. Solicitud',
      cell: (info) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {new Date(info.getValue() as string).toLocaleDateString('es-MX', {
            day:   '2-digit',
            month: 'short',
            year:  'numeric',
          })}
        </span>
      ),
    }) as ColumnDef<PQOrder, unknown>,

    // 9. Acciones (ActionMenu + Dialog)
    columnHelper.display({
      id:     'acciones',
      header: 'Acciones',
      cell: (info) => {
        const row = info.row.original;
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [open, setOpen] = useState(false);
        return (
          <>
            <ActionMenu items={getAcciones(row, () => setOpen(true))} />
            <PQOrderDialog pedido={row} open={open} onOpenChange={setOpen} />
          </>
        );
      },
    }) as ColumnDef<PQOrder, unknown>,
  ];
}

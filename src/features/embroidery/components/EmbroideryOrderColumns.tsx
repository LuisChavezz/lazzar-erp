"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { EmbroideryOrder, EstatusHojaBordado, TipoSurtido, TecnicaImpresion } from "../interfaces/embroidery-order.interface";
import {
  ViewIcon,
  EditIcon,
  DeleteIcon,
  ClipboardListIcon,
  PrinterIcon,
  HistoryIcon,
  FileCode2Icon,
  CheckCircleIcon,
} from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { EmbroideryOrderTimelineDialog } from "./EmbroideryOrderTimelineDialog";
import { EmbroideryPonchadoDialog } from "./EmbroideryPonchadoDialog";
import { EmbroideryArtValidationDialog } from "./EmbroideryArtValidationDialog";

// Configuración visual de cada tipo de surtido
const TIPO_SURTIDO_CFG: Record<
  TipoSurtido,
  { label: string; cls: string; dot: string }
> = {
  completa: {
    label: 'Completo',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  parcial: {
    label: 'Parcial',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
};

// Configuración visual de cada técnica de impresión
const TECNICA_CFG: Record<
  TecnicaImpresion,
  { label: string; cls: string; dot: string }
> = {
  dtf: {
    label: 'DTF',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  serigrafia: {
    label: 'Serigrafía',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  vinil: {
    label: 'Vinil',
    cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  sublimado: {
    label: 'Sublimado',
    cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
    dot: 'bg-cyan-500',
  },
};

// Configuración visual de cada estatus de hoja de bordado
const ESTATUS_HOJA_CFG: Record<
  EstatusHojaBordado,
  { label: string; cls: string; dot: string }
> = {
  sin_liberar: {
    label: 'Sin Liberar',
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
  liberada: {
    label: 'Liberada',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  en_proceso: {
    label: 'En Proceso',
    cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    dot: 'bg-orange-400',
  },
  terminada: {
    label: 'Terminada',
    cls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
};

// Badge para el tipo de surtido
const TipoSurtidoBadge = ({ tipo }: { tipo: TipoSurtido }) => {
  const cfg = TIPO_SURTIDO_CFG[tipo];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

// Badge para la técnica de impresión de la orden
const TecnicaImpresionBadge = ({ tecnica }: { tecnica: TecnicaImpresion | null }) => {
  if (!tecnica) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
  const cfg = TECNICA_CFG[tecnica];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

// Badge para el estatus de la hoja de bordado (elemento fundamental del proceso)
const EstatusHojaBadge = ({ estatus }: { estatus: EstatusHojaBordado }) => {
  const cfg = ESTATUS_HOJA_CFG[estatus];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

// Célula de acciones con menú contextual, timeline, ponchados y validación de arte
const ActionsCell = ({ order }: { order: EmbroideryOrder }) => {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isPonchadoOpen, setIsPonchadoOpen] = useState(false);
  const [isArtValidationOpen, setIsArtValidationOpen] = useState(false);
  const puedeEditar = order.estatus_hoja !== 'terminada';
  const tienePonchados = (order.ponchados?.length ?? 0) > 0;
  // Solo puede validarse el arte antes de iniciar el proceso productivo
  const puedeValidarArte =
    order.estatus_hoja === 'sin_liberar' || order.estatus_hoja === 'liberada';

  const menuItems: ActionMenuItem[] = [
    {
      label: 'Ver Detalles',
      icon: ViewIcon,
      onSelect: () => {},
    },
    {
      label: 'Seguimiento de Orden',
      icon: HistoryIcon,
      onSelect: () => setIsTimelineOpen(true),
    },
    {
      label: 'Validar Arte',
      icon: CheckCircleIcon,
      onSelect: () => setIsArtValidationOpen(true),
      visible: puedeValidarArte,
    },
    {
      label: 'Ponchados',
      icon: FileCode2Icon,
      onSelect: () => setIsPonchadoOpen(true),
      visible: tienePonchados,
    },
    {
      label: 'Editar Orden',
      icon: EditIcon,
      onSelect: () => {},
      visible: puedeEditar,
    },
    {
      label: 'Imprimir Hoja de Bordado',
      icon: PrinterIcon,
      onSelect: () => {},
    },
    {
      label: 'Ver Artículos',
      icon: ClipboardListIcon,
      onSelect: () => {},
    },
    {
      label: 'Cancelar Orden',
      icon: DeleteIcon,
      onSelect: () => {},
      visible: puedeEditar,
    },
  ];

  return (
    <>
      <div className="flex justify-center">
        <ActionMenu items={menuItems} />
      </div>
      <EmbroideryOrderTimelineDialog
        order={order}
        open={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
      />
      <EmbroideryPonchadoDialog
        order={order}
        open={isPonchadoOpen}
        onOpenChange={setIsPonchadoOpen}
      />
      <EmbroideryArtValidationDialog
        order={order}
        open={isArtValidationOpen}
        onOpenChange={setIsArtValidationOpen}
      />
    </>
  );
};

const columnHelper = createColumnHelper<EmbroideryOrder>();

// La función no tiene anotación de tipo en el retorno para evitar el error de inferencia
// con ColumnDef<EmbroideryOrder, unknown> vs AccessorKeyColumnDef<EmbroideryOrder, string>
export const getEmbroideryColumns = () => {
  const columns = [
    columnHelper.accessor('numero_orden', {
      header: 'Orden',
      cell: (info) => (
        <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold tracking-wide">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('pedido', {
      header: 'Pedido',
      cell: (info) => (
        <span className="font-mono text-sky-700 dark:text-sky-400 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('cliente', {
      header: 'Cliente',
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-sm leading-tight">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('tipo_surtido', {
      header: 'Surtido',
      cell: (info) => <TipoSurtidoBadge tipo={info.getValue()} />,
    }),
    columnHelper.accessor('tecnica_impresion', {
      header: 'Técnica',
      cell: (info) => <TecnicaImpresionBadge tecnica={info.getValue()} />,
    }),
    columnHelper.accessor('total_prendas_recibidas', {
      header: 'Prendas',
      cell: (info) => (
        <span className="font-semibold tabular-nums text-slate-800 dark:text-white">
          {info.getValue().toLocaleString('es-MX')}
        </span>
      ),
    }),
    columnHelper.accessor('estatus_hoja', {
      header: 'Estatus',
      cell: (info) => <EstatusHojaBadge estatus={info.getValue()} />,
    }),
    columnHelper.accessor('fecha_recibo', {
      header: 'Fecha Recibo',
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums text-sm">
          {info.getValue()
            ? new Date(info.getValue() + 'T00:00:00').toLocaleDateString('es-MX')
            : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('orden_trabajo_bordado', {
      header: 'OTB',
      cell: (info) => {
        const val = info.getValue();
        return val ? (
          <span className="font-mono text-slate-700 dark:text-slate-200 font-medium">{val}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">—</span>
        );
      },
    }),
    columnHelper.accessor('fin_bordado_estimado', {
      header: 'Fin Bordado',
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className="text-slate-600 dark:text-slate-300 tabular-nums text-sm">
            {val ? new Date(val + 'T00:00:00').toLocaleDateString('es-MX') : '—'}
          </span>
        );
      },
    }),
    columnHelper.accessor('numero_bordadora', {
      header: 'Bordadora',
      cell: (info) => {
        const val = info.getValue();
        return val ? (
          <span className="text-slate-700 dark:text-slate-200 text-sm font-medium">{val}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600 text-sm">Sin asignar</span>
        );
      },
    }),
    columnHelper.accessor('rack_slot', {
      header: 'Rack',
      cell: (info) => {
        const slot = info.getValue();
        if (!slot) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
        const nivCls =
          slot.nivel === 'superior' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
          slot.nivel === 'medio'    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                      'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
        const nivLabel = slot.nivel === 'superior' ? 'Sup' : slot.nivel === 'medio' ? 'Med' : 'Inf';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${nivCls}`}>
            {nivLabel}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'acciones',
      header: 'Acciones',
      cell: (info) => <ActionsCell order={info.row.original} />,
    }),
  ];

  return columns as ColumnDef<EmbroideryOrder, unknown>[];
};

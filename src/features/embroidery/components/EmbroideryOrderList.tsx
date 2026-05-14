"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { getEmbroideryColumns } from "@/src/features/embroidery/components/EmbroideryOrderColumns";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { LayersIcon } from "@/src/components/Icons";
import { EmbroideryOrderMockForm } from "@/src/features/embroidery/components/EmbroideryOrderMockForm";
import { EmbroideryRackView } from "@/src/features/embroidery/components/EmbroideryRackView";
import { MOCK_EMBROIDERY_ORDERS } from "../mocks/embroidery-orders.mock";
import type { EstatusHojaBordado } from "../interfaces/embroidery-order.interface";

// Pestañas de filtro por estatus — mismo patrón que Mesa de Control
const FILTROS_ESTATUS: { value: EstatusHojaBordado | 'todas'; label: string }[] = [
  { value: 'todas',       label: 'Todas' },
  { value: 'sin_liberar', label: 'Sin Liberar' },
  { value: 'liberada',    label: 'Liberada' },
  { value: 'en_proceso',  label: 'En Proceso' },
  { value: 'terminada',   label: 'Terminada' },
];

export function EmbroideryOrderList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRackOpen, setIsRackOpen] = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState<EstatusHojaBordado | 'todas'>('todas');

  const columns = useMemo(() => getEmbroideryColumns(), []);

  // Órdenes filtradas por estatus seleccionado
  const ordenesFiltradas = useMemo(() => {
    if (filtroEstatus === 'todas') return MOCK_EMBROIDERY_ORDERS;
    return MOCK_EMBROIDERY_ORDERS.filter(o => o.estatus_hoja === filtroEstatus);
  }, [filtroEstatus]);

  return (
    <div className="space-y-3">

      {/* ── Barra de filtros por estatus ──────────────────────────────── */}
      <div
        className="flex items-center gap-1 flex-wrap"
        role="group"
        aria-label="Filtrar por estatus de bordado"
      >
        {FILTROS_ESTATUS.map(f => {
          const count = f.value !== 'todas'
            ? MOCK_EMBROIDERY_ORDERS.filter(o => o.estatus_hoja === f.value).length
            : MOCK_EMBROIDERY_ORDERS.length;
          const isActive = filtroEstatus === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltroEstatus(f.value)}
              aria-pressed={isActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Tabla principal ───────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={ordenesFiltradas}
        title="Órdenes de Bordado"
        searchPlaceholder="Buscar orden, pedido o cliente..."
        actionButton={
          <div className="flex items-center gap-2">

            {/* Visualización de Rack */}
            <MainDialog
              title={
                <DialogHeader
                  title="Acomodo en Rack"
                  subtitle="Selección de pedidos por nivel"
                  statusColor="indigo"
                />
              }
              open={isRackOpen}
              onOpenChange={setIsRackOpen}
              maxWidth="860px"
              showCloseButton={false}
              trigger={
                <Button
                  variant="secondary"
                  rounded="full"
                  onClick={() => setIsRackOpen(true)}
                >
                  <LayersIcon className="w-4 h-4 mr-1.5" />
                  Ver Rack
                </Button>
              }
            >
              <EmbroideryRackView orders={MOCK_EMBROIDERY_ORDERS} />
            </MainDialog>

            {/* Nueva Orden */}
            <MainDialog
              title={
                <DialogHeader
                  title="Nueva Orden de Bordado"
                  subtitle="Registro Nuevo"
                  statusColor="sky"
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth="720px"
              showCloseButton={false}
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={() => setIsFormOpen(true)}
                >
                  + Nueva Orden
                </Button>
              }
            >
              <EmbroideryOrderMockForm onSuccess={() => setIsFormOpen(false)} />
            </MainDialog>
          </div>
        }
      />
    </div>
  );
}

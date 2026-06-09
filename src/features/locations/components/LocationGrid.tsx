"use client";

import { LayersIcon, RulerIcon } from "@/src/components/Icons";
import type {
  LocationZone,
  LocationAisle,
  LocationSlot,
} from "../types/location-dashboard.types";

// ─── Constantes de color por estado ───────────────────────────────────────────

const STATUS_STYLES: Record<LocationSlot["estatus"], string> = {
  disponible:
    "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  critico:
    "bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400",
  lleno:
    "bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-400",
};

const STATUS_DOT: Record<LocationSlot["estatus"], string> = {
  disponible: "bg-emerald-500",
  critico: "bg-amber-500",
  lleno: "bg-rose-500",
};

const STATUS_LABEL: Record<LocationSlot["estatus"], string> = {
  disponible: "Disponible",
  critico: "Crítico",
  lleno: "Lleno",
};

const ZONE_ICON: Record<"rollos" | "avios", React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  rollos: LayersIcon,
  avios: RulerIcon,
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

// Pequeña etiqueta de leyenda para indicar el estado de una ubicación
function LegendBadge({ status }: { status: LocationSlot["estatus"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// Bloque individual de ubicación
function SlotBlock({
  slot,
  isSelected,
  onClick,
}: {
  slot: LocationSlot;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1
        w-full min-h-15 rounded-lg border text-xs font-medium
        transition-all duration-200 cursor-pointer
        hover:scale-105 hover:shadow-md
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
        ${STATUS_STYLES[slot.estatus]}
        ${isSelected ? "ring-2 ring-sky-500 scale-105 shadow-lg" : ""}
      `}
      title={`${slot.nombre} — ${slot.ocupacionPorcentaje}% ocupado`}
    >
      <span className="font-semibold text-[11px] leading-tight text-center px-1">
        {slot.nombre}
      </span>
      <span className="text-[10px] opacity-70">
        {slot.ocupacionPorcentaje}%
      </span>
    </button>
  );
}

// Fila de pasillo/bloque que contiene varias ubicaciones
function AisleRow({
  aisle,
  selectedSlotId,
  onSelectSlot,
}: {
  aisle: LocationAisle;
  selectedSlotId: string | null;
  onSelectSlot: (slot: LocationSlot) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {aisle.nombre}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {aisle.ocupacionPorcentaje}% ocupado
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {aisle.ubicaciones.map((slot) => (
          <SlotBlock
            key={slot.id}
            slot={slot}
            isSelected={selectedSlotId === slot.id}
            onClick={() => onSelectSlot(slot)}
          />
        ))}
      </div>
    </div>
  );
}

// Panel que representa una zona completa, con su ocupación general y sus pasillos
function ZonePanel({
  zone,
  selectedSlotId,
  onSelectSlot,
}: {
  zone: LocationZone;
  selectedSlotId: string | null;
  onSelectSlot: (slot: LocationSlot) => void;
}) {
  const Icon = ZONE_ICON[zone.tipo];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {zone.nombre}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {zone.descripcion}
          </p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
            {zone.ocupacionPorcentaje}%
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            ocupación
          </span>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4">
        {(["disponible", "critico", "lleno"] as const).map((status) => (
          <LegendBadge key={status} status={status} />
        ))}
      </div>

      {/* Pasillos / Bloques */}
      <div className="space-y-6">
        {zone.pasillos.map((aisle) => (
          <AisleRow
            key={aisle.id}
            aisle={aisle}
            selectedSlotId={selectedSlotId}
            onSelectSlot={onSelectSlot}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface LocationGridProps {
  zonas: LocationZone[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: LocationSlot) => void;
}

export function LocationGrid({
  zonas,
  selectedSlotId,
  onSelectSlot,
}: LocationGridProps) {
  return (
    <div className="space-y-8">
      {zonas.map((zone) => (
        <div
          key={zone.id}
          className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm"
        >
          <ZonePanel
            zone={zone}
            selectedSlotId={selectedSlotId}
            onSelectSlot={onSelectSlot}
          />
        </div>
      ))}
    </div>
  );
}

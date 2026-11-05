"use client";

import { useState, useMemo, useCallback } from "react";
import { LocationStats } from "./LocationStats";
import { LocationGrid } from "./LocationGrid";
import { LocationDetailPanel } from "./LocationDetailPanel";
import type { LocationSlot, LocationDashboardData } from "../types/location-dashboard.types";

interface LocationDashboardProps {
  /** Datos mock generados en el servidor por el page.tsx (EC-773). */
  data: LocationDashboardData;
}

/**
 * Componente orquestador del panel de ubicaciones.
 *
 * Responsabilidades:
 * - Mantener el estado de la ubicación seleccionada.
 * - Componer las tres secciones: KPIs, grid de zonas, panel de detalle.
 *
 * Los datos llegan por props; en el futuro se reemplazan por un hook de datos
 * real (ej. useLocationsDashboard).
 */
export function LocationDashboard({ data: dashboardData }: LocationDashboardProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Obtener el slot seleccionado a partir del ID (para pasar al panel de detalle)
  const selectedSlot: LocationSlot | null = useMemo(() => {
    if (!selectedSlotId) return null;
    for (const zone of dashboardData.zonas) {
      for (const aisle of zone.pasillos) {
        const found = aisle.ubicaciones.find((s) => s.id === selectedSlotId);
        if (found) return found;
      }
    }
    return null;
  }, [selectedSlotId, dashboardData]);

  // Handler para seleccionar/deseleccionar una ubicación
  const handleSelectSlot = useCallback((slot: LocationSlot) => {
    setSelectedSlotId((prev) => (prev === slot.id ? null : slot.id));
  }, []);

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <LocationStats stats={dashboardData.stats} />

      {/* Grid + Panel de detalle */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Zonas y pasillos */}
        <div className="xl:col-span-2">
          <LocationGrid
            zonas={dashboardData.zonas}
            selectedSlotId={selectedSlotId}
            onSelectSlot={handleSelectSlot}
          />
        </div>

        {/* Panel lateral */}
        <div className="xl:col-span-1 xl:sticky xl:top-20">
          <LocationDetailPanel slot={selectedSlot} />
        </div>
      </div>
    </div>
  );
}

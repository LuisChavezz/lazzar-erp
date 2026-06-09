// ─── Tipos para el panel de ubicaciones (dashboard visual) ────────────────────
// Separados del modelo CRUD (location.interface.ts) ya que representan
// una vista enriquecida con datos de ocupación, materiales y movimientos.

/** Estado de ocupación de una ubicación individual */
export type SlotStatus = "disponible" | "critico" | "lleno";

/** Tipo de material almacenado en una ubicación */
export type MaterialType = "rollos" | "avios";

/** Un SKU almacenado dentro de una ubicación */
export interface StoredSku {
  sku: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  color?: string;
}

/** Una ubicación individual (slot/rack dentro de un pasillo o bloque) */
export interface LocationSlot {
  id: string;
  nombre: string;
  estatus: SlotStatus;
  ocupacionPorcentaje: number;
  tipoMaterial?: string;
  skusCount: number;
  items: StoredSku[];
  ultimoMovimiento: string;
}

/** Un pasillo o bloque que contiene ubicaciones */
export interface LocationAisle {
  id: string;
  nombre: string;
  zonaId: string;
  ubicaciones: LocationSlot[];
  ocupacionPorcentaje: number;
}

/** Una zona del almacén (ej. Zona A: Racks, Zona B: Avíos) */
export interface LocationZone {
  id: string;
  nombre: string;
  tipo: MaterialType;
  descripcion: string;
  pasillos: LocationAisle[];
  ocupacionPorcentaje: number;
}

/** KPIs agregados del panel de ubicaciones */
export interface LocationDashboardStats {
  capacidadTotalPorcentaje: number;
  ocupacionRollosPorcentaje: number;
  ocupacionAviosPorcentaje: number;
  totalUbicaciones: number;
  ubicacionesDisponibles: number;
  ubicacionesCriticas: number;
  ubicacionesLlenas: number;
}

/** Datos completos del dashboard de ubicaciones */
export interface LocationDashboardData {
  stats: LocationDashboardStats;
  zonas: LocationZone[];
}

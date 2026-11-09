import type { PurchaseNeed } from "@/src/features/pre-orders/interfaces/pre-order.interface";

/**
 * Una fila de `/compras/necesidades/agrupadas/` (material + sucursal, solo
 * pendientes, de la fecha más urgente a la menos urgente), con nombres de
 * campo del lado del front. `proveedor_habitual` y `ultimo_costo` llegan en
 * `null` si el material nunca se ha comprado.
 */
export interface PurchaseNeedGroup {
  /** Llave estable de la fila: material + sucursal. */
  key: string;
  materialId: number;
  sucursal: number | null;
  codigo: string | null;
  nombre: string;
  unidad: string | null;
  total: number;
  pedidos: number;
  fechaMasUrgente: string | null;
  existencia: number | null;
  enTransito: number | null;
  proveedorHabitualId: number | null;
  proveedorHabitualNombre: string | null;
  ultimoCosto: number | null;
  necesidades: PurchaseNeed[];
}

export interface RawNeedGroup {
  material: number;
  material_nombre: string | null;
  material_codigo: string | null;
  unidad: string | null;
  sucursal: number | null;
  total_requerido: number;
  pedidos: number;
  fecha_mas_urgente: string | null;
  existencia: number | null;
  en_transito: number | null;
  proveedor_habitual: { id: number; nombre: string } | null;
  ultimo_costo: number | null;
  necesidades: PurchaseNeed[];
}

export function normalizeNeedGroup(raw: RawNeedGroup): PurchaseNeedGroup {
  return {
    key: `${raw.material}-${raw.sucursal ?? 0}`,
    materialId: raw.material,
    sucursal: raw.sucursal,
    codigo: raw.material_codigo,
    nombre: raw.material_nombre || "Material sin nombre",
    unidad: raw.unidad,
    total: raw.total_requerido,
    pedidos: raw.pedidos,
    fechaMasUrgente: raw.fecha_mas_urgente,
    existencia: raw.existencia,
    enTransito: raw.en_transito,
    proveedorHabitualId: raw.proveedor_habitual?.id ?? null,
    proveedorHabitualNombre: raw.proveedor_habitual?.nombre ?? null,
    ultimoCosto: raw.ultimo_costo,
    // En `agrupadas/` todas son pendientes y llegan sin `estatus`.
    necesidades: raw.necesidades.map((n) => ({ ...n, estatus: n.estatus ?? "pendiente" })),
  };
}

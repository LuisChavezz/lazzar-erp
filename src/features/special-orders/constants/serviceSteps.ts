import type { TrackerStep, TrackerState } from "@/src/components/StepTracker";

export type ServiceKey = "bordado" | "reflejante" | "corte_manga";

interface ServiceConfig {
  label: string;
  /** Detalle de la orden. */
  href: (id: number) => string;
  steps: readonly TrackerStep[];
  /** Estatus del backend → índice del paso. El último paso, al llegar, cuenta como terminado. */
  stepByStatus: Record<number, number>;
  /** Estatus que no son pasos. */
  halted: number;
  cancelled: readonly number[];
}

/**
 * Pasos de cada servicio según el backend (`ordenes_servicio`). "Detenido" y
 * "Cancelado" no son pasos: son estados aparte.
 */
export const SERVICE_STEPS: Record<ServiceKey, ServiceConfig> = {
  bordado: {
    label: "Bordado",
    href: (id) => `/manufacturing/embroidery/${id}`,
    steps: [
      { label: "Sin trabajar" },
      { label: "Programado" },
      { label: "Ponchado" },
      { label: "Arreglo" },
      { label: "Bordando" },
      { label: "Finalizado" },
    ],
    stepByStatus: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 7: 6 },
    halted: 6,
    cancelled: [8],
  },
  reflejante: {
    label: "Reflejante",
    href: (id) => `/manufacturing/reflective-orders/${id}`,
    steps: [
      { label: "Pendiente" },
      { label: "Preparación" },
      { label: "Aplicando" },
      { label: "Revisión" },
      { label: "Completado" },
    ],
    stepByStatus: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 },
    halted: 6,
    cancelled: [7],
  },
  corte_manga: {
    label: "Corte de manga",
    href: (id) => `/manufacturing/corte-manga/${id}`,
    steps: [
      { label: "Pendiente" },
      { label: "Preparación" },
      { label: "Cortando" },
      { label: "Revisión" },
      { label: "Completado" },
    ],
    stepByStatus: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 },
    halted: 6,
    cancelled: [7],
  },
};

export const SERVICE_KEYS: readonly ServiceKey[] = ["bordado", "reflejante", "corte_manga"];

/**
 * Paso actual y estado. Un detenido marca en ámbar el paso en que se quedó
 * (`estatus_previo`). Los detenidos antes de que el backend lo guardara no lo
 * traen: entonces van todos los segmentos en ámbar.
 */
export function serviceProgress(
  key: ServiceKey,
  estatus: number,
  estatusPrevio?: number | null,
): { current: number; state: TrackerState } {
  const cfg = SERVICE_STEPS[key];
  if (cfg.cancelled.includes(estatus)) return { current: -1, state: "off" };
  if (estatus === cfg.halted) {
    const prev = estatusPrevio != null ? cfg.stepByStatus[estatusPrevio] : undefined;
    return { current: prev ?? -1, state: "halted" };
  }
  return { current: cfg.stepByStatus[estatus] ?? 0, state: "normal" };
}

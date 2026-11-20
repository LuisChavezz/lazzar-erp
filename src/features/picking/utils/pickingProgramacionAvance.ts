import type { PickingOnboardingProgramacion } from "../interfaces/picking-onboarding.interface";

/** Avance de UN destino programado (sumando sus parcialidades). */
export interface ProgramacionAvance {
  destino: string;
  /** Piezas programadas al destino (todas sus parcialidades). */
  cantidad: number;
  /** Lo ya asignado en surtidos no cancelados que abonan a este destino. */
  surtido: number;
  /** Lo que falta (`cantidad - surtido`, mínimo 0). */
  pendiente: number;
  /** Lo surtido de más sobre lo programado (0 si no se pasó). */
  excedente: number;
  /** Primer almacén sugerido de sus parcialidades (o `null`). */
  almacen_sugerido: PickingOnboardingProgramacion["almacen_sugerido"];
}

/**
 * Agrupa las parcialidades por destino, en el orden en que Mesa de Control las
 * programó. El backend (nucleo-erp#1279) reparte lo surtido de la primera a la
 * última parcialidad de cada destino, y lo que se pasa queda en la última; al
 * sumar por destino el excedente sale de `surtido - cantidad`.
 *
 * Un backend anterior a #1279 no manda `surtido`/`pendiente`: se trata como
 * nada surtido (el comportamiento previo, "Programado: N pzs").
 */
export function avancePorDestino(
  programaciones: readonly PickingOnboardingProgramacion[],
): ProgramacionAvance[] {
  const porDestino = new Map<string, ProgramacionAvance>();
  for (const p of programaciones) {
    const cantidad = Math.max(0, Number(p.cantidad) || 0);
    const surtido = Math.max(0, Number(p.surtido) || 0);
    const actual = porDestino.get(p.destino) ?? {
      destino: p.destino,
      cantidad: 0,
      surtido: 0,
      pendiente: 0,
      excedente: 0,
      almacen_sugerido: null,
    };
    actual.cantidad += cantidad;
    actual.surtido += surtido;
    actual.almacen_sugerido ??= p.almacen_sugerido;
    porDestino.set(p.destino, actual);
  }
  return [...porDestino.values()].map((a) => ({
    ...a,
    pendiente: Math.max(0, a.cantidad - a.surtido),
    excedente: Math.max(0, a.surtido - a.cantidad),
  }));
}

/** Destino a preseleccionar: el primero con algo pendiente; si todo está cubierto, ninguno. */
export function destinoSugerido(avance: readonly ProgramacionAvance[]): string {
  return avance.find((a) => a.pendiente > 0)?.destino ?? "";
}

/**
 * Almacén al que va cada destino cuando el backend no sugiere uno (hoy solo
 * sugiere Bordado y Apartado). Se busca por nombre entre las opciones del pedido.
 */
const ALMACEN_POR_DESTINO: Record<string, string> = {
  EMBARQUE: "APARTADOS",
  APARTADO: "APARTADOS",
  BORDADO: "BORDADOS",
  CORTE_MANGA: "CORTE DE MANGA",
  REFLEJANTE: "REFLEJANTES",
};

/**
 * Completa `almacen_sugerido` de cada destino con un almacén que SÍ esté entre
 * las opciones: el del backend si es opción; si no, el del mapa por nombre.
 */
export function conAlmacenPorDestino(
  avance: readonly ProgramacionAvance[],
  opciones: readonly { id: number; nombre: string }[],
): ProgramacionAvance[] {
  return avance.map((a) => {
    if (a.almacen_sugerido && opciones.some((o) => o.id === a.almacen_sugerido?.id)) return a;
    const nombre = ALMACEN_POR_DESTINO[a.destino.toUpperCase()];
    const opcion = nombre
      ? opciones.find((o) => o.nombre.trim().toUpperCase() === nombre)
      : undefined;
    return { ...a, almacen_sugerido: opcion ? { id: opcion.id, nombre: opcion.nombre } : null };
  });
}

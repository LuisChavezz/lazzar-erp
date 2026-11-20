import type { PedidoProgramacionDestino } from "../constants/pedidoProgramacion";

/**
 * Orden en que una talla con VARIOS servicios se asigna: la programación
 * reparte piezas (la suma no puede pasar del total), así que cada talla cuenta
 * una sola vez, en su primer proceso.
 */
const SERVICIO_DESTINOS: readonly PedidoProgramacionDestino[] = ["BORDADO", "REFLEJANTE", "CORTE_MANGA"];

export interface ProgramacionSugerida {
  destino: PedidoProgramacionDestino;
  cantidad: number;
  /** Tallas que llevan además otro servicio (cuentan solo aquí). */
  conVariosServicios: number;
}

/**
 * Sugerencia de programación a partir de los servicios de cada talla
 * (`GET /ventas/pedidos/{id}/programar/` → `renglones[].servicios`):
 * - talla con servicio → su primer servicio aplicable (Bordado, Reflejante, Corte de manga);
 * - talla sin servicio → Embarque.
 * Solo propone destinos de `destinosAplicables`. Es una SUGERENCIA: la decisión
 * final es de Mesa de Control, que puede editarla antes de guardar.
 */
export function sugerirProgramacion(
  renglones: readonly { cantidad: number; servicios: readonly string[] }[],
  destinosAplicables: readonly PedidoProgramacionDestino[],
): ProgramacionSugerida[] {
  const totales = new Map<PedidoProgramacionDestino, ProgramacionSugerida>();
  for (const renglon of renglones) {
    const cantidad = Math.floor(Number(renglon.cantidad) || 0);
    if (cantidad <= 0) continue;
    const servicios = SERVICIO_DESTINOS.filter(
      (d) => renglon.servicios.includes(d) && destinosAplicables.includes(d),
    );
    const destino: PedidoProgramacionDestino | null =
      servicios[0] ?? (destinosAplicables.includes("EMBARQUE") ? "EMBARQUE" : null);
    if (!destino) continue;
    const actual = totales.get(destino) ?? { destino, cantidad: 0, conVariosServicios: 0 };
    actual.cantidad += cantidad;
    if (servicios.length > 1) actual.conVariosServicios += cantidad;
    totales.set(destino, actual);
  }
  return [...SERVICIO_DESTINOS, "EMBARQUE" as const]
    .map((d) => totales.get(d))
    .filter((s): s is ProgramacionSugerida => !!s);
}

export interface FaltanteSugerido {
  destino: PedidoProgramacionDestino;
  /** Lo que sugiere el sistema para el destino. */
  sugerido: number;
  /** Lo que ya está capturado para el destino (todas sus parcialidades). */
  programado: number;
  /** Lo que falta para llegar a la sugerencia (0 si ya se cubrió o se pasó). */
  faltan: number;
}

/**
 * Lo programado contra lo sugerido, por destino. "Usar sugerencia" NO borra lo
 * ya programado (parcialidades que quizá ya tienen orden de trabajo): agrega
 * una parcialidad NUEVA por destino con solo lo que falta. Ej.: Bordado 20 ya
 * programado y 240 sugerido → nueva parcialidad de Bordado por 220.
 */
export function faltantesDeSugerencia(
  actual: readonly { destino: string; cantidad: string }[],
  sugerida: readonly ProgramacionSugerida[],
): FaltanteSugerido[] {
  const programadoPor = new Map<string, number>();
  for (const r of actual) {
    programadoPor.set(r.destino, (programadoPor.get(r.destino) ?? 0) + (Number(r.cantidad) || 0));
  }
  return sugerida.map((s) => {
    const programado = programadoPor.get(s.destino) ?? 0;
    return { destino: s.destino, sugerido: s.cantidad, programado, faltan: Math.max(0, s.cantidad - programado) };
  });
}

/** ¿La programación capturada ya es la sugerida (mismos destinos y piezas, sin importar el orden)? */
export function esProgramacionSugerida(
  actual: readonly { destino: string; cantidad: string }[],
  sugerida: readonly ProgramacionSugerida[],
): boolean {
  const sumar = (rows: readonly { destino: string; cantidad: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.destino, (m.get(r.destino) ?? 0) + r.cantidad);
    return m;
  };
  const a = sumar(actual.map((r) => ({ destino: r.destino, cantidad: Number(r.cantidad) || 0 })));
  const b = sumar(sugerida);
  return a.size === b.size && [...b].every(([d, c]) => a.get(d) === c);
}

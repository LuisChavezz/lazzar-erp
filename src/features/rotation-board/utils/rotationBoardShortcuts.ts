import type { RotationEstado } from "../interfaces/rotation-board.interface";

/** Atajo de las tarjetas: qué filtro (y orden) aplica cada una. */
export type RotationBoardShortcut =
  | Extract<RotationEstado, "RESURTIR" | "SOBREINVENTARIO" | "LENTO">
  | "CANDIDATOS";

/** Orden que pone el atajo "Resurtir": lo más urgente primero. */
export const RESURTIR_ORDERING = "-resurtido_sugerido";

/** Filtros del tablero que definen las tarjetas. */
export interface RotationShortcutFilters {
  estado?: RotationEstado;
  solo_candidatos?: true;
}

/**
 * ¿Está activa la tarjeta? Lo está siempre que SU filtro esté puesto, haya o
 * no otros: las de estado con `estado` igual a la suya, la de candidatos con
 * `solo_candidatos`. Así "Candidatos" + un estado del encabezado se ven las dos
 * activas y ningún filtro acota la tabla sin una tarjeta que lo muestre.
 */
export const isRotationShortcutActive = (
  filters: RotationShortcutFilters,
  shortcut: RotationBoardShortcut,
): boolean =>
  shortcut === "CANDIDATOS" ? filters.solo_candidatos === true : filters.estado === shortcut;

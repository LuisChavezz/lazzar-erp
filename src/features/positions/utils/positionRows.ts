import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";
import type { Position } from "../interfaces/position.interface";
import type { PositionRow } from "../components/PositionColumns";

/**
 * Filas de la tabla: cada puesto con el nombre de su área resuelto. Sin área
 * asignada queda `null`; un FK que no está en el catálogo (o cuyo catálogo no
 * ha llegado) se rotula `Área #N`, una sola vez: la celda y el filtro de
 * encabezado leen ese mismo texto (ver `PositionRow`).
 */
export const buildPositionRows = (
  positions: readonly Position[],
  areaNameById: ReadonlyMap<number, string>,
): PositionRow[] =>
  positions.map((position) => ({
    ...position,
    area_nombre:
      position.area == null ? null : (areaNameById.get(position.area) ?? `Área #${position.area}`),
  }));

/** Avisos del diálogo de desactivar que se cerró por un cambio externo. */
export const POSITION_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "El puesto ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El puesto cambió de estatus: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`,
};

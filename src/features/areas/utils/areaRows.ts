import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";
import type { Area } from "../interfaces/area.interface";
import type { AreaRow } from "../components/AreaColumns";

/**
 * Filas de la tabla: cada área con el nombre de su departamento resuelto. Un
 * FK que no está en el catálogo (o cuyo catálogo no ha llegado) se rotula
 * `Departamento #N`, una sola vez: la celda y el filtro de encabezado leen ese
 * mismo texto (ver `AreaRow`).
 */
export const buildAreaRows = (
  areas: readonly Area[],
  departmentNameById: ReadonlyMap<number, string>,
): AreaRow[] =>
  areas.map((area) => ({
    ...area,
    departamento_nombre:
      departmentNameById.get(area.departamento) ?? `Departamento #${area.departamento}`,
  }));

/** Avisos del diálogo de desactivar que se cerró por un cambio externo. */
export const AREA_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: "El área ya no existe. Se actualizó el listado.",
  activoChanged: (activo) =>
    `El área cambió de estatus: ya está ${activo ? "activa" : "inactiva"}. Se actualizó el listado.`,
};

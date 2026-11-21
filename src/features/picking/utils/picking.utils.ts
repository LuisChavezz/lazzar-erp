// Funciones puras de derivación sobre un picking (traslado y vencimiento). Los
// KPIs del listado los calcula el backend (`GET /wms/pickings/resumen/`).

import { PICKING_ESTADOS_TRASLADABLES } from "../constants/pickingStatus";
import type {
  Picking,
  PickingRow,
} from "../interfaces/picking.interface";

/**
 * ¿El backend aceptaría trasladar este picking a otro almacén? Replica su
 * regla sobre el registro: el `estado` está en `PICKING_ESTADOS_TRASLADABLES`.
 * Lo surtido ya no lo impide: el picking surte al crearse y trasladar solo va
 * moviendo las prendas de almacén. El permiso del usuario lo decide quien
 * ofrece la acción.
 *
 * No se reutiliza en `isPickingVencido`, aunque hoy excluyan los mismos dos
 * estatus: ahí la regla es "no está en un estado terminal" (definida por el
 * frontend) y aquí es la lista blanca del backend; si el enum crece, divergen.
 */
export const isPickingTrasladable = (
  picking: Pick<Picking, "estado">,
): boolean => PICKING_ESTADOS_TRASLADABLES.includes(picking.estado);

/**
 * DEFINICIÓN ÚNICA DE "PICKING VENCIDO", la que resalta la fecha límite en el
 * detalle del surtido. Si cambia, cambia aquí.
 *
 * Un picking está vencido cuando cumple LAS DOS:
 *   1. no está `Completado` ni `Cancelado` (estados terminales: un picking ya
 *      surtido o cancelado no representa trabajo atrasado), y
 *   2. su `fecha_limite` ya pasó. Una `fecha_limite` nula o inválida NO se
 *      marca vencida.
 *
 * Se compara contra el INSTANTE actual, no contra la medianoche del día como
 * en cuentas por cobrar: ahí `fecha_vencimiento` es un `YYYY-MM-DD` (día
 * completo) mientras que aquí `fecha_limite` es un `date-time` con hora, así
 * que la hora del corte es parte del dato y anclarla a medianoche daría por
 * vigente un picking cuya hora límite ya pasó.
 *
 * Se deriva en el cliente porque el backend no expone ninguna bandera de
 * vencimiento calculada (verificado contra el schema OpenAPI del API: el
 * componente `Picking` solo trae `fecha_limite` cruda), igual que
 * `isCuentaVencida` en cuentas por cobrar.
 */
export const isPickingVencido = (picking: Picking, nowMs: number): boolean => {
  if (picking.estado === "Completado" || picking.estado === "Cancelado") return false;
  if (!picking.fecha_limite) return false;
  const limite = Date.parse(picking.fecha_limite);
  if (Number.isNaN(limite)) return false;
  return limite < nowMs;
};

/** Enriquece un picking con los campos derivados que consume el detalle. */
export const mapPickingToRow = (picking: Picking, nowMs: number): PickingRow => ({
  ...picking,
  esta_vencida: isPickingVencido(picking, nowMs),
});

/**
 * Lo que guarda la caché de `["picking-detail", id]`: el picking y el instante
 * (ms) en que se leyó. `fetchedAt` es el "ahora" con que el consumidor deriva
 * `esta_vencida` (`mapPickingToRow`): se fija FUERA del render (en la consulta
 * o en la mutación que escribe la llave), así que leerlo en render es puro, a
 * diferencia de `Date.now()`, que el React Compiler prohíbe.
 */
export interface PickingDetailData {
  picking: Picking;
  fetchedAt: number;
}

/** Valor de la llave del detalle a partir de una respuesta del backend. */
export const toPickingDetailData = (picking: Picking): PickingDetailData => ({
  picking,
  fetchedAt: Date.now(),
});

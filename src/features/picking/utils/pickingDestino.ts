import {
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
  isPedidoProgramacionDestino,
} from "@/src/features/orders/constants/pedidoProgramacion";
import type {
  PickingOnboardingAlmacen,
  PickingOnboardingPedido,
  PickingOnboardingProgramacion,
} from "../interfaces/picking-onboarding.interface";
import { PRODUCTO_TERMINADO_ALMACEN_ID } from "../constants/pickingAlmacen";

/**
 * Etiqueta del destino de una programación. Un código que el frontend no
 * conoce (el backend lo guarda en un `JSONField`) se muestra tal cual.
 */
export const getProgramacionDestinoLabel = (destino: string): string =>
  isPedidoProgramacionDestino(destino) ? PEDIDO_PROGRAMACION_DESTINO_LABELS[destino] : destino;

/**
 * Almacén destino a preseleccionar a partir de las programaciones del pedido:
 * solo cuando TODAS las que traen sugerencia apuntan al MISMO almacén (las
 * `null` no cuentan) y ese almacén es una de las opciones del selector. Con dos
 * sugerencias distintas (p. ej. APARTADOS y BORDADOS) la elección es del
 * usuario, y un sugerido fuera de las opciones no se puede enviar.
 */
export const getAlmacenSugeridoPreseleccionable = (
  programaciones: readonly PickingOnboardingProgramacion[],
  opciones: readonly Pick<PickingOnboardingAlmacen, "id">[],
): number | null => {
  const ids = new Set(
    programaciones.flatMap((programacion) =>
      programacion.almacen_sugerido ? [programacion.almacen_sugerido.id] : [],
    ),
  );
  if (ids.size !== 1) return null;
  const [id] = ids;
  return opciones.some((opcion) => opcion.id === id) ? id : null;
};

/**
 * Destinos que el backend de verdad aceptaría para el pedido. `almacenes_destino`
 * ya viene filtrado por `permite_entrada`, pero el `POST` valida dos cosas más
 * que ese subconjunto no garantiza, y ofrecer opciones que fallan seguro solo
 * cambia un error evitable por un 400:
 *
 *  - el destino debe ser de la SUCURSAL DEL PEDIDO (la lista viene acotada a
 *    las sucursales del USUARIO, que pueden ser varias), y
 *  - debe ser DISTINTO del origen (que aquí es fijo).
 *
 * El almacén SIN sucursal (`sucursal: null`, posible porque el campo es
 * nullable en el catálogo) pasa el filtro a propósito: el backend lo acepta
 * para cualquier pedido —solo compara cuando hay sucursal
 * (`if almacen_destino.sucursal_id and ... != pedido.sucursal_id`)—, así que
 * descartarlo escondería un destino válido. Llega sobre todo a usuarios
 * superusuario o admin de empresa, para los que el backend no acota el
 * catálogo por sucursal.
 *
 * Sin pedido elegido no se puede aplicar el filtro de sucursal, así que se
 * devuelven todos los destinos menos el origen.
 */
export const getDestinoOptions = <T extends PickingOnboardingAlmacen>(
  almacenesDestino: readonly T[],
  pedido: Pick<PickingOnboardingPedido, "sucursal"> | null,
): T[] => {
  const sinOrigen = almacenesDestino.filter((a) => a.id !== PRODUCTO_TERMINADO_ALMACEN_ID);
  if (!pedido) return sinOrigen;
  return sinOrigen.filter((a) => a.sucursal === null || a.sucursal === pedido.sucursal);
};

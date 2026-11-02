import type { PickingOnboardingPedido } from "@/src/features/picking/interfaces/picking-onboarding.interface";
import { getProgramacionDestinoLabel } from "@/src/features/picking/utils/pickingDestino";

/**
 * ¿El pedido pasa el filtro de destino de Pedidos de Almacén? Pasa si ALGUNA de
 * sus programaciones va a ese destino; compara el CÓDIGO del backend
 * (`APARTADO`, `BORDADO`…), no la etiqueta. Sin filtro (`undefined`) pasa todo.
 */
export const matchesProgramacionDestino = (
  pedido: Pick<PickingOnboardingPedido, "programaciones">,
  destino: unknown,
): boolean =>
  destino === undefined ||
  pedido.programaciones.some((programacion) => programacion.destino === destino);

/**
 * Texto de las programaciones para la búsqueda global: etiqueta del destino,
 * almacén sugerido y comentarios no vacíos — lo mismo que pinta la celda.
 */
export const getProgramacionesSearchText = (
  pedido: Pick<PickingOnboardingPedido, "programaciones">,
): string =>
  pedido.programaciones
    .flatMap((programacion) => [
      getProgramacionDestinoLabel(programacion.destino),
      programacion.almacen_sugerido?.nombre ?? "",
      programacion.comentarios.trim(),
    ])
    .filter(Boolean)
    .join(" ");

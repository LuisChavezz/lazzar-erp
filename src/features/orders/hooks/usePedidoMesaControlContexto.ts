import { useQuery } from "@tanstack/react-query";
import { getPedidoMesaControlContexto } from "../services/actions";
import type { PedidoMesaControlContexto } from "../interfaces/pedido-mesa-control-contexto.interface";

/**
 * Precheck de la edición estricta de un pedido por Mesa de Control.
 *
 * Se consulta al ABRIR la pantalla para no montar un formulario que el backend
 * va a rechazar. No sustituye al manejo del 409: el bloqueo puede aparecer entre
 * que se abre la pantalla y se pulsa Guardar (alguien crea un picking mientras
 * tanto), y el POST vuelve a comprobarlo por su cuenta.
 *
 * `staleTime: 0` a propósito — al revés que los catálogos: es un permiso
 * momentáneo, no una tabla de referencia. Servir un "editable" cacheado de hace
 * minutos es exactamente el error que este precheck existe para evitar.
 */
export const usePedidoMesaControlContexto = (id: number) => {
  return useQuery<PedidoMesaControlContexto>({
    queryKey: ["pedido-mesa-control-contexto", id],
    queryFn: () => getPedidoMesaControlContexto(id),
    enabled: id > 0,
    staleTime: 0,
  });
};

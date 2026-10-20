import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { createAvance } from "../services/actions";
import { embroideryOrderDetailQueryKey } from "./useEmbroideryOrderDetail";

/**
 * Mutación de alta de un avance de bordado
 * (`POST /produccion/bordado-avances/`). La OB padre viaja en el payload
 * (`variables.ob`), así que el hook no necesita un parámetro aparte.
 *
 * Invalida `["embroidery-order-detail", ob]`: los `avances` y el
 * `resumen_avance` viven SOLO en el detalle. La invalidación se DEVUELVE para
 * que la mutación siga en `isPending` hasta que llegue el re-fetch: el tope del
 * diálogo sale de `resumen_avance`, y sin esperar, reabrirlo antes de que
 * llegara el detalle nuevo dejaría registrar contra el total viejo (el backend
 * no impone el tope).
 *
 * No invalida el listado (no pinta datos de avance). SÍ invalida el detalle y
 * la trazabilidad del pedido, por prefijo, como el resto de mutaciones que
 * cambian su avance: una invalidación solo relee las consultas montadas, así
 * que es barata, y mantiene la regla igual en todas las mutaciones en vez de
 * depender de que cada consumidor relea al montarse.
 */
export const useCreateAvance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvance,
    onSuccess: (_avance, variables) => {
      toast.success("Avance registrado correctamente");
      // Solo se espera el detalle de la OB (su `resumen_avance` es el tope del
      // diálogo); el pedido se relee en segundo plano.
      queryClient.invalidateQueries({ queryKey: ["pedido-detail"] });
      queryClient.invalidateQueries({ queryKey: ["pedido-trazabilidad"] });
      return queryClient.invalidateQueries({
        queryKey: embroideryOrderDetailQueryKey(variables.ob),
      });
    },
    onError: (error) => {
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "No se pudo registrar el avance")
      );
    },
  });
};

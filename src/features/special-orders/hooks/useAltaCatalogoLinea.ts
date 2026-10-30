import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { altaCatalogoLinea } from "../services/actions";
import { parseCatalogAltaError } from "../utils/parseCatalogAltaError";

/** Llave POR LÍNEA: candado contra el doble envío de esa línea. */
export const altaCatalogoMutationKey = (pedidoId: number, pedidoDetalleId: number) =>
  ["special-order-alta-catalogo", pedidoId, pedidoDetalleId] as const;

/**
 * Alta en catálogo de los SKU de producción de UNA línea de muestra.
 *
 * La vista NO se arma con la respuesta `201` (trae solo las variantes de esta
 * llamada, por nombre de talla): se invalida el detalle, que relee
 * `aplica_catalogo`/`sku_catalogo` de cada talla y con eso la columna "SKU
 * catálogo" y el botón. También `["product-variants"]` por prefijo: los SKU
 * nuevos salen en Nueva OP (`con_bom=true`), movimientos y traspasos. Sin
 * `invalidateStockQueries`: el alta no mueve inventario. El detalle de ventas
 * (`["pedido-detail", id]`) tampoco cambia: el alta no toca la línea del pedido.
 *
 * Errores: el mensaje del backend en un toast; si la línea quedó obsoleta
 * (`pedido_detalle_id` o `404`) se relee el detalle.
 */
export const useAltaCatalogoLinea = (pedidoId: number, pedidoDetalleId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = altaCatalogoMutationKey(pedidoId, pedidoDetalleId);
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation({
    mutationKey,
    mutationFn: () => altaCatalogoLinea(pedidoId, pedidoDetalleId),
    onSuccess: async (variants) => {
      toast.success(
        variants.length === 1
          ? "Se dio de alta 1 SKU en catálogo"
          : `Se dieron de alta ${variants.length} SKU en catálogo`,
      );
      void queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      // Se espera el detalle: el diálogo se cierra con el botón y la columna ya al día.
      await queryClient.invalidateQueries({ queryKey: ["special-order-detail", pedidoId] });
    },
    onError: async (error) => {
      const parsed = parseCatalogAltaError(error);
      toast.error(parsed.message);
      if (parsed.staleLine) {
        await queryClient.invalidateQueries({ queryKey: ["special-order-detail", pedidoId] });
      }
    },
  });

  /** Dispara el alta salvo que ya haya una en vuelo para ESTA línea. */
  const altaCatalogo = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { altaCatalogo, isPending: isRunning };
};

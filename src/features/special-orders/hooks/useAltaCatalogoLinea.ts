import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { pedidoProgramarQueryKey } from "@/src/features/orders/hooks/usePedidoProgramarContexto";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { altaCatalogoLinea } from "../services/actions";
import {
  isCategoryRejection,
  parseCatalogAltaError,
  type ParsedCatalogAltaError,
} from "../utils/parseCatalogAltaError";

/** Llave POR LÍNEA: candado contra el doble envío de esa línea. */
export const altaCatalogoMutationKey = (pedidoId: number, pedidoDetalleId: number) =>
  ["special-order-alta-catalogo", pedidoId, pedidoDetalleId] as const;

interface AltaCatalogoVariables {
  /** Solo para una línea SIN categoría: la elegida en el diálogo. */
  categoriaProductoId?: number;
}

/**
 * Alta en catálogo de los SKU de producción de UNA línea de muestra.
 *
 * La vista NO se arma con la respuesta `201` (trae solo las variantes de esta
 * llamada, por nombre de talla): se invalida el detalle, que relee
 * `aplica_catalogo`/`sku_catalogo` de cada talla y con eso la columna "SKU
 * catálogo" y el botón. También `["product-variants"]` por prefijo: los SKU
 * nuevos salen en Nueva OP (`con_bom=true`), movimientos y traspasos. Sin
 * `invalidateStockQueries`: el alta no mueve inventario.
 *
 * Con `categoriaProductoId` el alta SÍ toca la línea del pedido (le guarda la
 * categoría), así que también se releen el detalle de ventas
 * (`["pedido-detail", id]`, que muestra `categoria_producto_nombre`) y
 * "Programar pedido" (`["pedido-programar", id]`). El pedido especial y el de
 * ventas son el mismo `Pedido`, así que comparten id.
 *
 * Errores: el mensaje del backend en un toast; si la línea quedó obsoleta
 * (`pedido_detalle_id` o `404`) se relee el detalle. Un rechazo de la categoría
 * elegida (`isCategoryRejection`) NO da toast: lo muestra el diálogo, que sigue
 * abierto para elegir otra.
 */
export const useAltaCatalogoLinea = (pedidoId: number, pedidoDetalleId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = altaCatalogoMutationKey(pedidoId, pedidoDetalleId);
  const { isRunning, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation({
    mutationKey,
    mutationFn: ({ categoriaProductoId }: AltaCatalogoVariables) =>
      altaCatalogoLinea(pedidoId, pedidoDetalleId, categoriaProductoId),
    onSuccess: async (variants, { categoriaProductoId }) => {
      toast.success(
        variants.length === 1
          ? "Se dio de alta 1 SKU en catálogo"
          : `Se dieron de alta ${variants.length} SKU en catálogo`,
      );
      void queryClient.invalidateQueries({ queryKey: ["product-variants"] });
      if (categoriaProductoId !== undefined) {
        void queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(pedidoId) });
        void queryClient.invalidateQueries({ queryKey: pedidoProgramarQueryKey(pedidoId) });
      }
      // Se espera el detalle: el diálogo se cierra con el botón y la columna ya al día.
      await queryClient.invalidateQueries({ queryKey: ["special-order-detail", pedidoId] });
    },
    onError: async (error, { categoriaProductoId }) => {
      const parsed = parseCatalogAltaError(error);
      if (categoriaProductoId === undefined || !isCategoryRejection(parsed)) {
        toast.error(parsed.message);
      }
      if (parsed.staleLine) {
        await queryClient.invalidateQueries({ queryKey: ["special-order-detail", pedidoId] });
      }
    },
  });

  /** Dispara el alta salvo que ya haya una en vuelo para ESTA línea. */
  const altaCatalogo = (
    options: {
      categoriaProductoId?: number;
      onSuccess?: () => void;
      /** Con el error ya normalizado; el toast (si aplica) ya lo dio el hook. */
      onError?: (parsed: ParsedCatalogAltaError) => void;
      onSettled?: () => void;
    } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(
      { categoriaProductoId: options.categoriaProductoId },
      {
        onSuccess: options.onSuccess,
        onError: options.onError && ((error) => options.onError?.(parseCatalogAltaError(error))),
        onSettled: options.onSettled,
      },
    );
  };

  return { altaCatalogo, isPending: isRunning };
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteCuentaPorPagar } from "../services/actions";
import {
  parseCuentaPorPagarError,
  type ParsedCuentaPorPagarError,
} from "../utils/parseCuentaPorPagarError";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";

/**
 * useDeleteCuentaPorPagar
 *
 * Elimina FÍSICAMENTE una cuenta por pagar (`DELETE /finanzas/cuentas-por-pagar/{id}/`).
 *
 * Optimista de BORRADO, mismo patrón que `useDeleteNotaCredito`: cancelar
 * consultas en vuelo, instantánea, quitar la fila, revertir en `onError`,
 * invalidar en `onSettled`. Una diferencia: la instantánea y el recorte se hacen
 * sobre TODAS las consultas bajo el prefijo `["cuentas-por-pagar"]`
 * (`getQueriesData`/`setQueriesData`), no sobre una llave exacta. El listado
 * lleva sus `params` en la llave, y los selectores de `payments` cachean arreglos
 * de la misma forma por proveedor; quitar la cuenta borrada de todos es correcto
 * y revertirlos todos también. Una consulta sin datos (selector deshabilitado)
 * no se toca: el updater devuelve `undefined` y TanStack no escribe nada.
 *
 * ERRORES. Se normalizan con `parseCuentaPorPagarError` y NO con
 * `extractErrorMessage`, que no desenvuelve la lista de DRF en que llegan:
 *  - 400 (`kind: "validation"`): la cuenta tiene pagos aplicados —el listado
 *    puede estar rancio—. La fila vuelve y el mensaje dice qué hacer.
 *  - 409 (`kind: "conflict"`): otra operación tenía bloqueados la cuenta o sus
 *    pagos. La fila vuelve y el mismo `mutate(id)` puede reintentarse tal cual.
 *    Sin toast: el consumidor muestra el motivo en el diálogo que sigue abierto.
 * `onServerError` entrega el error normalizado para que la UI ofrezca la
 * afordancia que corresponde a cada `kind`.
 *
 * `onSettled` invalida también `["pagos"]`: el backend permite el borrado cuando
 * la cuenta solo tiene pagos en `Borrador` o `Cancelado`, y las líneas de esos
 * pagos que apuntaban a ella se borran EN CASCADA — el `pago_detalles` que el
 * listado de pagos haya cacheado queda obsoleto.
 */
export const useDeleteCuentaPorPagar = (
  onServerError?: (parsed: ParsedCuentaPorPagarError) => void,
  options: {
    /**
     * ¿El diálogo de confirmación de ESTA cuenta sigue abierto? Se consulta en el
     * momento del error. Solo entonces un 409 omite el toast, porque el diálogo
     * lo pinta junto a "Reintentar"; si el usuario ya lo cerró, el toast es la
     * única forma de enterarse de que la cuenta no se eliminó. Sin la opción, el
     * 409 siempre avisa por toast.
     */
    isConflictShownInDialog?: (id: number) => boolean;
  } = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCuentaPorPagar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["cuentas-por-pagar"] });
      const snapshots = queryClient.getQueriesData<CuentaPorPagar[]>({
        queryKey: ["cuentas-por-pagar"],
      });

      queryClient.setQueriesData<CuentaPorPagar[]>(
        { queryKey: ["cuentas-por-pagar"] },
        (old) => old?.filter((cuenta) => cuenta.id !== id),
      );

      return { snapshots };
    },
    onError: (err, id, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      console.error(err);

      const parsed = parseCuentaPorPagarError(
        err,
        "Error al eliminar la cuenta por pagar.",
      );
      onServerError?.(parsed);

      // Un 409 con el diálogo de ESTA cuenta abierto NO lleva toast: el diálogo
      // ya pinta el motivo junto a "Reintentar" y el toast solo duplicaba el
      // mensaje. Si el usuario lo cerró antes de la respuesta, el toast sí sale:
      // la fila acaba de reaparecer y nada más explicaría por qué. El 400 y los
      // errores inesperados cierran el diálogo, y ahí el toast es la única voz.
      if (parsed.kind === "conflict" && options.isConflictShownInDialog?.(id)) return;

      toast.error(
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : parsed.formError ?? "Error al eliminar la cuenta por pagar",
      );
    },
    // Las invalidaciones NO se devuelven: si `onSettled` retorna la promesa,
    // `mutateAsync` no resuelve ni rechaza hasta que termina el refetch, y el
    // diálogo de la vista (que decide cerrarse o pintar "Reintentar" con ese
    // resultado) reaccionaba ~1 s tarde. La fila ya salió o ya volvió por el
    // optimista, así que el refetch puede correr en segundo plano.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] });
      void queryClient.invalidateQueries({ queryKey: ["pagos"] });
    },
    onSuccess: () => {
      toast.success("Cuenta por pagar eliminada correctamente");
    },
  });
};

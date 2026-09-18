import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cerrarConciliacion } from "../services/actions";
import { CONCILIACIONES_KEY_ROOT } from "./useConciliaciones";

const FALLBACK = "Error al cerrar la conciliación";

/**
 * Cierra una conciliación: `POST /{id}/cerrar/`.
 *
 * SIN actualización optimista, por el mismo motivo que `useContabilizarPoliza`:
 * es la operación que CIERRA el periodo y el backend la rechaza por una
 * condición de negocio real —que el estado de cuenta no cuadre con los libros—.
 * Pintar la fila como `Cerrada` para devolverla a `Borrador` medio segundo
 * después diría que un periodo contable se cerró cuando no fue así. Además el
 * cierre marca `Conciliado` en bloque los movimientos del periodo, un efecto
 * que el cliente no puede adelantar. Se espera al servidor y se invalida.
 *
 * El 400 del descuadre llega como `{"diferencia": ["La diferencia (X) debe ser
 * 0.00 para cerrar la conciliación."]}` —y el de cerrar una cancelada como
 * `{"estatus": [...]}`—, una forma de DRF que se desenvuelve con
 * `firstDrfFieldMessage`. NO se encadena a `extractErrorMessage`, que para un
 * `AxiosError` devolvería "Request failed with status code 400".
 */
export const useCerrarConciliacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cerrarConciliacion(id),
    onSuccess: () => {
      toast.success("Conciliación cerrada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(firstDrfFieldMessage(error) ?? FALLBACK);
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CONCILIACIONES_KEY_ROOT }),
  });
};

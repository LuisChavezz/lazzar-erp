import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { prepararConciliacion } from "../services/actions";
import { CONCILIACIONES_KEY_ROOT } from "./useConciliaciones";

const FALLBACK = "Error al preparar la conciliación";

/**
 * Prepara (crea o reutiliza) el borrador de un periodo.
 *
 * SIN actualización optimista: la respuesta trae los saldos que el servidor
 * acaba de CALCULAR —`saldo_libros` se reconstruye a la fecha de corte—, así que
 * no hay nada que el cliente pueda adelantar. Se espera al servidor y se
 * invalida por la raíz, que alcanza tanto al listado de la pantalla como a la
 * consulta de solapamiento del formulario.
 *
 * El mensaje de error sale del cuerpo del 400 (`{"campo": ["mensaje"]}`) con
 * `firstDrfFieldMessage`. NO se encadena a `extractErrorMessage`: ese helper
 * evalúa `error instanceof Error` antes de su respaldo y un `AxiosError` lo
 * satisface, así que mostraría "Request failed with status code 400".
 */
export const usePrepararConciliacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: prepararConciliacion,
    onSuccess: () => {
      toast.success("Conciliación preparada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(firstDrfFieldMessage(error) ?? FALLBACK);
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: el diálogo aterriza en el detalle, y el detalle se arma
    // con la fila del listado ya refrescado.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CONCILIACIONES_KEY_ROOT }),
  });
};

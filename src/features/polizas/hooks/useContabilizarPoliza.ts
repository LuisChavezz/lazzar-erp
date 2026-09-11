import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { contabilizarPoliza } from "../services/actions";
import { parsePolizaError, polizaErrorToastMessage } from "../utils/parsePolizaError";

const FALLBACK = "Error al contabilizar la póliza";

/**
 * Contabiliza una póliza: `POST /finanzas/polizas/{id}/contabilizar/`.
 *
 * ES LA ÚNICA VÍA. Nunca un `PATCH { estatus: "Contabilizada" }`: `perform_update`
 * no tiene máquina de estados y guardaría el estatus SIN ejecutar
 * `PolizaService.validar_suma_cero`, dejando contabilizada una póliza
 * descuadrada. Ver `services/actions.ts`.
 *
 * SIN actualización optimista, a diferencia de `useCancelarPoliza` (y por el
 * mismo motivo que `useEmitirNotaCredito`): es la operación que CIERRA el
 * asiento, y el backend la rechaza por una condición de negocio real —que los
 * cargos no igualen a los abonos—. Pintar la fila como `Contabilizada` para
 * devolverla a `Borrador` medio segundo después diría que un documento contable
 * se cerró cuando no fue así. Se espera al servidor y se invalida.
 *
 * El error se normaliza con `parsePolizaError` —no `extractErrorMessage`—:
 * el 400 del descuadre llega como
 * `{"poliza_detalles": ["La suma de cargos (X) debe ser igual a la suma de
 * abonos (Y)."]}`, una forma de DRF que `extractErrorMessage` (que solo lee
 * `{ error: string }`) no sabe desenvolver.
 */
export const useContabilizarPoliza = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => contabilizarPoliza(id),
    onSuccess: () => {
      toast.success("Póliza contabilizada correctamente");
    },
    onError: (error) => {
      console.error(error);
      toast.error(polizaErrorToastMessage(parsePolizaError(error, `${FALLBACK}.`), FALLBACK));
    },
    // Se devuelve una promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio y el
    // diálogo de confirmación (con `closeOnConfirm={false}`) puede cerrarse ahí.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["polizas"] }),
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createPoliza } from "../services/actions";
import {
  parsePolizaError,
  polizaErrorToastMessage,
  type ParsedPolizaError,
} from "../utils/parsePolizaError";

const FALLBACK = "Error al registrar la póliza";

/**
 * Mutación de alta de póliza. `onServerError` recibe el error ya normalizado
 * para que el formulario lo reparta entre el banner de "todo o nada", los campos
 * de cabecera y los movimientos.
 *
 * Invalida SOLO `["polizas"]`. A diferencia del alta de una nota de crédito o de
 * un pago, crear una póliza no mueve ningún saldo: no hay CxC ni CxP que
 * refrescar. La póliza nace en `Borrador` (ver `buildPolizaPayload`) y ni
 * siquiera contabilizarla toca otra cosa que su propio `estatus`.
 *
 * El toast NO promete que la póliza esté contabilizada: el POST solo crea el
 * borrador. Cuando el usuario pulsó "Contabilizar", el formulario encadena la
 * acción y es ella la que anuncia el resultado (ver `usePolizaForm`).
 */
export const useCreatePoliza = (
  onServerError?: (parsed: ParsedPolizaError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPoliza,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polizas"] });
    },
    onError: (error) => {
      const parsed = parsePolizaError(error, `${FALLBACK}.`);
      onServerError?.(parsed);
      toast.error(polizaErrorToastMessage(parsed, FALLBACK));
    },
  });
};

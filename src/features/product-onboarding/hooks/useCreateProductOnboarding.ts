import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { createProductOnboarding } from "../services/actions";
import {
  setProductOnboardingFieldErrors,
  type SetProductOnboardingError,
} from "./setProductOnboardingFieldErrors";

const GENERIC_ERROR = "Error al registrar el producto";

/**
 * Alta rápida de producto (`POST /catalogo/producto/onboarding/`).
 *
 * - `400`: los errores de campo se pintan bajo su control vía `setError`; el
 *   toast muestra el primer motivo real del backend (`firstDrfFieldMessage`).
 * - Cualquier otro fallo (p. ej. el `500` de un usuario sin empresa) cae en un
 *   aviso genérico: su cuerpo no trae un mensaje apto para el usuario.
 *
 * Se invalida la raíz `["products"]`: alcanza a todos los listados filtrados
 * por tipo (`["products", tipo_id]`).
 */
export const useCreateProductOnboarding = (setError?: SetProductOnboardingError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductOnboarding,
    onSuccess: (producto) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Producto registrado con código ${producto.codigo}`);
    },
    onError: (error) => {
      setProductOnboardingFieldErrors(error, setError);
      const isValidationError =
        error instanceof AxiosError && error.response?.status === 400;
      toast.error(
        isValidationError ? (firstDrfFieldMessage(error) ?? GENERIC_ERROR) : GENERIC_ERROR,
      );
    },
  });
};

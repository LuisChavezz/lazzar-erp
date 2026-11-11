import { isAxiosError } from "axios";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  FISCAL_ADDRESS_FIELDS,
  FiscalAddress,
  FiscalAddressField,
} from "../interfaces/fiscal-address.interface";

/**
 * Lo que el `PATCH` debe mandar: SOLO los campos que el usuario cambió
 * respecto al domicilio con que se abrió el diálogo (EC-860). Mandar los nueve
 * pisaría lo que otra pestaña u otro administrador guardó entretanto en los
 * campos que este usuario no tocó. `values` llega ya validado por el schema
 * (recortado, como lo guarda el backend). Objeto vacío = nada que guardar.
 */
export const fiscalAddressPatch = (
  initial: FiscalAddress,
  values: FiscalAddress,
): Partial<FiscalAddress> => {
  const patch: Partial<FiscalAddress> = {};
  for (const field of FISCAL_ADDRESS_FIELDS) {
    if (values[field] !== initial[field]) patch[field] = values[field];
  }
  return patch;
};

export const FISCAL_ADDRESS_SAVE_FALLBACK = "No se pudo guardar la dirección fiscal";

export interface FiscalAddressSaveErrorRouting {
  /** Cada error de un campo del formulario, para pintarlo bajo su input. */
  fieldErrors: Partial<Record<FiscalAddressField, string>>;
  /**
   * Motivo para el banner del formulario: lo que no es de un campo (el 403 de
   * quien no es admin, el 400 `{"empresa": "..."}` de un usuario sin empresa
   * activa, red o 5xx). `null` si todo el rechazo ya está bajo sus campos.
   */
  formError: string | null;
  /** Texto del toast. */
  toastMessage: string;
}

/**
 * Reparte el error de un guardado del domicilio fiscal entre los campos, el
 * banner y el toast. La lectura del cuerpo es la de `handleDrfWriteError`.
 */
export const routeFiscalAddressSaveError = (error: unknown): FiscalAddressSaveErrorRouting => {
  const fieldErrors: Partial<Record<FiscalAddressField, string>> = {};
  const message = handleDrfWriteError(
    error,
    FISCAL_ADDRESS_SAVE_FALLBACK,
    FISCAL_ADDRESS_FIELDS,
    (field, text) => {
      fieldErrors[field] = text;
    },
  );
  const onlyFieldErrors =
    Object.keys(fieldErrors).length > 0 && message === FISCAL_ADDRESS_SAVE_FALLBACK;
  return {
    fieldErrors,
    formError: onlyFieldErrors ? null : message,
    toastMessage: message,
  };
};

const LOAD_NETWORK_MESSAGE = "Revisa tu conexión e inténtalo de nuevo.";
const LOAD_FALLBACK = "No se pudo cargar la dirección fiscal.";

/**
 * Mensaje de una carga fallida. Un 4xx es la respuesta definitiva del backend
 * (p. ej. `{"empresa": "El usuario no tiene empresa activa."}`) y se muestra
 * tal cual; solo la red y los 5xx hablan de la conexión.
 */
export const fiscalAddressLoadErrorMessage = (error: unknown): string => {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) {
    return firstDrfFieldMessage(error) ?? LOAD_FALLBACK;
  }
  return LOAD_NETWORK_MESSAGE;
};

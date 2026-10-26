import { AxiosError } from "axios";
import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import type { CustomerFormValues } from "../schemas/customer.schema";

/**
 * Textos de error del alta/edición de clientes. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts`; aquí quedan los campos que `CustomerForm`
 * PINTA. Un error de un campo que el formulario no muestra (`facturama`,
 * `non_field_errors`, `detail` u otra clave) es un rechazo del guardado: va al
 * banner del formulario y al toast.
 */

export type CustomerFormField = keyof CustomerFormValues;

const BASE_FORM_FIELDS: readonly CustomerFormField[] = [
  "razon_social",
  "nombre",
  "telefono",
  "correo",
  "rfc",
  "sat_regimen_fiscal",
  "sat_uso_cfdi",
  "direccion_fiscal",
  "colonia",
  "codigo_postal",
  "ciudad",
  "estado",
];

// Solo el formulario del módulo de clientes pinta la sección de Crédito.
const FORM_FIELDS_WITH_CREDIT: readonly CustomerFormField[] = [
  ...BASE_FORM_FIELDS,
  "dias_credito",
  "limite_credito",
];

export const getCustomerFormFields = (includeCredit: boolean): readonly CustomerFormField[] =>
  includeCredit ? FORM_FIELDS_WITH_CREDIT : BASE_FORM_FIELDS;

const CUSTOMER_GONE_MESSAGE = "El cliente ya no existe o ya no tienes acceso a él.";

export type SetCustomerFieldError = (field: CustomerFormField, message: string) => void;

/**
 * Error del guardado de un cliente. Un 400 pinta cada mensaje bajo su campo
 * (si el formulario lo muestra); el resto de los errores (403, 404, 409)
 * se lee como una acción sobre el registro. Devuelve el mensaje del backend
 * que no es de ningún campo, o `undefined` si no hay ninguno (red, 5xx o solo
 * errores de campo): ahí el llamador usa su texto genérico y no hay banner.
 *
 * Los helpers devuelven el respaldo tal cual cuando no encuentran mensaje y
 * nunca un mensaje vacío (`firstDrfMessage` salta los `""`), así que `""` como
 * respaldo significa "sin mensaje real".
 */
export const getCustomerWriteErrorMessage = (
  error: unknown,
  formFields: readonly CustomerFormField[],
  setFieldError?: SetCustomerFieldError
): string | undefined => {
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  const message =
    status === 400
      ? handleDrfWriteError(error, "", formFields, setFieldError)
      : drfActionErrorMessage(error, "", CUSTOMER_GONE_MESSAGE);
  return message || undefined;
};

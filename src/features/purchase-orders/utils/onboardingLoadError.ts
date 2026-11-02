import { isAxiosError } from "axios";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";

/**
 * Texto para el usuario cuando falla la CARGA de un onboarding de compras
 * (`GET /compras/ordenes/onboarding/` o `/compras/recepciones/onboarding/`).
 *
 * El único rechazo de esos GET es el de un usuario sin empresa, superusuario
 * incluido (backend #862): `400 {"empresa": "El usuario no tiene empresa
 * asignada."}`, con el mensaje como string plano e igual en los dos endpoints.
 * Ese mensaje se muestra tal cual. Cualquier otro fallo (red, 5xx) cae en
 * `extractErrorMessage`, que nunca devuelve el texto técnico de axios.
 */
export const onboardingLoadErrorMessage = (error: unknown): string =>
  (isAxiosError(error) ? firstRejectionMessage(error.response?.data, ["empresa"]) : undefined) ??
  extractErrorMessage(error, "Intenta de nuevo en unos momentos.");

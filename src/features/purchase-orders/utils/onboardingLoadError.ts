import { isAxiosError } from "axios";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { isClientError } from "@/src/utils/drfWriteErrors";

/**
 * Mensaje con el que el backend RECHAZA un GET de onboarding de compras
 * (`/compras/ordenes/onboarding/` o `/compras/recepciones/onboarding/`), o
 * `undefined` si el error no es uno de esos rechazos.
 *
 * El único rechazo de esos GET es el de un usuario sin empresa, superusuario
 * incluido (backend #862): `400 {"empresa": "El usuario no tiene empresa
 * asignada."}`, con el mensaje como string plano e igual en los dos endpoints.
 */
export const onboardingRejectionMessage = (error: unknown): string | undefined =>
  isAxiosError(error) ? firstRejectionMessage(error.response?.data, ["empresa"]) : undefined;

/**
 * Texto para el usuario cuando falla la CARGA de un onboarding de compras: el
 * rechazo del backend tal cual (`onboardingRejectionMessage`) o, con cualquier
 * otro fallo (red, 5xx), `extractErrorMessage`, que nunca devuelve el texto
 * técnico de axios.
 */
export const onboardingLoadErrorMessage = (error: unknown): string =>
  onboardingRejectionMessage(error) ?? extractErrorMessage(error, "Intenta de nuevo en unos momentos.");

/**
 * Para las búsquedas sobre el onboarding (productos, SKU): el texto de un 4xx
 * definitivo, con el que "Reintentar" no sirve (repetiría la misma respuesta);
 * `undefined` si el fallo es pasajero y reintentar sí puede salir bien.
 */
export const onboardingSearchRejection = (error: unknown): string | undefined =>
  isClientError(error) ? (onboardingRejectionMessage(error) ?? "El servidor rechazó la búsqueda.") : undefined;

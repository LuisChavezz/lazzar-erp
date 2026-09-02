import type { AxiosError } from "axios";
import { firstDrfMessage } from "./firstDrfMessage";

/**
 * Primer mensaje aprovechable del cuerpo de un error de Django REST Framework.
 *
 * `firstDrfMessage` desenvuelve el valor de UN campo (`"msg"` o `["msg"]`);
 * esta función es el paso que falta antes: saca el cuerpo del `AxiosError` y
 * recorre sus claves. Sin ella no se puede componer nada útil, porque pasarle
 * el error entero a `firstDrfMessage` devuelve siempre `undefined`.
 *
 * Existe porque `extractErrorMessage` evalúa `error instanceof Error` ANTES de
 * su fallback, y un `AxiosError` lo satisface: un 400 con errores por campo
 * (que no trae la clave `error` de primer nivel) acaba mostrando "Request
 * failed with status code 400". Anteponiendo esta función se muestra el motivo
 * real; si no hay ninguno, devuelve `undefined` y el llamador cae en
 * `extractErrorMessage` como siempre.
 *
 * Orden: `detail` → `non_field_errors` → primera clave con mensaje. Las dos
 * primeras son las convenciones estándar de DRF y describen el error completo,
 * así que ganan a un campo suelto.
 *
 * Deliberadamente NO baja a estructuras anidadas (`{lineas: [{cantidad: [...]}]}`):
 * eso es específico de cada endpoint y ya lo resuelven los parsers de
 * corte-manga, bordado y reflejante. Para esos casos devuelve `undefined` y
 * deja que decida el fallback.
 */
export const firstDrfFieldMessage = (error: unknown): string | undefined => {
  const data = (error as AxiosError)?.response?.data;

  if (!data || typeof data !== "object") {
    return undefined;
  }

  const record = data as Record<string, unknown>;

  return (
    firstDrfMessage(record.detail) ??
    firstDrfMessage(record.non_field_errors) ??
    Object.values(record)
      .map((value) => firstDrfMessage(value))
      .find(Boolean)
  );
};

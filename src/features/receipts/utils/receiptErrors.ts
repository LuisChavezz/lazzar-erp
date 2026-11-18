import { isAxiosError } from "axios";

/**
 * ¿El backend rechazó la SM de la recepción? 400 con la llave `salida_maquila`
 * (SM ya recibida, cancelada, inexistente o de otra OP; nucleo-erp #1217). La
 * SM elegida dejó de ser recibible: el flujo vuelve al paso 1 (EC-912). Los
 * demás 400 dejan al usuario en el formulario para corregir.
 */
export const isSalidaMaquilaRejection = (error: unknown): boolean => {
  if (!isAxiosError(error) || error.response?.status !== 400) return false;
  const data: unknown = error.response.data;
  return !!data && typeof data === "object" && "salida_maquila" in data;
};

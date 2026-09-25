/**
 * El backend valida el tenant de `evaluador` reutilizando el MISMO mensaje que
 * para `empleado` ("El empleado no pertenece a la empresa del usuario."). Bajo
 * el campo "Evaluador" ese texto confunde —habla del evaluado, no de quien
 * evalúa—, así que se sustituye por uno correcto. Cualquier otro mensaje pasa
 * tal cual.
 */
const EMPLEADO_TENANT_MESSAGE = "El empleado no pertenece a la empresa del usuario.";
const EVALUADOR_TENANT_MESSAGE = "El evaluador no pertenece a la empresa del usuario.";

export const toEvaluationServerMessage = (field: string, message: string) =>
  field === "evaluador" && message.trim() === EMPLEADO_TENANT_MESSAGE
    ? EVALUADOR_TENANT_MESSAGE
    : message;

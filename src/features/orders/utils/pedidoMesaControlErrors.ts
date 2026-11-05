import {
  extractPlainDetalleMessage,
  extractProcessCompatibilityMessage,
  REQUIRED_COLOR_KEY,
  type QuoteValidationIssue,
} from "@/src/features/quotes/utils/quoteValidationErrors";
import {
  extractJoinedRejectionMessage,
  firstDrfMessage,
  firstRejectionMessage,
} from "@/src/utils/firstDrfMessage";

/**
 * Rechazo de servicios extras ya facturados (#744,
 * `_save_pedido_servicios_extras`): `400 {"servicios_extras": [...]}` con UN
 * mensaje por servicio afectado — "<nombre>: está en la factura <folio>; no se
 * cambia su importe ni se oculta." o "<nombre>: ya se facturó; no se puede
 * eliminar.".
 *
 * Hoy no se alcanza desde la edición de Mesa de Control: cualquier renglón de
 * factura sobre un servicio extra es el bloqueo `factura_detalle_ligado`, que
 * responde 409 antes de llegar a esa validación (EC-776). Se maneja por si el
 * backend relaja ese bloqueo (EC-762).
 */
export const SERVICIOS_EXTRAS_REJECTION_KEY = "servicios_extras";

/**
 * Claves de RECHAZO de `POST /ventas/pedidos/{id}/editar-mesa-control/`:
 * motivos que el usuario no puede corregir en ningún campo del formulario y
 * que por tanto tienen que llegarle en el toast.
 *
 * Vienen como `ValidationError` de DRF — o sea **HTTP 400 con el mensaje
 * anidado bajo su clave**, no un 403 ni un `{ error }`:
 *
 * - `permiso`: `_require_mesa_control` — "Acción disponible solo para mesa de
 *   control." Es el caso del usuario que tiene `E-MESACONTROL-PEDIDOS` pero no
 *   cumple lo que el backend valida de verdad: ser superuser, `is_admin_empresa`
 *   o tener un rol activo de su empresa cuya clave de departamento sea
 *   EXACTAMENTE `MESACONTROL` (p. ej. `MESACONTROLYVENTAS` se rechaza).
 * - `pedido` / `cotizacion`: el pedido no tiene cotización ligada (o se
 *   borró), así que no hay nada que espejar.
 * - `servicios_extras`: servicios ya facturados (ver
 *   `SERVICIOS_EXTRAS_REJECTION_KEY`). Es una LISTA que se muestra completa,
 *   como `compatibilidad_proceso`; en esta lista queda solo como respaldo.
 *
 * `detail` cubre los `APIException` genéricos de DRF, por si aparece otro.
 * NO se incluyen las claves de campo (`detalle`, `pedido.cliente`…): esas ya
 * las pinta `onValidationError` sobre el input correspondiente y repetirlas en
 * el toast sería ruido. Sí son rechazo `compatibilidad_proceso` (matriz
 * prenda/proceso, lista completa) y `detalle` cuando llega como mensaje plano
 * (p. ej. el tope de reflejante «Del inventario»): no los pinta ningún campo.
 * `color` (EC-641) va a los DOS lados: el toast muestra el mensaje del backend
 * con los nombres de producto, y `onValidationError` marca las partidas.
 */
const REJECTION_KEYS = [
  "permiso",
  "cotizacion",
  "detail",
  REQUIRED_COLOR_KEY,
  SERVICIOS_EXTRAS_REJECTION_KEY,
] as const;

/**
 * Mensaje de rechazo del cuerpo 400, o `undefined` si el 400 es de validación
 * de campos. `firstDrfMessage` desenvuelve el `string | string[]` con el que
 * DRF serializa cada valor; las claves que son una lista de motivos
 * (`compatibilidad_proceso`, `servicios_extras`) se muestran completas.
 */
export const extractPedidoMesaControlRejectionMessage = (data: unknown): string | undefined => {
  const message =
    extractProcessCompatibilityMessage(data) ??
    extractJoinedRejectionMessage(data, SERVICIOS_EXTRAS_REJECTION_KEY) ??
    extractPlainDetalleMessage(data) ??
    firstRejectionMessage(data, REJECTION_KEYS);
  if (message) return message;
  if (!data || typeof data !== "object") return undefined;
  /* `pedido` es ambigua: la usa el rechazo por falta de cotización (string) y
   * también el bloque de errores de campo de la cabecera (objeto). Solo cuenta
   * como rechazo cuando trae un mensaje plano. */
  return firstDrfMessage((data as Record<string, unknown>).pedido);
};

/**
 * Errores de campo que el formulario sí puede pintar. Se descarta el de la
 * lista `servicios_extras` ENTERA (ruta exacta `servicios_extras`): ningún
 * control lo muestra —el formulario solo pinta `servicios_extras.N.<campo>`— y
 * dejarlo marcaría la sección y haría scroll hasta ella sin decir nada. Ese
 * mensaje ya llega completo en el toast. Los errores por servicio
 * (`servicios_extras.N.monto`, etc.) se conservan.
 */
export const pedidoMesaControlFieldIssues = (
  issues: QuoteValidationIssue[]
): QuoteValidationIssue[] =>
  issues.filter((issue) => issue.path !== SERVICIOS_EXTRAS_REJECTION_KEY);

import {
  extractDetalleRejectionMessage,
  extractHeaderNonFieldMessage,
  extractProcessCompatibilityMessage,
  extractQuoteValidationIssues,
  REQUIRED_COLOR_KEY,
  type QuoteValidationIssue,
} from "@/src/features/quotes/utils/quoteValidationErrors";
import {
  extractJoinedRejectionMessage,
  firstNonBlankRejectionMessage,
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
 *
 * Se lee COMPLETO con `extractJoinedRejectionMessage`, un servicio por línea
 * (el toast respeta los `\n`), y no a través de `REJECTION_KEYS`, que solo
 * toma el primer mensaje de cada clave.
 */
export const SERVICIOS_EXTRAS_REJECTION_KEY = "servicios_extras";

/**
 * Duración del toast cuando el rechazo trae VARIOS servicios: los ~4 s por
 * defecto de `<Toaster>` no alcanzan para leer una línea por servicio. Mismo
 * orden que los avisos de bloqueo de facturas de proveedor (9 s).
 */
export const SERVICIOS_EXTRAS_MULTI_TOAST_DURATION_MS = 9000;

/**
 * Claves de RECHAZO de `POST /ventas/pedidos/{id}/editar-mesa-control/` que se
 * leen por su PRIMER mensaje no vacío (`firstNonBlankRejectionMessage`): motivos que el usuario
 * no puede corregir en ningún campo del formulario y que por tanto tienen que
 * llegarle en el toast.
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
 *   borró), así que no hay nada que espejar. (`pedido` también es la clave de
 *   los errores de campo de la cabecera, ver abajo.)
 *
 * `detail` y `non_field_errors` cubren los genéricos de DRF, por si aparecen
 * (EC-795: hoy el endpoint no los emite; se cubre por defensa). El
 * `non_field_errors` anidado en la cabecera (`pedido.non_field_errors`) lo lee
 * `extractHeaderNonFieldMessage`.
 * NO se incluyen las claves de campo (`detalle.N.*`, `pedido.cliente`…): esas
 * ya las pinta `onValidationError` sobre el input correspondiente y repetirlas
 * en el toast sería ruido. Sí son rechazo `compatibilidad_proceso` (matriz
 * prenda/proceso, lista completa), `servicios_extras` (lista completa, ver
 * arriba) y `detalle` cuando trae mensajes —plano, p. ej. el tope de reflejante
 * «Del inventario», o en lista—: no los pinta ningún campo.
 * `color` (EC-641) va a los DOS lados: el toast muestra el mensaje del backend
 * con los nombres de producto, y `onValidationError` marca las partidas.
 */
const REJECTION_KEYS = [
  "permiso",
  "cotizacion",
  "detail",
  "non_field_errors",
  REQUIRED_COLOR_KEY,
  /* `pedido` es ambigua: la usa el rechazo por falta de cotización (string)
   * y también el bloque de errores de campo de la cabecera (objeto), que
   * `firstNonBlankRejectionMessage` no lee. Solo cuenta como rechazo cuando
   * trae un mensaje. */
  "pedido",
] as const;

/**
 * Claves que, con un mensaje (string o lista de strings), solo van al TOAST:
 * `extractQuoteValidationIssues` no las convierte en error de campo, porque
 * ningún control las pinta (marcaban el árbol y hacían scroll sin mostrar
 * nada). Son exactamente las que lee `extractRejection`, salvo `color`: el
 * formulario lo traduce a las partidas sin color (`getServerColorIssues`).
 * Como lista de objetos (`servicios_extras: [{monto: [...]}]`,
 * `detalle: [{...}]`) u objeto (`pedido: {...}`) siguen siendo errores de
 * campo. `non_field_errors` cubre también el anidado en `pedido`.
 */
const FORM_REJECTION_KEYS = [
  ...REJECTION_KEYS.filter((key) => key !== REQUIRED_COLOR_KEY),
  "detalle",
  SERVICIOS_EXTRAS_REJECTION_KEY,
];

export interface PedidoMesaControlRejectionToast {
  message: string;
  /** Solo cuando el mensaje es largo (varios servicios); si no, el de `<Toaster>`. */
  duration?: number;
}

export interface PedidoMesaControl400 {
  /** Errores de campo que el formulario pinta (van a `onValidationError`). */
  issues: QuoteValidationIssue[];
  /** Mensaje para el toast, o `undefined` si el 400 es solo de campos. */
  rejection?: PedidoMesaControlRejectionToast;
}

const extractRejection = (data: unknown): PedidoMesaControlRejectionToast | undefined => {
  const serviciosExtras = extractJoinedRejectionMessage(
    data,
    SERVICIOS_EXTRAS_REJECTION_KEY,
    "\n",
  );
  const message =
    extractProcessCompatibilityMessage(data) ??
    serviciosExtras ??
    extractDetalleRejectionMessage(data) ??
    firstNonBlankRejectionMessage(data, REJECTION_KEYS) ??
    extractHeaderNonFieldMessage(data);
  // Todos los lectores descartan los mensajes en blanco: nunca un toast vacío.
  if (!message) return undefined;
  return message === serviciosExtras && serviciosExtras.includes("\n")
    ? { message, duration: SERVICIOS_EXTRAS_MULTI_TOAST_DURATION_MS }
    : { message };
};

/**
 * Todo lo que `useUpdatePedidoMesaControl` hace con el cuerpo de un 400: los
 * errores de campo para el formulario y el mensaje de rechazo para el toast.
 * Es LA función que llama el hook, así que es la que prueban los tests.
 */
export const parsePedidoMesaControl400 = (data: unknown): PedidoMesaControl400 => ({
  issues: extractQuoteValidationIssues(data, { rejectionKeys: FORM_REJECTION_KEYS }),
  rejection: extractRejection(data),
});

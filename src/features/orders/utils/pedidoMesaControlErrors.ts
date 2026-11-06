import {
  extractDetalleRejectionMessage,
  extractProcessCompatibilityMessage,
  extractQuoteValidationIssues,
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
 * leen por su PRIMER mensaje (`firstRejectionMessage`): motivos que el usuario
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
 *   borró), así que no hay nada que espejar. (`pedido` se lee aparte: también
 *   es la clave de los errores de campo de la cabecera.)
 *
 * `detail` y `non_field_errors` cubren los genéricos de DRF, por si aparecen
 * (EC-795: hoy el endpoint no emite `non_field_errors`; se cubre por defensa).
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
] as const;

/**
 * Rutas de error que solo van al TOAST: las claves de rechazo de primer nivel
 * que ningún control del formulario pinta. Un error de campo en una de ellas
 * marcaba el árbol y hacía scroll sin mostrar nada; se descartan porque
 * `extractRejection` ya las lee para el toast.
 *
 * `extractQuoteValidationIssues` ya no entrega las suyas cuando traen un
 * mensaje (string o lista); aquí quedan explícitas, junto con
 * `servicios_extras`, que esa función no conoce como rechazo.
 *
 * Queda FUERA `color`: el formulario lo traduce a las partidas sin color
 * (`getServerColorIssues`). `compatibilidad_proceso` ya lo descarta el propio
 * extractor.
 */
const TOAST_ONLY_PATHS: ReadonlySet<string> = new Set([
  "permiso",
  "cotizacion",
  "detail",
  "non_field_errors",
  "detalle",
  "pedido",
  SERVICIOS_EXTRAS_REJECTION_KEY,
]);

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
    firstRejectionMessage(data, REJECTION_KEYS) ??
    /* `pedido` es ambigua: la usa el rechazo por falta de cotización (string)
     * y también el bloque de errores de campo de la cabecera (objeto). Solo
     * cuenta como rechazo cuando trae un mensaje plano. */
    (data && typeof data === "object"
      ? firstDrfMessage((data as Record<string, unknown>).pedido)
      : undefined);
  // `firstDrfMessage` acepta un string de solo espacios: nunca un toast en blanco.
  if (!message?.trim()) return undefined;
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
  issues: extractQuoteValidationIssues(data).filter(
    (issue) => !TOAST_ONLY_PATHS.has(issue.path),
  ),
  rejection: extractRejection(data),
});

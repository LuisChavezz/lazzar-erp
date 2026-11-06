/**
 * Utilidades para parsear y normalizar errores de validación 400
 * provenientes del backend de cotizaciones.
 *
 * El backend puede devolver errores bajo rutas como `cotizacion.persona_pagos`
 * o `detalle.0.tallas.0.cantidad`, que no coinciden con los nombres de campo
 * del formulario. Este módulo traduce esas rutas al espacio de nombres del
 * formulario para que el mecanismo de scroll/focus pueda localizar el campo.
 */

import {
  extractJoinedRejectionMessage,
  firstNonBlankDrfMessage,
  firstNonBlankRejectionMessage,
} from "@/src/utils/firstDrfMessage";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface QuoteValidationIssue {
  /** Ruta del campo en el formulario (ej. `persona_pagos`, `items.0.precio`). */
  path: string;
  /** Primer mensaje de error de la lista devuelta por el backend. */
  message: string;
}

// ─── Mapa de rutas: backend → formulario ──────────────────────────────────────

/**
 * Traduce claves planas del payload de cotización a los nombres de campo
 * que usa el formulario. Solo se incluyen los casos que difieren entre
 * el nombre del campo en el servidor y el nombre en el formulario.
 */
const QUOTE_SERVER_FIELD_PATH_MAP: Record<string, string> = {
  monto: "condicionPagoMonto",
  cliente_razon_social: "razonSocial",
  cliente_nombre: "clienteNombre",
  cliente_rfc: "rfc",
  cliente_regimen_fiscal: "regimenFiscal",
  cliente_direccion_fiscal: "direccionFiscal",
  cliente_colonia: "coloniaFiscal",
  cliente_codigo_postal: "codigoPostalFiscal",
  cliente_ciudad: "ciudadFiscal",
  cliente_estado: "estadoFiscal",
  empresa_envio: "empresaEnvio",
  telefono_envio: "telefonoEnvio",
  celular_envio: "celularEnvio",
  direccion_envio: "direccionEnvio",
  colonia_envio: "coloniaEnvio",
  codigo_postal: "codigoPostalEnvio",
  ciudad_envio: "ciudadEnvio",
  estado_envio: "estadoEnvio",
  referencias: "referenciasEnvio",
};

// ─── Funciones de normalización ────────────────────────────────────────────────

/**
 * Convierte una ruta de error del backend al nombre de campo del formulario.
 *
 * Pasos:
 * 1. Convierte notación de array (`[0]`) a dot notation (`.0`).
 * 2. Elimina los prefijos de raíz del payload (`cotizacion.`, `pedido.`).
 * 3. Busca coincidencia directa en el mapa de aliases.
 * 4. Si no hay alias, aplica reemplazos para rutas anidadas de `detalle`.
 */
export const normalizeQuoteValidationPath = (rawPath: string): string => {
  const normalizedPath = rawPath
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^(cotizacion|pedido)\./, "");

  const directMatch = QUOTE_SERVER_FIELD_PATH_MAP[normalizedPath];
  if (directMatch) {
    return directMatch;
  }

  return normalizedPath
    .replace(/^detalle\.(\d+)\.producto$/, "items.$1.productoId")
    .replace(/^detalle\.(\d+)\.precio_unitario$/, "items.$1.precio")
    .replace(/^detalle\.(\d+)\.color_id$/, "items.$1.colorId")
    .replace(/^detalle\.(\d+)\.tallas\.(\d+)\.talla$/, "items.$1.tallas.$2.tallaId")
    .replace(/^detalle\.(\d+)\.tallas\.(\d+)\.cantidad$/, "items.$1.tallas.$2.cantidad");
};

/**
 * Claves de cabecera del documento: como OBJETO traen los errores de campo de
 * la cabecera (`pedido.*` en Mesa de Control, `cotizacion.*` en Cotizaciones).
 */
const HEADER_KEYS: ReadonlySet<string> = new Set(["pedido", "cotizacion"]);

const NON_FIELD_ERRORS_KEY = "non_field_errors";

/**
 * ¿Un string o una lista SOLO de mensajes? Una lista con objetos es la de
 * errores por renglón (`detalle: [{...}]`, `servicios_extras: [{...}]`).
 */
const isRejectionMessage = (value: unknown): boolean =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export interface QuoteValidationIssuesOptions {
  /**
   * Claves de primer nivel que el TOAST del llamador lee como rechazo: cuando
   * traen un mensaje (string o lista de strings) no son un error de campo,
   * porque ningún control las pinta (marcaban el árbol y hacían scroll sin
   * mostrar nada). Como lista de objetos u objeto se recorren como siempre.
   * Si incluye `non_field_errors`, también descarta el `non_field_errors`
   * anidado en la cabecera (`pedido.non_field_errors`), que el llamador lee
   * con `extractHeaderNonFieldMessage`.
   *
   * Cada flujo pasa LAS SUYAS, las mismas que lee su toast: una clave que se
   * descartara aquí sin que el toast la leyera se perdería en los dos lados.
   */
  rejectionKeys?: readonly string[];
}

/**
 * Extrae del cuerpo 400 los errores de campo como una lista plana de
 * `QuoteValidationIssue`, con la ruta del formulario.
 *
 * El backend puede devolver errores como:
 * - `{ persona_pagos: ["Este campo no puede estar en blanco."] }`
 * - `{ cotizacion: { persona_pagos: ["..."] } }`
 * - `{ detalle: [{ tallas: [{ cantidad: ["..."] }] }] }`
 * - `{ pedido: { telefono_pagos: "..." } }` (string suelto, en cualquier nivel;
 *   el backend desplegado manda así los de primer nivel, p. ej. `{"color": "..."}`)
 *
 * `compatibilidad_proceso` es siempre un RECHAZO (va al toast entero, ver
 * `extractProcessCompatibilityMessage`), no un error de un campo. Un cuerpo
 * que no es objeto (`["Mensaje."]`, el `ValidationError("...")` suelto de una
 * vista) no trae rutas de campo: ningún issue.
 */
export const extractQuoteValidationIssues = (
  source: unknown,
  { rejectionKeys = [] }: QuoteValidationIssuesOptions = {}
): QuoteValidationIssue[] => {
  if (!isPlainObject(source)) return [];
  const rejections = new Set(rejectionKeys);
  const dropHeaderNonField = rejections.has(NON_FIELD_ERRORS_KEY);

  return Object.entries(source)
    .filter(([key]) => key !== PROCESS_COMPATIBILITY_KEY)
    .filter(([key, value]) => !(rejections.has(key) && isRejectionMessage(value)))
    .flatMap(([key, value]) => {
      if (dropHeaderNonField && HEADER_KEYS.has(key) && isPlainObject(value)) {
        return Object.entries(value)
          .filter(([field]) => field !== NON_FIELD_ERRORS_KEY)
          .flatMap(([field, error]) => collectIssues(error, [key, field]));
      }
      return collectIssues(value, [key]);
    });
};

/** Recorrido recursivo bajo una clave de primer nivel. */
const collectIssues = (
  source: unknown,
  path: Array<string | number>
): QuoteValidationIssue[] => {
  if (Array.isArray(source)) {
    const stringMessages = source.filter((item): item is string => typeof item === "string");

    // Los objetos de la lista (errores por renglón) se recorren aunque la lista
    // también traiga un mensaje suelto: no se pierden los de un renglón.
    const itemIssues = source.flatMap((item, index) =>
      typeof item === "string" ? [] : collectIssues(item, [...path, index])
    );
    return stringMessages.length > 0
      ? [
          {
            path: normalizeQuoteValidationPath(path.map(String).join(".")),
            message: stringMessages[0],
          },
          ...itemIssues,
        ]
      : itemIssues;
  }

  if (isPlainObject(source)) {
    return Object.entries(source).flatMap(([key, value]) =>
      collectIssues(value, [...path, key])
    );
  }

  // String suelto: mismo trato que una lista con un mensaje (EC-795).
  if (typeof source === "string" && source) {
    return [{ path: normalizeQuoteValidationPath(path.map(String).join(".")), message: source }];
  }

  return [];
};

/**
 * Primer mensaje no vacío del `non_field_errors` anidado en la cabecera
 * (`{"pedido": {"non_field_errors": [...]}}`, el error de un `validate()` del
 * serializer de cabecera): un rechazo del documento, no de un campo.
 */
export const extractHeaderNonFieldMessage = (data: unknown): string | undefined => {
  if (!isPlainObject(data)) return undefined;
  for (const key of HEADER_KEYS) {
    const header = data[key];
    const message = isPlainObject(header)
      ? firstNonBlankDrfMessage(header[NON_FIELD_ERRORS_KEY])
      : undefined;
    if (message) return message;
  }
  return undefined;
};

// ─── Mensaje de rechazo ────────────────────────────────────────────────────────

/**
 * Color obligatorio con variantes (EC-641, `exigir_color_si_hay_variantes`):
 * `400 {"color": "Elige el color de: A, B."}` en enviar a revisión,
 * autorizar, aceptar cambios y editar en mesa de control. El backend
 * desplegado lo manda como string suelto (verificado en vivo el 2026-10-29),
 * aunque el test del PR lo lea como lista: se aceptan las dos. Llega en el PRIMER
 * nivel, sin índice de partida —solo nombres de producto—, así que
 * `extractQuoteValidationIssues` lo entrega con la ruta `color` tal cual y es el
 * formulario quien la traduce a las partidas culpables, calculadas con
 * `getMissingColorLines` y nunca leyendo los nombres del mensaje.
 */
export const REQUIRED_COLOR_KEY = "color";

/**
 * Rechazo de la matriz prenda/proceso (EC-575): una LISTA de mensajes, uno por
 * categoría y proceso que no se admite. Lo devuelven el guardado de la
 * cotización y del pedido, enviar a revisión, autorizar, aceptar cambios y
 * programar.
 */
const PROCESS_COMPATIBILITY_KEY = "compatibilidad_proceso";

/** Todos los mensajes de `compatibilidad_proceso`, unidos; `undefined` si no viene. */
export const extractProcessCompatibilityMessage = (data: unknown): string | undefined =>
  extractJoinedRejectionMessage(data, PROCESS_COMPATIBILITY_KEY);

/**
 * `detalle` como RECHAZO: un mensaje plano (`{"detalle": "Partida N: ..."}`,
 * p. ej. el tope de reflejante «Del inventario») o una lista de mensajes
 * (`{"detalle": ["Este campo es requerido."]}`, el error de la lista entera,
 * que ningún renglón pinta) (EC-795). Devuelve el primer mensaje que no esté
 * en blanco. Una lista de OBJETOS es la de errores por renglón, que reporta
 * `extractQuoteValidationIssues`, y aquí no da nada.
 */
export const extractDetalleRejectionMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return firstNonBlankDrfMessage((data as Record<string, unknown>).detalle);
};

/**
 * Claves de RECHAZO del alta/edición de cotización
 * (`POST /ventas/cotizaciones/onboarding/`): motivos que no corresponden a
 * ningún campo del formulario y por eso van al toast. Mismo criterio que
 * `useUpdatePedidoMesaControl`.
 *
 * - `detalle`: los `ValidationError({"detalle": "..."})` que levanta
 *   `_save_cotizacion_detalle` al resolver las FK de un renglón (producto,
 *   color, categoría de producto o dirección inválidos). Llega como mensaje
 *   PLANO, sin índice de renglón, así que no hay input sobre el cual pintarlo.
 * - `detail` / `non_field_errors`: los genéricos de DRF.
 * - `cotizacion_id`: la cotización no existe, no es del usuario o ya salió de
 *   la ventana de edición tras autorizarse (`_exigir_acceso_cotizacion_onboarding`).
 * - `empresa`: el usuario no tiene empresa asignada.
 * - `cotizacion`: "Datos inválidos." como mensaje (como objeto son los errores
 *   de campo de la cabecera, que `firstNonBlankRejectionMessage` no lee).
 *
 * `detalle` NO está en la lista: se trata aparte porque solo cuenta como
 * rechazo cuando trae mensajes, no objetos por renglón (ver
 * `extractDetalleRejectionMessage`). Lo mismo `compatibilidad_proceso`, cuya
 * lista se muestra completa.
 */
const QUOTE_REJECTION_KEYS = [
  "detail",
  "non_field_errors",
  "cotizacion_id",
  "empresa",
  "cotizacion",
] as const;

/**
 * Primer mensaje de rechazo del cuerpo 400, o `undefined` si el 400 es solo de
 * validación de campos.
 *
 * `detalle` es ambigua: además del rechazo, es la clave del campo lista del
 * serializer. Como arreglo de OBJETOS por renglón (`detalle: [{ tallas: [...] }]`)
 * son errores de campo y los reporta `extractQuoteValidationIssues`; como
 * mensaje —plano o en lista— va al toast.
 */
export const extractQuoteRejectionMessage = (data: unknown): string | undefined =>
  extractProcessCompatibilityMessage(data) ??
  extractDetalleRejectionMessage(data) ??
  firstNonBlankRejectionMessage(data, QUOTE_REJECTION_KEYS) ??
  extractHeaderNonFieldMessage(data);

/**
 * Errores de campo del 400 del alta/edición de cotización: descarta
 * exactamente lo que lee `extractQuoteRejectionMessage` para el toast.
 */
export const extractQuoteFormIssues = (data: unknown): QuoteValidationIssue[] =>
  extractQuoteValidationIssues(data, { rejectionKeys: [...QUOTE_REJECTION_KEYS, "detalle"] });

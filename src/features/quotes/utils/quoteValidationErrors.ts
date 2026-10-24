/**
 * Utilidades para parsear y normalizar errores de validación 400
 * provenientes del backend de cotizaciones.
 *
 * El backend puede devolver errores bajo rutas como `cotizacion.persona_pagos`
 * o `detalle.0.tallas.0.cantidad`, que no coinciden con los nombres de campo
 * del formulario. Este módulo traduce esas rutas al espacio de nombres del
 * formulario para que el mecanismo de scroll/focus pueda localizar el campo.
 */

import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";

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
 * Recorre recursivamente el objeto de errores del backend y extrae todos
 * los mensajes como una lista plana de `QuoteValidationIssue`.
 *
 * El backend puede devolver errores como:
 * - `{ persona_pagos: ["Este campo no puede estar en blanco."] }`
 * - `{ cotizacion: { persona_pagos: ["..."] } }`
 * - `{ detalle: [{ tallas: [{ cantidad: ["..."] }] }] }`
 */
export const extractQuoteValidationIssues = (
  source: unknown,
  path: Array<string | number> = []
): QuoteValidationIssue[] => {
  // `compatibilidad_proceso` es un RECHAZO (va al toast entero, ver
  // `extractProcessCompatibilityMessage`), no un error de un campo.
  if (path.length === 0 && source && typeof source === "object" && !Array.isArray(source)) {
    return Object.entries(source as Record<string, unknown>)
      .filter(([key]) => key !== PROCESS_COMPATIBILITY_KEY)
      .flatMap(([key, value]) => extractQuoteValidationIssues(value, [key]));
  }

  if (Array.isArray(source)) {
    const stringMessages = source.filter((item): item is string => typeof item === "string");

    if (stringMessages.length > 0 && path.length > 0) {
      return [
        {
          path: normalizeQuoteValidationPath(path.map(String).join(".")),
          message: stringMessages[0],
        },
      ];
    }

    return source.flatMap((item, index) =>
      extractQuoteValidationIssues(item, [...path, index])
    );
  }

  if (source && typeof source === "object") {
    return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) =>
      extractQuoteValidationIssues(value, [...path, key])
    );
  }

  return [];
};

// ─── Mensaje de rechazo ────────────────────────────────────────────────────────

/**
 * Rechazo de la matriz prenda/proceso (EC-575): una LISTA de mensajes, uno por
 * categoría y proceso que no se admite. Lo devuelven el guardado de la
 * cotización y del pedido, enviar a revisión, autorizar, aceptar cambios y
 * programar.
 */
const PROCESS_COMPATIBILITY_KEY = "compatibilidad_proceso";

/** Todos los mensajes de `compatibilidad_proceso`, unidos; `undefined` si no viene. */
export const extractProcessCompatibilityMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const value = (data as Record<string, unknown>)[PROCESS_COMPATIBILITY_KEY];
  const messages = (Array.isArray(value) ? value : [value]).filter(
    (message): message is string => typeof message === "string" && message.trim().length > 0
  );
  return messages.length > 0 ? messages.join(" ") : undefined;
};

/**
 * `detalle` como RECHAZO plano (`{"detalle": "Partida N: ..."}`, p. ej. el tope
 * de reflejante «Del inventario»). Como arreglo es la lista de errores por
 * renglón, que ya reporta `extractQuoteValidationIssues`.
 */
export const extractPlainDetalleMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const { detalle } = data as Record<string, unknown>;
  return typeof detalle === "string" && detalle.length > 0 ? detalle : undefined;
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
 *
 * `detalle` NO está en la lista: se trata aparte porque solo cuenta como
 * rechazo cuando es un string plano (ver `extractPlainDetalleMessage`). Lo
 * mismo `compatibilidad_proceso`, cuya lista se muestra completa.
 */
const QUOTE_REJECTION_KEYS = ["detail", "non_field_errors"] as const;

/**
 * Primer mensaje de rechazo del cuerpo 400, o `undefined` si el 400 es solo de
 * validación de campos.
 *
 * `detalle` es ambigua: además del rechazo plano, es la clave del campo lista
 * del serializer, que llega como ARREGLO — de objetos por renglón
 * (`detalle: [{ tallas: [...] }]`) o de strings cuando el error es de la lista
 * entera (`detalle: ["Esta lista no puede estar vacía."]`). Esos son errores
 * de campo y ya los reporta `extractQuoteValidationIssues`; al toast solo va
 * el string plano.
 */
export const extractQuoteRejectionMessage = (data: unknown): string | undefined =>
  extractProcessCompatibilityMessage(data) ??
  extractPlainDetalleMessage(data) ??
  firstRejectionMessage(data, QUOTE_REJECTION_KEYS);

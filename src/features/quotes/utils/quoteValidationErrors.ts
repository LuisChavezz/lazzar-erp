/**
 * Utilidades para parsear y normalizar errores de validación 400
 * provenientes del backend de cotizaciones.
 *
 * El backend puede devolver errores bajo rutas como `cotizacion.persona_pagos`
 * o `detalle.0.tallas.0.cantidad`, que no coinciden con los nombres de campo
 * del formulario. Este módulo traduce esas rutas al espacio de nombres del
 * formulario para que el mecanismo de scroll/focus pueda localizar el campo.
 */

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
  cliente_giro_empresarial: "giroEmpresa",
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

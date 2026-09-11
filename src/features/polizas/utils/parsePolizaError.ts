import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/** Campos de CABECERA que el backend puede señalar en un `400`. */
export type PolizaHeaderErrorField =
  | "sucursal"
  | "centro_costo"
  | "folio"
  | "tipo"
  | "concepto";

/**
 * Error de póliza, normalizado desde el contrato del backend a una forma que el
 * formulario puede pintar de tres maneras:
 *  - `formError`   → banner de "todo o nada" (detail / non_field_errors / el
 *                    descuadre / los errores de parentesco de línea, que NO
 *                    vienen indexados).
 *  - `fieldErrors` → error bajo un campo de cabecera.
 *  - `lineErrors`  → error por movimiento, indexado por posición; la clave
 *                    `_form` guarda un error de línea no atribuible a un campo.
 * `messages` es la lista plana para el toast.
 */
export interface ParsedPolizaError {
  formError?: string;
  fieldErrors: Partial<Record<PolizaHeaderErrorField, string>>;
  lineErrors: Record<number, Record<string, string>>;
  messages: string[];
}

const HEADER_FIELDS: PolizaHeaderErrorField[] = [
  "sucursal",
  "centro_costo",
  "folio",
  "tipo",
  "concepto",
];

/**
 * `true` si el arreglo de `poliza_detalles` NO viene indexado por línea.
 *
 * DRF, al validar un `many=True` anidado, devuelve una lista ALINEADA POR ÍNDICE
 * con un objeto por renglón (`{}` para los válidos). En cambio
 * `raise ValidationError({"poliza_detalles": "..."})` —que es como llegan el
 * descuadre de `PolizaService.validar_suma_cero` y cualquier otro error de
 * negocio del servicio— produce una lista de STRINGS que habla de la póliza
 * ENTERA, no de su primer renglón.
 *
 * Sin esta distinción, "La suma de cargos (100.00) debe ser igual a la suma de
 * abonos (90.00)" se pintaría bajo el movimiento 1 —un renglón probablemente
 * correcto— y el usuario buscaría el problema donde no está.
 */
const esErrorDeArregloCompleto = (entries: unknown[]): boolean =>
  entries.length > 0 &&
  entries.every((entry) => entry === null || typeof entry === "string");

/**
 * Normaliza el error de las operaciones de póliza (alta, contabilizar,
 * cancelar).
 *
 * Puerto de `parseNotaCreditoError` al contrato de pólizas. Se usa también en
 * las dos ACCIONES —y no `extractErrorMessage`— porque sus rechazos llegan en la
 * forma de DRF (`{"campo": ["mensaje"]}`), que `extractErrorMessage` (que solo
 * lee `{ error: string }`) no sabe desenvolver: dejaría al usuario con un
 * "Request failed with status code 400" en vez del motivo real.
 *
 * ─── LAS DOS LLAVES PLANAS QUE HABLAN DE UNA LÍNEA ───────────────────────────
 *
 * `PolizaViewSet.perform_create` valida la empresa de cada FK de cada renglón
 * FUERA del serializer (`_validate_related_parent_empresa`), y lanza
 * `ValidationError({"cuenta_contable": [...]})` o
 * `({"centro_costo": [...]})`. Esas llaves llegan en la RAÍZ del cuerpo, planas
 * y SIN índice: aunque el mensaje hable de un movimiento concreto, el 400 no
 * dice cuál.
 *
 *  - `cuenta_contable` NO existe como campo de cabecera, así que no tiene dónde
 *    pintarse salvo el banner. Atribuirlo al movimiento 0 —o a cualquier otro—
 *    señalaría un renglón posiblemente correcto.
 *  - `centro_costo` SÍ existe en la cabecera (y también puede venir de ahí, vía
 *    `PolizaSerializer.validate` o `_validate_fk_empresa`). Se pinta en el campo
 *    de cabecera Y se refuerza en el banner, avisando de que puede referirse al
 *    de un movimiento: es la única forma de no esconder la mitad de los casos.
 *
 * Siempre devuelve un objeto (nunca `null`): ante un error inesperado deja un
 * `formError` genérico para que el banner de "todo o nada" siempre aparezca.
 */
export function parsePolizaError(
  error: unknown,
  fallback = "Error al registrar la póliza.",
): ParsedPolizaError {
  const result: ParsedPolizaError = {
    fieldErrors: {},
    lineErrors: {},
    messages: [],
  };

  const pushLineError = (index: number, field: string, message: string) => {
    if (!result.lineErrors[index]) result.lineErrors[index] = {};
    result.lineErrors[index][field] = message;
    result.messages.push(`Movimiento ${index + 1}: ${message}`);
  };

  const pushFormError = (message: string) => {
    result.formError = result.formError ?? message;
    result.messages.push(message);
  };

  if (!(error instanceof AxiosError)) {
    result.formError = fallback;
    return result;
  }

  const data = error.response?.data;

  // Respuesta en texto plano (p. ej. un 500 con string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return result;
  }

  // Cuerpo de error como lista de nivel superior — la forma que produce DRF con
  // `raise ValidationError("...")`.
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = fallback;
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || fallback;
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Errores a nivel operación (todo o nada) ──────────────────────────────
  const detail = firstDrfMessage(record.detail);
  if (detail) pushFormError(detail);

  const nonField = firstDrfMessage(record.non_field_errors);
  if (nonField) pushFormError(nonField);

  // `estatus` no es un campo de esta interfaz —el alta lo fija en "Borrador" y
  // las acciones no lo reciben—, pero el backend lo usa para rechazar
  // "No se puede contabilizar una póliza cancelada". Va al banner.
  const estatus = firstDrfMessage(record.estatus);
  if (estatus) pushFormError(estatus);

  // `empresa` solo puede llegar si el usuario es superusuario (el resto de
  // usuarios ni siquiera puede escribirla). No hay campo donde pintarla.
  const empresa = firstDrfMessage(record.empresa);
  if (empresa) pushFormError(empresa);

  // ── Parentesco de línea: plano, sin índice → nivel formulario ────────────
  // Ver la nota del docstring. Se resuelve ANTES que los campos de cabecera para
  // que su mensaje gane el banner, y nunca se enruta a un movimiento concreto.
  const cuentaContable = firstDrfMessage(record.cuenta_contable);
  if (cuentaContable) {
    pushFormError(
      `${cuentaContable} Revisa las cuentas contables de los movimientos.`,
    );
  }

  const centroCosto = firstDrfMessage(record.centro_costo);
  if (centroCosto) {
    // El mismo mensaje puede venir de la cabecera o de un movimiento: se pinta
    // en el campo de cabecera y se avisa en el banner de la otra posibilidad.
    pushFormError(
      `${centroCosto} Puede ser el centro de costo de la póliza o el de alguno de sus movimientos.`,
    );
  }

  // ── Errores de cabecera ──────────────────────────────────────────────────
  for (const field of HEADER_FIELDS) {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      // `centro_costo` ya entró a `messages` arriba, con la aclaración de que
      // puede ser el de un movimiento. Empujarlo otra vez aquí repetía la misma
      // frase en el toast; el campo de cabecera se sigue marcando igual.
      if (field !== "centro_costo") result.messages.push(message);
    }
  }

  // ── Errores del detalle (array) ──────────────────────────────────────────
  const detalles = record.poliza_detalles;

  if (typeof detalles === "string" && detalles.length > 0) {
    // Un solo mensaje para todo el arreglo.
    pushFormError(detalles);
  } else if (Array.isArray(detalles)) {
    if (esErrorDeArregloCompleto(detalles)) {
      // Lista de strings: habla de la póliza entera (el descuadre), no de sus
      // renglones. Ver `esErrorDeArregloCompleto`.
      detalles.forEach((entry) => {
        const message = firstDrfMessage(entry);
        if (message) pushFormError(message);
      });
    } else {
      detalles.forEach((entry, index) => {
        if (!entry) return;
        const entryMessage = firstDrfMessage(entry);
        if (entryMessage) {
          // Elemento string o string[] dentro de una lista indexada → error a
          // nivel de ese movimiento.
          pushLineError(index, "_form", entryMessage);
          return;
        }
        if (typeof entry === "object") {
          Object.entries(entry as Record<string, unknown>).forEach(
            ([lineField, lineValue]) => {
              const message = firstDrfMessage(lineValue);
              if (!message) return;
              const field = lineField === "non_field_errors" ? "_form" : lineField;
              pushLineError(index, field, message);
            },
          );
        }
      });
    }
  } else if (detalles && typeof detalles === "object") {
    // Dict: `non_field_errors` o claves numéricas por índice.
    Object.entries(detalles as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "non_field_errors") {
        const message = firstDrfMessage(value);
        if (message) pushFormError(message);
        return;
      }
      const index = Number(key);
      if (!Number.isInteger(index) || !value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(
        ([lineField, lineValue]) => {
          const message = firstDrfMessage(lineValue);
          if (!message) return;
          const field = lineField === "non_field_errors" ? "_form" : lineField;
          pushLineError(index, field, message);
        },
      );
    });
  }

  // Fallback: cualquier otra clave desconocida contribuye al toast.
  if (result.messages.length === 0) {
    Object.entries(record).forEach(([key, value]) => {
      if (key === "poliza_detalles") return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    if (result.messages.length === 0) {
      result.formError = `Error de validación. ${fallback}`;
    }
  }

  // Garantía final: si no hubo error de operación ni de campo/línea pero sí un
  // mensaje suelto, se usa como motivo del banner persistente (nunca se deja el
  // motivo real solo en el toast efímero).
  if (
    !result.formError &&
    Object.keys(result.fieldErrors).length === 0 &&
    Object.keys(result.lineErrors).length === 0 &&
    result.messages.length > 0
  ) {
    result.formError = result.messages[0];
  }

  return result;
}

/** Texto de una sola línea para el toast, a partir del error ya normalizado. */
export const polizaErrorToastMessage = (
  parsed: ParsedPolizaError,
  fallback: string,
): string =>
  parsed.messages.length > 0
    ? parsed.messages.join("\n")
    : parsed.formError ?? fallback;

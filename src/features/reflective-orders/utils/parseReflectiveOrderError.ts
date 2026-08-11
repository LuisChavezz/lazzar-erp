import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/** Campos del formulario a los que el backend puede atribuir un `400`. */
export type ReflectiveOrderErrorField = "pedido" | "prioridad" | "observaciones";

const FORM_FIELDS: ReflectiveOrderErrorField[] = [
  "pedido",
  "prioridad",
  "observaciones",
];

/** La orden de reflejante activa ya existente, tal cual la reporta el 409. */
export interface ReflectiveDuplicateExistingOrder {
  id: number;
  folio: string;
  pedido: number;
  estado: string;
}

/**
 * Error de alta de orden de reflejante, normalizado a una forma que el
 * formulario puede pintar de tres maneras:
 *  - `fieldErrors` → error debajo del campo correspondiente (forma C).
 *  - `duplicate`   → bloque informativo con la orden ya existente (forma D,
 *                    409). Cuando está presente, `formError`/`messages` llevan
 *                    el MISMO mensaje (`duplicate.message`) para que un
 *                    consumidor que todavía no distingue esta forma —el toast
 *                    de la mutación— siga mostrando el texto correcto sin tener
 *                    que leer `duplicate` explícitamente.
 *  - `formError`   → banner de "no se creó nada" (formas A y B, y cualquier
 *                    cosa inesperada).
 * `messages` es la lista plana para el toast.
 *
 * NO es una unión discriminada por `kind`: las cuatro formas (A/B/C/D) son
 * ramas de PARSEO que rellenan este mismo objeto plano, no variantes de un
 * tipo. `duplicate` es un campo ADICIONAL opcional —su sola presencia ya
 * discrimina el caso—. Mismo diseño que `ParsedEmbroideryOrderError`.
 */
export interface ParsedReflectiveOrderError {
  formError?: string;
  fieldErrors: Partial<Record<ReflectiveOrderErrorField, string>>;
  messages: string[];
  duplicate?: {
    message: string;
    existingOrder: ReflectiveDuplicateExistingOrder;
  };
  /**
   * Diagnóstico línea por línea del `400` de exceso (`detalles_exceso`), tal
   * cual lo arma el backend. Son STRINGS ya formateados —no objetos—, del tipo:
   *
   *   `  - talla_id=3 pedido_detalle_id=12: pedido=10.0, ya_asignado=4.0,
   *      solicitado=8.0, disponible_restante=6.0`
   *
   * y, en el segundo corte, la variante `pedido_detalle_id=12 (total del
   * renglón)`. Se conservan sin parsear a propósito: su formato es un texto de
   * depuración del backend, no un contrato estructurado del que se pueda
   * depender para reconstruir campos.
   *
   * OJO — a diferencia del 409, aquí NO hay ids serializados como string: estos
   * renglones nacen de f-strings dentro de un `ValidationError`, no del `detail`
   * de una `APIException` (que es lo que hace que DRF convierta recursivamente
   * cada valor a `ErrorDetail`). Da igual para este código, que los pinta tal
   * cual y nunca compara ids contra ellos, pero conviene no extender aquí la
   * salvedad del duplicado.
   *
   * Campo ADICIONAL opcional, igual que `duplicate`: su sola presencia
   * discrimina el caso sin obligar a los consumidores existentes a bifurcar.
   */
  excessLines?: string[];
}

export const REFLECTIVE_ORDER_GENERIC_ERROR =
  "No se pudo crear la orden de reflejante.";

/**
 * Lee `detalles_exceso`: un ARREGLO de strings ya formateados, uno por línea
 * que excede su saldo. Se recorre entrada por entrada (en vez de usar
 * `firstDrfMessage` sobre el arreglo completo, que devolvería solo la primera)
 * porque el usuario necesita ver TODAS las líneas que tiene que bajar, no una.
 * Devuelve `undefined` si no hay nada utilizable, para que la presencia del
 * campo siga siendo el discriminante del caso.
 */
function readExcessLines(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const lines = value
    .map((entry) => firstDrfMessage(entry)?.trim())
    .filter((message): message is string => Boolean(message));
  return lines.length > 0 ? lines : undefined;
}

/**
 * Normaliza el error de `POST /produccion/orden-reflejante/onboarding/`.
 *
 * Vive aparte del hook (y no dentro de él) porque es una función PURA sin
 * dependencias de React: así puede ejercitarse directamente contra las cinco
 * formas del contrato sin montar la mutación. El hook la re-exporta para que el
 * punto de importación siga siendo el mismo.
 *
 * El backend rechaza en CINCO formas distintas, todas confirmadas leyendo
 * `OrdenReflejanteService`, `OrdenReflejanteSerializer.validate` y el `ViewSet`
 * en el checkout de `nucleo-erp`:
 *
 *  A. ARREGLO PLANO a nivel raíz — `ValidationError("mensaje")` de
 *     `_validar_contexto`, que DRF envuelve en lista:
 *     `["El pedido no pertenece a la empresa del usuario."]`. También:
 *     "El usuario no tiene una empresa asignada." y "No tiene acceso a la
 *     sucursal del pedido para generar la orden de reflejante.".
 *
 *  B. OBJETO CON CLAVE `err` — `ValidationError({"err": "mensaje"})` del
 *     service: `{"err": "El pedido no tiene detalles con reflejante para
 *     generar la orden."}` y `{"err": "El usuario no tiene una sucursal
 *     asignada."}`. `err` NO es una convención de DRF ni un campo del
 *     formulario: es una clave inventada por el backend, así que su mensaje va
 *     al banner, nunca debajo de un input.
 *
 *  C. OBJETO POR CAMPO (DRF estándar) — de
 *     `serializer.is_valid(raise_exception=True)`:
 *     `{"pedido": ["Este campo es requerido."]}`. Es la única forma atribuible
 *     a un input concreto.
 *
 *  D. 409 DUPLICADO — `OrdenReflejanteDuplicada409` (subclase de
 *     `APIException`, NO `ValidationError`), por dos vías: el chequeo previo
 *     `buscar_existente_full_match` y, ante una carrera, la traducción del
 *     `IntegrityError` de la constraint `uq_orden_reflejante_activa_por_pedido`
 *     en `crear_orden_con_guardia_duplicado`. Ambas arman el payload con el
 *     MISMO builder compartido (`produccion/services/common.py::payload_duplicada`):
 *     `{"err": "Ya existe una orden de reflejante activa para este pedido con
 *     el 100% de las prendas...", "orden_reflejante_existente": {"id": "44",
 *     "folio": "2026-OR-00001", "pedido": "100", "estado": "Pendiente"}}`.
 *
 *     La clave `orden_reflejante_existente` está VERIFICADA en
 *     `OrdenReflejanteService._payload_duplicada` (`payload_key=
 *     "orden_reflejante_existente"`), no deducida por analogía con bordado: el
 *     builder es compartido pero la clave la pasa cada service.
 *
 *     Estructuralmente es la forma B MÁS `orden_reflejante_existente` — se
 *     revisa ANTES de B para no perder ese dato extra.
 *
 *     Dos particularidades heredadas del builder compartido:
 *      - `id` y `pedido` llegan como STRING (`"44"`, no `44`): DRF convierte
 *        recursivamente cualquier valor dentro del `detail` de una
 *        `APIException` a `ErrorDetail` (subclase de `str`), sin importar el
 *        tipo original (`existente.id`/`existente.pedido_id` son `int` en el
 *        modelo). Se castean con `Number(...)` aquí.
 *      - `estado` llega de `get_estatus_reflejante_display()`, o sea la
 *        etiqueta CRUDA del enum de Python — que va SIN acentos
 *        ("Preparacion", "Revision"). Se muestra tal cual llega, sin intentar
 *        casarla con `REFLECTIVE_ORDER_STATUS_CONFIG` (que sí acentúa): es
 *        texto del backend, no un código. Hoy siempre es "Pendiente", donde
 *        ambas coinciden.
 *
 *     OJO: este 409 solo puede ocurrir en el POST SIN `detalles_override`. El
 *     backend quitó la constraint `uq_orden_reflejante_activa_por_pedido`
 *     (migración `0025`), así que un pedido acumula varias OR parciales; el
 *     duplicado se evalúa únicamente cuando se pide el pedido COMPLETO y ya
 *     estaba cubierto al 100%. El asistente manda `detalles_override` siempre,
 *     de modo que la rama es hoy inalcanzable desde la UI — se conserva porque
 *     quien decide es el backend, no esta pantalla.
 *
 *  E. 400 DE EXCESO POR LÍNEA — la forma B (`err` con el motivo general) MÁS
 *     `detalles_exceso`: un arreglo de strings ya formateados, uno por cada
 *     línea cuya `cantidad` solicitada rebasa su saldo (`cantidad_pedido -
 *     ya_asignado`). Es la respuesta típica del POST CON `detalles_override`
 *     cuando el saldo cambió entre que se cargó el catálogo y se envió.
 *
 *     Aparte, el serializer rechaza el propio `detalles_override` bajo esa
 *     misma clave (renglón que no es objeto, id faltante/repetido/inexistente/
 *     ajeno/sin reflejante, cantidad no numérica, <= 0, fraccionaria o mayor a
 *     la contratada) con un string plano, no una lista.
 *
 * Siempre devuelve un objeto (nunca `null`) y garantiza que haya algo que
 * mostrar: si no se reconoce nada, deja un `formError` genérico.
 */
export function parseReflectiveOrderError(error: unknown): ParsedReflectiveOrderError {
  const result: ParsedReflectiveOrderError = {
    fieldErrors: {},
    messages: [],
  };

  if (!(error instanceof AxiosError)) {
    result.formError = REFLECTIVE_ORDER_GENERIC_ERROR;
    return result;
  }

  const data = error.response?.data;

  // Respuesta en texto plano (p. ej. un 500 que devuelve HTML/string).
  if (typeof data === "string" && data.trim().length > 0) {
    result.formError = data;
    result.messages.push(data);
    return result;
  }

  // ── Forma A: arreglo plano a nivel raíz ──────────────────────────────────
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = REFLECTIVE_ORDER_GENERIC_ERROR;
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || REFLECTIVE_ORDER_GENERIC_ERROR;
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Forma D: 409 duplicado ────────────────────────────────────────────────
  // Se revisa ANTES de la forma B genérica: el cuerpo trae una clave `err`
  // igual que B, pero además `orden_reflejante_existente` — si no se detecta
  // aquí primero, B lo procesaría y ese dato extra se perdería.
  if (error.response?.status === 409) {
    const existente = record.orden_reflejante_existente;
    if (existente && typeof existente === "object") {
      const existenteRecord = existente as Record<string, unknown>;
      const id = Number(existenteRecord.id);
      const pedido = Number(existenteRecord.pedido);
      // Defensivo: si el backend algún día manda un 409 con
      // `orden_reflejante_existente` mal formado (sin `id`/`pedido`
      // numerables), NO se arma `duplicate` con un id inválido — se cae al
      // tratamiento genérico de abajo (forma B, vía la misma clave `err`) en
      // vez de exponer un `NaN` en la UI.
      if (Number.isFinite(id) && Number.isFinite(pedido)) {
        const message = firstDrfMessage(record.err) ?? REFLECTIVE_ORDER_GENERIC_ERROR;
        result.formError = message;
        result.messages.push(message);
        result.duplicate = {
          message,
          existingOrder: {
            id,
            pedido,
            folio: existenteRecord.folio != null ? String(existenteRecord.folio) : "",
            estado: existenteRecord.estado != null ? String(existenteRecord.estado) : "",
          },
        };
        return result;
      }
    }
    // 409 sin `orden_reflejante_existente` utilizable: sigue de largo hacia el
    // tratamiento genérico (forma B/C) en vez de fallar.
  }

  // ── Forma B: clave `err` del service ─────────────────────────────────────
  const errMessage = firstDrfMessage(record.err);
  if (errMessage) {
    result.formError = errMessage;
    result.messages.push(errMessage);
  }

  // ── Forma E: 400 de exceso por línea ─────────────────────────────────────
  // Estructuralmente es la forma B (`err` con el motivo general) MÁS
  // `detalles_exceso`, el desglose de qué líneas se pasaron del saldo. Lo
  // emiten los DOS cortes de cupo del service: el de la línea
  // (`pedido_detalle`, `talla`) y el segundo por `pedido_detalle` completo, que
  // absorbe las piezas ya programadas sin talla identificable. Sin este bloque
  // ese desglose se perdería en silencio: el fallback de "claves desconocidas"
  // del final solo corre cuando no hubo NINGÚN mensaje, y `err` siempre viene
  // en esta respuesta.
  const excessLines = readExcessLines(record.detalles_exceso);
  if (excessLines) {
    result.excessLines = excessLines;
    result.formError = result.formError ?? REFLECTIVE_ORDER_GENERIC_ERROR;
    result.messages.push(...excessLines);
  }

  // ── `detalles_override`: rechazos del serializer sobre las líneas ────────
  // Es una clave del PAYLOAD, no un input del formulario (las líneas se
  // capturan en una tabla, no en un campo único), así que su mensaje va al
  // banner y no a `fieldErrors` — mismo criterio que `detalles_override` en
  // `parseEmbroideryOrderError` y que `picking_detalle` en `parsePickingError`.
  // Aquí caen: renglón que no es objeto, `pedido_detalle_talla_id` faltante o
  // repetido, id inexistente, id ajeno al pedido, id sin `lleva_reflejante`,
  // cantidad no numérica, `cantidad <= 0`, cantidad fraccionaria y cantidad
  // mayor a la contratada en el pedido.
  const overrideMessage = firstDrfMessage(record.detalles_override);
  if (overrideMessage) {
    result.formError = result.formError ?? overrideMessage;
    result.messages.push(overrideMessage);
  }

  // Claves estándar de DRF (defensivo: hoy ninguna ruta del service las
  // produce, pero un `PermissionDenied`/`NotAuthenticated` sí daría `detail`).
  const detail = firstDrfMessage(record.detail);
  if (detail) {
    result.formError = result.formError ?? detail;
    result.messages.push(detail);
  }
  const nonField = firstDrfMessage(record.non_field_errors);
  if (nonField) {
    result.formError = result.formError ?? nonField;
    result.messages.push(nonField);
  }

  // ── Forma C: errores por campo del serializer ────────────────────────────
  FORM_FIELDS.forEach((field) => {
    const message = firstDrfMessage(record[field]);
    if (message) {
      result.fieldErrors[field] = message;
      result.messages.push(message);
    }
  });

  // Cualquier otra clave desconocida alimenta el banner/toast en vez de
  // perderse en silencio.
  if (result.messages.length === 0) {
    Object.entries(record).forEach(([key, value]) => {
      if (FORM_FIELDS.includes(key as ReflectiveOrderErrorField)) return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    result.formError = result.messages[0] ?? REFLECTIVE_ORDER_GENERIC_ERROR;
  }

  return result;
}

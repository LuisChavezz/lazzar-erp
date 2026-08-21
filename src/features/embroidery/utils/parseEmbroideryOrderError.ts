import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/** Campos del formulario a los que el backend puede atribuir un `400`. */
export type EmbroideryOrderErrorField = "pedido" | "prioridad" | "observaciones";

const FORM_FIELDS: EmbroideryOrderErrorField[] = [
  "pedido",
  "prioridad",
  "observaciones",
];

/** La orden de bordado activa ya existente, tal cual la reporta el 409. */
export interface EmbroideryDuplicateExistingOrder {
  id: number;
  folio: string;
  pedido: number;
  estado: string;
}

/**
 * Error de alta de orden de bordado, normalizado a una forma que el formulario
 * puede pintar de tres maneras:
 *  - `fieldErrors` → error debajo del campo correspondiente (forma C).
 *  - `duplicate`   → bloque informativo con la orden ya existente (forma D,
 *                    409). Cuando está presente, `formError`/`messages` llevan
 *                    el MISMO mensaje (`duplicate.message`) para que un
 *                    consumidor que todavía no distingue esta forma —el toast
 *                    de la mutación— siga mostrando el texto correcto sin
 *                    tener que leer `duplicate` explícitamente.
 *  - `formError`   → banner de "no se creó nada" (formas A y B, y cualquier
 *                    cosa inesperada).
 * `messages` es la lista plana para el toast.
 *
 * NO es una unión discriminada por `kind`: las cuatro formas (A/B/C/D) son
 * ramas de PARSEO que rellenan este mismo objeto plano, no variantes de un
 * tipo. `duplicate` es un campo ADICIONAL opcional —su sola presencia ya
 * discrimina el caso— en vez de un tag `kind` que habría obligado a los tres
 * consumidores existentes (el toast de la mutación, el banner del formulario)
 * a bifurcar sobre un valor que hasta ahora no existía.
 */
export interface ParsedEmbroideryOrderError {
  formError?: string;
  fieldErrors: Partial<Record<EmbroideryOrderErrorField, string>>;
  messages: string[];
  duplicate?: {
    message: string;
    existingOrder: EmbroideryDuplicateExistingOrder;
  };
  /**
   * Diagnóstico línea por línea del `400` de exceso (`detalles_exceso`), tal
   * cual lo arma el backend. Son STRINGS ya formateados —no objetos—, del
   * tipo:
   *
   *   `  - talla_id=3 pedido_detalle_id=12: pedido=10.0, ya_asignado=4.0,
   *      solicitado=8.0, disponible_restante=6.0`
   *
   * y, en el segundo corte, la variante `pedido_detalle_id=12 (total del
   * renglón)`. Se conservan sin parsear a propósito: su formato es un texto de
   * depuración del backend, no un contrato estructurado del que se pueda
   * depender para reconstruir campos.
   *
   * Campo ADICIONAL opcional, igual que `duplicate`: su sola presencia
   * discrimina el caso sin obligar a los consumidores existentes a bifurcar.
   */
  excessLines?: string[];
}

export const EMBROIDERY_ORDER_GENERIC_ERROR = "No se pudo crear la orden de bordado.";

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
 * Normaliza el error de `POST /produccion/orden-bordado/onboarding/`.
 *
 * Vive aparte del hook (y no dentro de él, como `parseDispatchError`) porque es
 * una función PURA sin dependencias de React: así puede ejercitarse
 * directamente contra las tres formas del contrato sin montar la mutación. El
 * hook la re-exporta para que el punto de importación siga siendo el mismo.
 *
 * El backend rechaza en CUATRO formas distintas, todas confirmadas leyendo
 * `OrdenBordadoService` y el `ViewSet` (commit `75650b5` agregó la forma D):
 *
 *  A. ARREGLO PLANO a nivel raíz — `ValidationError("mensaje")` de
 *     `_validar_contexto`, que DRF envuelve en lista:
 *     `["El pedido no pertenece a la empresa del usuario."]`. También:
 *     "El usuario no tiene una empresa asignada." y "No tiene acceso a la
 *     sucursal del pedido para generar la orden de bordado.".
 *
 *  B. OBJETO CON CLAVE `err` — `ValidationError({"err": "mensaje"})` del
 *     service: `{"err": "El pedido no tiene detalles con bordado para generar
 *     la orden."}` y `{"err": "El usuario no tiene una sucursal asignada."}`.
 *     `err` NO es una convención de DRF ni un campo del formulario: es una
 *     clave inventada por el backend, así que su mensaje va al banner, nunca
 *     debajo de un input.
 *
 *  C. OBJETO POR CAMPO (DRF estándar) — de
 *     `serializer.is_valid(raise_exception=True)`:
 *     `{"pedido": ["Este campo es requerido."]}`. Es la única forma
 *     atribuible a un input concreto.
 *
 *  D. 409 DUPLICADO — `OrdenBordadoDuplicada409` (subclase de `APIException`,
 *     NO `ValidationError`), lanzada por
 *     `OrdenBordadoService.buscar_existente_full_match` cuando el pedido ya
 *     tiene una OB activa con el 100% de sus tallas de bordado:
 *     `{"err": "Ya existe una orden de bordado activa para este pedido con
 *     el 100% de las prendas...", "orden_bordado_existente": {"id": "44",
 *     "folio": "2026-OB-00001", "pedido": "100", "estado": "Sin trabajar"}}`.
 *     Estructuralmente es la forma B MÁS `orden_bordado_existente` — se
 *     revisa ANTES de B para no perder ese dato extra.
 *
 *     Dos particularidades verificadas contra el código del backend, no
 *     contra su documentación (que las describe mal):
 *      - `id` y `pedido` llegan como STRING (`"44"`, no `44`): DRF convierte
 *        recursivamente cualquier valor dentro del `detail` de una
 *        `APIException` a `ErrorDetail` (subclase de `str`), sin importar el
 *        tipo original (`existente.id`/`existente.pedido_id` son `int` en el
 *        modelo). Se castean con `Number(...)` aquí.
 *      - `estado` llega en Title Case (`"Sin trabajar"`, vía
 *        `get_estatus_bordado_display()`), no en mayúsculas — coincide, de
 *        hecho, con las etiquetas que ya usa `EMBROIDERY_STATUS_CONFIG` en
 *        este mismo módulo para `estatus_bordado === 1`.
 *      - `url_detalle` NO existe en el payload real (aunque la documentación
 *        del backend lo menciona) — no se referencia.
 *
 *     OJO: este 409 solo puede ocurrir en el POST SIN `detalles_override`. El
 *     backend quitó la constraint `uq_orden_bordado_activa_por_pedido`, así
 *     que un pedido acumula varias OB parciales; el duplicado se evalúa
 *     únicamente cuando se pide el pedido COMPLETO y ya estaba cubierto al
 *     100%.
 *
 *  E. 400 DE EXCESO POR LÍNEA — la forma B (`err` con el motivo general) MÁS
 *     `detalles_exceso`: un arreglo de strings ya formateados, uno por cada
 *     línea cuya `cantidad` solicitada rebasa su saldo (`cantidad_pedido -
 *     ya_asignado`). Es la respuesta típica del POST CON `detalles_override`
 *     cuando el saldo cambió entre que se cargó el catálogo y se envió.
 *
 *     Aparte, el serializer rechaza el propio `detalles_override` bajo esa
 *     misma clave (id repetido/ajeno/sin bordado, cantidad no entera, <= 0 o
 *     mayor a la contratada) con un string plano, no una lista.
 *
 * Siempre devuelve un objeto (nunca `null`) y garantiza que haya algo que
 * mostrar: si no se reconoce nada, deja un `formError` genérico.
 */
export function parseEmbroideryOrderError(error: unknown): ParsedEmbroideryOrderError {
  const result: ParsedEmbroideryOrderError = {
    fieldErrors: {},
    messages: [],
  };

  if (!(error instanceof AxiosError)) {
    result.formError = EMBROIDERY_ORDER_GENERIC_ERROR;
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
      result.formError = EMBROIDERY_ORDER_GENERIC_ERROR;
    }
    return result;
  }

  if (!data || typeof data !== "object") {
    result.formError = error.message || EMBROIDERY_ORDER_GENERIC_ERROR;
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Forma D: 409 duplicado ────────────────────────────────────────────────
  // Se revisa ANTES de la forma B genérica: el cuerpo trae una clave `err`
  // igual que B, pero además `orden_bordado_existente` — si no se detecta
  // aquí primero, B lo procesaría y ese dato extra se perdería.
  if (error.response?.status === 409) {
    const existente = record.orden_bordado_existente;
    if (existente && typeof existente === "object") {
      const existenteRecord = existente as Record<string, unknown>;
      const id = Number(existenteRecord.id);
      const pedido = Number(existenteRecord.pedido);
      // Defensivo: si el backend algún día manda un 409 con
      // `orden_bordado_existente` mal formado (sin `id`/`pedido` numerables),
      // NO se arma `duplicate` con un id inválido — se cae al tratamiento
      // genérico de abajo (forma B, vía la misma clave `err`) en vez de
      // exponer un `NaN` en la UI.
      if (Number.isFinite(id) && Number.isFinite(pedido)) {
        const message = firstDrfMessage(record.err) ?? EMBROIDERY_ORDER_GENERIC_ERROR;
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
    // 409 sin `orden_bordado_existente` utilizable: sigue de largo hacia el
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
  // `detalles_exceso`, el desglose de qué líneas se pasaron del saldo. Sin
  // este bloque, ese desglose se perdería en silencio: el fallback de "claves
  // desconocidas" del final solo corre cuando no hubo NINGÚN mensaje, y `err`
  // siempre viene en esta respuesta.
  const excessLines = readExcessLines(record.detalles_exceso);
  if (excessLines) {
    result.excessLines = excessLines;
    result.formError = result.formError ?? EMBROIDERY_ORDER_GENERIC_ERROR;
    result.messages.push(...excessLines);
  }

  // ── `detalles_override`: rechazos del serializer sobre las líneas ────────
  // Es una clave del PAYLOAD, no un input del formulario (las líneas se
  // capturan en una tabla, no en un campo único), así que su mensaje va al
  // banner y no a `fieldErrors` — mismo criterio que `picking_detalle` en
  // `parsePickingError`. Aquí caen: id repetido, id ajeno al pedido, id sin
  // `lleva_bordado`, cantidad no numérica, `cantidad <= 0`, cantidad
  // fraccionaria y cantidad mayor a la contratada en el pedido.
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
      if (FORM_FIELDS.includes(key as EmbroideryOrderErrorField)) return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    result.formError = result.messages[0] ?? EMBROIDERY_ORDER_GENERIC_ERROR;
  }

  return result;
}

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
}

export const EMBROIDERY_ORDER_GENERIC_ERROR = "No se pudo crear la orden de bordado.";

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
 *     "folio": "2026-OB-00001", "pedido": "100", "estado": "Pendiente"}}`.
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
 *      - `estado` llega en Title Case (`"Pendiente"`, vía
 *        `get_estatus_bordado_display()`), no en mayúsculas — coincide, de
 *        hecho, con las etiquetas que ya usa `EMBROIDERY_STATUS_CONFIG` en
 *        este mismo módulo para `estatus_bordado === 1`.
 *      - `url_detalle` NO existe en el payload real (aunque la documentación
 *        del backend lo menciona) — no se referencia.
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

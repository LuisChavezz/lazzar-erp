import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/** Campos del formulario a los que el backend puede atribuir un `400`. */
export type CorteMangaOrderErrorField = "pedido" | "prioridad" | "observaciones";

const FORM_FIELDS: CorteMangaOrderErrorField[] = [
  "pedido",
  "prioridad",
  "observaciones",
];

/** La orden de corte de manga activa ya existente, tal cual la reporta el 409. */
export interface CorteMangaDuplicateExistingOrder {
  id: number;
  folio: string;
  pedido: number;
  estado: string;
}

/**
 * Error de alta de orden de corte de manga, normalizado a una forma que el
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
 * discrimina el caso—. Mismo diseño que `ParsedReflectiveOrderError`.
 */
export interface ParsedCorteMangaOrderError {
  formError?: string;
  fieldErrors: Partial<Record<CorteMangaOrderErrorField, string>>;
  messages: string[];
  duplicate?: {
    message: string;
    existingOrder: CorteMangaDuplicateExistingOrder;
  };
}

export const CORTE_MANGA_ORDER_GENERIC_ERROR =
  "No se pudo crear la orden de corte de manga.";

/**
 * Normaliza el error de `POST /produccion/orden-corte-manga/onboarding/`.
 *
 * Vive aparte del hook (y no dentro de él) porque es una función PURA sin
 * dependencias de React: así puede ejercitarse directamente contra las cuatro
 * formas del contrato sin montar la mutación. El hook la re-exporta para que el
 * punto de importación siga siendo el mismo.
 *
 * El backend rechaza en CUATRO formas distintas, todas confirmadas leyendo
 * `OrdenCorteMangaService` y el `ViewSet` en el checkout de `nucleo-erp`:
 *
 *  A. ARREGLO PLANO a nivel raíz — `ValidationError("mensaje")` de
 *     `_validar_contexto`, que DRF envuelve en lista:
 *     `["El pedido no pertenece a la empresa del usuario."]`. También:
 *     "El usuario no tiene una empresa asignada." y "No tiene acceso a la
 *     sucursal del pedido para generar la orden de corte de manga.".
 *
 *  B. OBJETO CON CLAVE `err` — `ValidationError({"err": "mensaje"})` del
 *     service: `{"err": "El pedido no tiene detalles con corte de manga para
 *     generar la orden."}` y `{"err": "El usuario no tiene una sucursal
 *     asignada."}`. `err` NO es una convención de DRF ni un campo del
 *     formulario: es una clave inventada por el backend, así que su mensaje va
 *     al banner, nunca debajo de un input. Se muestra VERBATIM, sin reescribir:
 *     el de la sucursal en particular es un requisito muerto del service
 *     (`user.sucursal_default` se exige pero no se usa para emitir el folio, que
 *     sale de `pedido.sucursal_id`), y suavizarlo escondería la única pista de
 *     qué hay que configurarle al usuario.
 *
 *  C. OBJETO POR CAMPO (DRF estándar) — de
 *     `serializer.is_valid(raise_exception=True)`:
 *     `{"pedido": ["Este campo es requerido."]}`. Es la única forma atribuible
 *     a un input concreto.
 *
 *  D. 409 DUPLICADO — `OrdenCorteMangaDuplicada409` (subclase de
 *     `APIException`, NO `ValidationError`), por dos vías: el chequeo previo
 *     `buscar_existente_full_match` y, ante una carrera, la traducción del
 *     `IntegrityError` de la constraint `uq_orden_corte_manga_activa_por_pedido`
 *     en `crear_orden_con_guardia_duplicado`. Ambas arman el payload con el
 *     MISMO builder compartido (`produccion/services/common.py::payload_duplicada`):
 *     `{"err": "Ya existe una orden de corte de manga activa para este pedido
 *     con el 100% de las prendas...", "orden_corte_manga_existente": {"id":
 *     "44", "folio": "2026-OCM-00001", "pedido": "100", "estado": "Pendiente"}}`.
 *
 *     La clave `orden_corte_manga_existente` está VERIFICADA en
 *     `OrdenCorteMangaService._payload_duplicada` (`payload_key=
 *     "orden_corte_manga_existente"`), no deducida por analogía con reflejante:
 *     el builder es compartido pero la clave la pasa cada service.
 *
 *     Estructuralmente es la forma B MÁS `orden_corte_manga_existente` — se
 *     revisa ANTES de B para no perder ese dato extra.
 *
 *     Dos particularidades heredadas del builder compartido:
 *      - `id` y `pedido` llegan como STRING (`"44"`, no `44`): DRF convierte
 *        recursivamente cualquier valor dentro del `detail` de una
 *        `APIException` a `ErrorDetail` (subclase de `str`), sin importar el
 *        tipo original (`existente.id`/`existente.pedido_id` son `int` en el
 *        modelo). Se castean con `Number(...)` aquí.
 *      - `estado` llega de `get_estatus_corte_display()`, o sea la etiqueta
 *        CRUDA del enum de Python — que va SIN acentos ("Preparacion",
 *        "Revision"). Se muestra tal cual llega, sin intentar casarla con
 *        `CORTE_MANGA_ORDER_STATUS_CONFIG` (que sí acentúa): es texto del
 *        backend, no un código. Hoy siempre es "Pendiente", donde ambas
 *        coinciden.
 *
 * Siempre devuelve un objeto (nunca `null`). En un 400/403/409 con cuerpo JSON
 * garantiza que haya algo que mostrar (si no reconoce nada, deja un `formError`
 * genérico); fuera de eso devuelve `formError` vacío a propósito para que el
 * consumidor use su texto fijo — ver el guardia de status al inicio.
 */
export function parseCorteMangaOrderError(error: unknown): ParsedCorteMangaOrderError {
  const result: ParsedCorteMangaOrderError = {
    fieldErrors: {},
    messages: [],
  };

  // El cuerpo del backend solo se lee en un 400 (formas A/B/C), un 403 (el
  // `detail` en español de un `PermissionDenied`, que dice que es un problema
  // de permisos y no algo que se arregle reintentando — mismo criterio que
  // `drfActionErrorMessage`) o el 409 de duplicado (forma D): son los únicos
  // rechazos con un mensaje pensado para el usuario. Cualquier otra cosa —un 500 cuyo cuerpo es la página HTML de
  // depuración de Django, un 502 de un proxy, un error de red sin respuesta, o
  // algo que ni siquiera es un `AxiosError`— sale SIN `formError` ni
  // `messages`, y cada consumidor pone su texto fijo en español (el toast,
  // `CORTE_MANGA_ORDER_GENERIC_ERROR`; el banner, "Intenta de nuevo."). Mismo
  // criterio que `useToggleCostCenterActivo` (EC-140).
  if (!(error instanceof AxiosError)) return result;
  const status = error.response?.status;
  if (status !== 400 && status !== 403 && status !== 409) return result;

  const data = error.response?.data;

  // ── Forma A: arreglo plano a nivel raíz ──────────────────────────────────
  if (Array.isArray(data)) {
    const messages = data
      .map((entry) => firstDrfMessage(entry))
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) {
      result.formError = messages[0];
      result.messages.push(...messages);
    } else {
      result.formError = CORTE_MANGA_ORDER_GENERIC_ERROR;
    }
    return result;
  }

  // Cuerpo inesperado (vacío, o texto/HTML en vez de JSON): nada que mostrar
  // verbatim, mismo tratamiento que un status fuera de 400/403/409. En particular
  // NO se usa `error.message` ("Request failed with status code 400").
  if (!data || typeof data !== "object") {
    return result;
  }

  const record = data as Record<string, unknown>;

  // ── Forma D: 409 duplicado ────────────────────────────────────────────────
  // Se revisa ANTES de la forma B genérica: el cuerpo trae una clave `err`
  // igual que B, pero además `orden_corte_manga_existente` — si no se detecta
  // aquí primero, B lo procesaría y ese dato extra se perdería.
  if (error.response?.status === 409) {
    const existente = record.orden_corte_manga_existente;
    if (existente && typeof existente === "object") {
      const existenteRecord = existente as Record<string, unknown>;
      const id = Number(existenteRecord.id);
      const pedido = Number(existenteRecord.pedido);
      // Defensivo: si el backend algún día manda un 409 con
      // `orden_corte_manga_existente` mal formado (sin `id`/`pedido`
      // numerables), NO se arma `duplicate` con un id inválido — se cae al
      // tratamiento genérico de abajo (forma B, vía la misma clave `err`) en
      // vez de exponer un `NaN` en la UI.
      if (Number.isFinite(id) && Number.isFinite(pedido)) {
        const message = firstDrfMessage(record.err) ?? CORTE_MANGA_ORDER_GENERIC_ERROR;
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
    // 409 sin `orden_corte_manga_existente` utilizable: sigue de largo hacia el
    // tratamiento genérico (forma B/C) en vez de fallar.
  }

  // ── Forma B: clave `err` del service ─────────────────────────────────────
  const errMessage = firstDrfMessage(record.err);
  if (errMessage) {
    result.formError = errMessage;
    result.messages.push(errMessage);
  }

  // Claves estándar de DRF. `detail` es la forma del 403 (`PermissionDenied`)
  // que deja pasar el guardia de status; ninguna ruta del service lo produce en
  // un 400. (Un `NotAuthenticated` es 401 y lo resuelve el interceptor de
  // `v1_api` antes de llegar aquí.)
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
      if (FORM_FIELDS.includes(key as CorteMangaOrderErrorField)) return;
      const message = firstDrfMessage(value);
      if (message) result.messages.push(message);
    });
    result.formError = result.messages[0] ?? CORTE_MANGA_ORDER_GENERIC_ERROR;
  }

  return result;
}

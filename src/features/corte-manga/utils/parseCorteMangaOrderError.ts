import { AxiosError } from "axios";
import { forbiddenDetailMessage, isForbiddenError } from "@/src/utils/drfWriteErrors";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { readExcessLines } from "@/src/utils/readExcessLines";

/** Campos del formulario a los que el backend puede atribuir un `400`. */
export type CorteMangaOrderErrorField = "pedido" | "observaciones";

const FORM_FIELDS: CorteMangaOrderErrorField[] = [
  "pedido",
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
  /**
   * Diagnóstico línea por línea del `400` de exceso (`detalles_exceso`), tal
   * cual lo arma el backend: STRINGS ya formateados (`  - talla_id=3
   * pedido_detalle_id=12: pedido=10.0, ya_asignado=4.0, solicitado=8.0,
   * disponible_restante=6.0`, y la variante `(total del renglón)`). Se conservan
   * sin parsear: son texto de diagnóstico, no un contrato estructurado. Campo
   * ADICIONAL opcional: su sola presencia discrimina el caso. Mismo campo que
   * `ParsedReflectiveOrderError.excessLines`.
   */
  excessLines?: string[];
  /**
   * Status HTTP del rechazo (`400`, `403`, `409`); ausente en un error sin
   * respuesta. El Paso 2 recarga los saldos en todo `400` que no sea de campo.
   */
  status?: number;
}

export const CORTE_MANGA_ORDER_GENERIC_ERROR =
  "No se pudo crear la orden de corte de manga.";

/**
 * Normaliza el error de `POST /produccion/orden-corte-manga/onboarding/`.
 *
 * Vive aparte del hook (y no dentro de él) porque es una función PURA sin
 * dependencias de React: así puede ejercitarse directamente contra las cinco
 * formas del contrato sin montar la mutación. El hook la re-exporta para que el
 * punto de importación siga siendo el mismo.
 *
 * El backend rechaza en CINCO formas distintas, todas confirmadas leyendo
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
 *     OJO: este 409 solo puede ocurrir en el POST SIN `detalles_override`
 *     (`buscar_existente_full_match`). El asistente de 2 pasos manda
 *     `detalles_override` siempre (EC-967), así que la rama es hoy inalcanzable
 *     desde la UI; se conserva porque quien decide es el backend.
 *
 *  E. 400 DE EXCESO — la forma B (`err` con el motivo general) MÁS
 *     `detalles_exceso` cuando una línea rebasa su saldo (`cantidad_pedido -
 *     ya_asignado`), o la forma B sola cuando el TOTAL rebasa lo programado por
 *     Mesa de Control ("…excede lo programado por mesa de control (…)").
 *
 *     Aparte, el serializer rechaza el propio `detalles_override` bajo esa
 *     misma clave, como LISTA (`{"detalles_override": ["…"]}`): renglón que no
 *     es objeto, id faltante/repetido/ajeno al pedido/sin `lleva_corte_manga`,
 *     cantidad no numérica, <= 0, fraccionaria o mayor a la de la línea.
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

  // El cuerpo del backend solo se lee en un 400 (formas A/B/C/E y
  // `detalles_override`), un 403 (el
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
  result.status = error.response?.status;
  // 403: regla única del módulo (`forbiddenDetailMessage`): su `detail` o su
  // `non_field_errors`, nunca errores de campo. Sin ninguno, sin `formError`
  // para que el consumidor ponga su texto fijo.
  if (isForbiddenError(error)) {
    const message = forbiddenDetailMessage(error);
    if (message) {
      result.formError = message;
      result.messages.push(message);
    }
    return result;
  }
  const status = error.response?.status;
  if (status !== 400 && status !== 409) return result;

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

  // ── Forma E: 400 de exceso por línea ─────────────────────────────────────
  // Sin este bloque el desglose se perdería en silencio: el fallback de "claves
  // desconocidas" del final solo corre cuando no hubo NINGÚN mensaje, y `err`
  // siempre viene en esta respuesta.
  const excessLines = readExcessLines(record.detalles_exceso);
  if (excessLines) {
    result.excessLines = excessLines;
    result.formError = result.formError ?? CORTE_MANGA_ORDER_GENERIC_ERROR;
    result.messages.push(...excessLines);
  }

  // ── `detalles_override`: rechazos del serializer sobre las líneas ────────
  // Es una clave del PAYLOAD, no un input del formulario (las líneas se
  // capturan en una tabla), así que su mensaje va al banner, VERBATIM.
  const overrideMessage = firstDrfMessage(record.detalles_override);
  if (overrideMessage) {
    result.formError = result.formError ?? overrideMessage;
    result.messages.push(overrideMessage);
  }

  // ── Forma F: rechazo de negocio sobre el pedido (nucleo-erp#1370) ────────
  // El service bloquea el pedido y responde `{"pedido": "…"}` como STRING
  // (no existe, cancelado o dado de baja, retenido); el serializer, en cambio,
  // manda sus errores de campo como lista (`["Este campo es requerido."]`).
  // No hay nada que corregir en el campo: va al banner con su texto.
  const pedidoRejection = typeof record.pedido === "string" ? record.pedido.trim() : "";
  if (pedidoRejection) {
    result.formError = result.formError ?? pedidoRejection;
    result.messages.push(pedidoRejection);
  }

  // ── Forma C: errores por campo del serializer ────────────────────────────
  FORM_FIELDS.forEach((field) => {
    if (field === "pedido" && pedidoRejection) return;
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

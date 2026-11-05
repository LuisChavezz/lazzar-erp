import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  isQuoteDetailDefinitiveError,
  quoteComentariosResource,
  readQuoteResource,
  type QuoteDetailSource,
  type QuoteResource,
} from "@/src/features/quotes/utils/quoteResource";
import {
  getQuoteEditLoadState,
  QUOTE_EDIT_REFETCH_ERROR_MESSAGE,
  quoteLoadErrorKind,
} from "@/src/features/quotes/utils/quoteEditLoadState";
import { REFETCH_ERROR_MESSAGE } from "@/src/hooks/useHasLoadedQuery";
import { resolveNotificationTarget } from "@/src/features/notifications/constants/notificationTargets";
import {
  TIPO_COTIZACION_EN_REVISION,
  type Notificacion,
} from "@/src/features/notifications/interfaces/notification.interface";

/**
 * Pruebas unitarias de EC-772: cada pantalla lee la cotización del recurso que
 * declara, y solo los `source` con respaldo explícito reintentan en el otro
 * recurso, únicamente ante un 404. Corren con `npm run test:unit`.
 */

const httpError = (status: number) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: String(status),
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

/** Lectores falsos que registran a quién se preguntó y responden lo indicado. */
const fakeReaders = (responses: Record<QuoteResource, number>) => {
  const calls: QuoteResource[] = [];
  const reader = (resource: QuoteResource) => async (id: number) => {
    calls.push(resource);
    const status = responses[resource];
    if (status !== 200) throw httpError(status);
    return `${resource}:${id}`;
  };
  return {
    calls,
    readers: { cotizaciones: reader("cotizaciones"), "mesa-control": reader("mesa-control") },
  };
};

const statusOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof AxiosError ? error.response?.status : "no-axios";
  }
};

test("los source de un solo recurso nunca reintentan, ni ante un 404", async () => {
  for (const source of ["cotizaciones", "mesa-control"] as const) {
    const { calls, readers } = fakeReaders({ cotizaciones: 404, "mesa-control": 404 });
    expect(await statusOf(readQuoteResource(readers, 7, source))).toBe(404);
    expect(calls).toEqual([source]);
  }
});

test("un source de un solo recurso lee de él y lo informa", async () => {
  const { calls, readers } = fakeReaders({ cotizaciones: 200, "mesa-control": 200 });
  await expect(readQuoteResource(readers, 7, "mesa-control")).resolves.toEqual({
    data: "mesa-control:7",
    resource: "mesa-control",
  });
  expect(calls).toEqual(["mesa-control"]);
});

const fallbackCases: Array<[QuoteDetailSource, QuoteResource, QuoteResource]> = [
  ["cotizaciones-o-mesa-control", "cotizaciones", "mesa-control"],
  ["mesa-control-o-cotizaciones", "mesa-control", "cotizaciones"],
];

for (const [source, first, second] of fallbackCases) {
  test(`${source}: si el primero responde, no pregunta al segundo`, async () => {
    const { calls, readers } = fakeReaders({ cotizaciones: 200, "mesa-control": 200 });
    await expect(readQuoteResource(readers, 7, source)).resolves.toEqual({
      data: `${first}:7`,
      resource: first,
    });
    expect(calls).toEqual([first]);
  });

  test(`${source}: un 404 del primero pasa al segundo y dice cuál respondió`, async () => {
    const { calls, readers } = fakeReaders({ [first]: 404, [second]: 200 } as Record<QuoteResource, number>);
    await expect(readQuoteResource(readers, 7, source)).resolves.toEqual({
      data: `${second}:7`,
      resource: second,
    });
    expect(calls).toEqual([first, second]);
  });

  test(`${source}: si los dos dan 404 se propaga el segundo, sin más intentos`, async () => {
    const { calls, readers } = fakeReaders({ cotizaciones: 404, "mesa-control": 404 });
    expect(await statusOf(readQuoteResource(readers, 7, source))).toBe(404);
    expect(calls).toEqual([first, second]);
  });

  test(`${source}: un error que no es 404 se propaga sin respaldo`, async () => {
    for (const status of [401, 403, 500]) {
      const { calls, readers } = fakeReaders({ [first]: status, [second]: 200 } as Record<QuoteResource, number>);
      expect(await statusOf(readQuoteResource(readers, 7, source))).toBe(status);
      expect(calls).toEqual([first]);
    }
  });
}

test("un error que no es de axios se propaga sin respaldo", async () => {
  const calls: QuoteResource[] = [];
  const readers = {
    cotizaciones: async () => {
      calls.push("cotizaciones");
      throw new Error("red");
    },
    "mesa-control": async () => {
      calls.push("mesa-control");
      return "x";
    },
  };
  expect(await statusOf(readQuoteResource(readers, 7, "cotizaciones-o-mesa-control"))).toBe("no-axios");
  expect(calls).toEqual(["cotizaciones"]);
});

test("comentarios con source fijo: siempre su recurso, antes y después de leer", () => {
  for (const source of ["cotizaciones", "mesa-control"] as const) {
    expect(quoteComentariosResource(source, undefined)).toBe(source);
    expect(quoteComentariosResource(source, source)).toBe(source);
  }
});

test("comentarios con respaldo: el primero del orden hasta saber cuál sirvió el detalle", () => {
  // Antes de que responda el detalle: el primero, para arrancar en paralelo.
  expect(quoteComentariosResource("cotizaciones-o-mesa-control", undefined)).toBe("cotizaciones");
  expect(quoteComentariosResource("mesa-control-o-cotizaciones", undefined)).toBe("mesa-control");
  // El detalle se resolvió por el primero: no cambia.
  expect(quoteComentariosResource("cotizaciones-o-mesa-control", "cotizaciones")).toBe("cotizaciones");
  // El detalle se resolvió por el segundo: se releen de ahí.
  expect(quoteComentariosResource("cotizaciones-o-mesa-control", "mesa-control")).toBe("mesa-control");
  expect(quoteComentariosResource("mesa-control-o-cotizaciones", "cotizaciones")).toBe("cotizaciones");
});

test("el 404 y el 403 del detalle son definitivos; un 500 no", () => {
  expect(isQuoteDetailDefinitiveError(httpError(404))).toBe(true);
  expect(isQuoteDetailDefinitiveError(httpError(403))).toBe(true);
  expect(isQuoteDetailDefinitiveError(httpError(500))).toBe(false);
  expect(isQuoteDetailDefinitiveError(new Error("red"))).toBe(false);
});

test("edición: el tipo de error sale de la última lectura", () => {
  expect(quoteLoadErrorKind(null)).toBe("none");
  expect(quoteLoadErrorKind(undefined)).toBe("none");
  expect(quoteLoadErrorKind(httpError(404))).toBe("access");
  expect(quoteLoadErrorKind(httpError(403))).toBe("access");
  expect(quoteLoadErrorKind(httpError(500))).toBe("technical");
  expect(quoteLoadErrorKind(new Error("red"))).toBe("technical");
});

const editState = (overrides: Partial<Parameters<typeof getQuoteEditLoadState>[0]>) =>
  getQuoteEditLoadState({
    hasQuote: false,
    isEditableStatus: false,
    latestErrorKind: "none",
    isFetchedAfterMount: true,
    ...overrides,
  });

test("edición: 404/403 de este montaje redirige avisando, también con datos ya cargados", () => {
  // Carga inicial (sin datos) y relectura (con datos): mismo resultado.
  for (const hasQuote of [false, true]) {
    expect(editState({ hasQuote, isEditableStatus: true, latestErrorKind: "access" })).toEqual({
      accessDenied: true,
      shouldRedirect: true,
      loadFailed: false,
    });
  }
});

test("edición: un 404/403 viejo de la caché no redirige mientras relee", () => {
  expect(editState({ latestErrorKind: "access", isFetchedAfterMount: false })).toEqual({
    accessDenied: false,
    shouldRedirect: false,
    loadFailed: false,
  });
});

test("edición: un 500 tras un 404/403 recordado es un fallo técnico, no una denegación", () => {
  // `useQuote` no tiene datos (el definitivo recordado los oculta) y la última
  // lectura falló con un 500: error con reintento, sin redirigir.
  expect(editState({ latestErrorKind: quoteLoadErrorKind(httpError(500)) })).toEqual({
    accessDenied: false,
    shouldRedirect: false,
    loadFailed: true,
  });
});

test("edición: un fallo técnico con datos ya cargados conserva el formulario", () => {
  expect(editState({ hasQuote: true, isEditableStatus: true, latestErrorKind: "technical" })).toEqual({
    accessDenied: false,
    shouldRedirect: false,
    loadFailed: false,
  });
});

test("edición: estatus no editable redirige sin aviso", () => {
  expect(editState({ hasQuote: true, isEditableStatus: false })).toEqual({
    accessDenied: false,
    shouldRedirect: true,
    loadFailed: false,
  });
});

test("edición: su toast de relectura es propio, distinto del genérico compartido", () => {
  expect(QUOTE_EDIT_REFETCH_ERROR_MESSAGE).not.toBe(REFETCH_ERROR_MESSAGE);
});

const enRevision = (data: unknown): Notificacion => ({
  id: 1,
  titulo: "Nueva cotización en revisión",
  mensaje: "",
  modulo: "ventas",
  tipo: TIPO_COTIZACION_EN_REVISION,
  leido: false,
  leido_at: null,
  data,
  created_at: "2026-11-05T00:00:00-06:00",
});

test("cotizacion_en_revision: el rol elige el orden del respaldo", () => {
  const notificacion = enRevision({ cotizacion_id: 308 });
  const admin = resolveNotificationTarget(notificacion, { role: "admin", permissions: [] });
  const user = resolveNotificationTarget(notificacion, { role: "user", permissions: ["R-MESACONTROL"] });

  expect(admin).toEqual({ kind: "quote-dialog", quoteId: 308, source: "cotizaciones-o-mesa-control" });
  expect(user).toEqual({ kind: "quote-dialog", quoteId: 308, source: "mesa-control-o-cotizaciones" });
});

test("cotizacion_en_revision: sin sesión cargada se trata como no admin, con respaldo", () => {
  const notificacion = enRevision({ cotizacion_id: 308 });
  for (const user of [undefined, null, {}]) {
    expect(resolveNotificationTarget(notificacion, user)).toEqual({
      kind: "quote-dialog",
      quoteId: 308,
      source: "mesa-control-o-cotizaciones",
    });
  }
});

test("cotizacion_en_revision: sin id válido no hay destino", () => {
  expect(resolveNotificationTarget(enRevision({ cotizacion_id: "308" }), { role: "admin" })).toBeNull();
  expect(resolveNotificationTarget(enRevision(null), { role: "admin" })).toBeNull();
});

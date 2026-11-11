import { expect, test } from "@playwright/test";
import {
  MAX_DIVERGENCE_REREADS,
  resolveDivergence,
  shouldRereadOnDivergence,
} from "@/src/features/auth/utils/sessionCompanyDivergence";

/**
 * EC-847: el vigilante de empresa ya no reaplica a ciegas la empresa
 * confirmada. Ante una desviación vuelve a preguntar al servidor y adopta lo
 * que diga: reescribe si era un token viejo, recarga si la empresa cambió.
 */

const KEY = "7:0";
const base = {
  currentKey: KEY,
  syncStatus: "done" as const,
  confirmed: { key: KEY, empresa: 1 },
  sessionEmpresa: 1 as number | null | undefined,
  switching: false,
  rereadsDone: 0,
};

test("sin desviación no relee", () => {
  expect(shouldRereadOnDivergence(base)).toBe(false);
});

test("una sesión distinta de la confirmada relee (GET tardío o cambio en otra pestaña)", () => {
  expect(shouldRereadOnDivergence({ ...base, sessionEmpresa: 55 })).toBe(true);
});

test("una sesión sin la clave cuenta como desviación (si no, la puerta quedaría en 'cargando')", () => {
  expect(shouldRereadOnDivergence({ ...base, sessionEmpresa: undefined })).toBe(true);
});

test("null es un valor: confirmada sin empresa y sesión con empresa relee, y al revés", () => {
  expect(
    shouldRereadOnDivergence({ ...base, confirmed: { key: KEY, empresa: null }, sessionEmpresa: 3 })
  ).toBe(true);
  expect(shouldRereadOnDivergence({ ...base, sessionEmpresa: null })).toBe(true);
  expect(
    shouldRereadOnDivergence({ ...base, confirmed: { key: KEY, empresa: null }, sessionEmpresa: null })
  ).toBe(false);
});

test("mientras la sincronización corre o si falló, no se toca: ella misma escribe la sesión", () => {
  expect(shouldRereadOnDivergence({ ...base, syncStatus: "pending", sessionEmpresa: 55 })).toBe(false);
  expect(shouldRereadOnDivergence({ ...base, syncStatus: "failed", sessionEmpresa: 55 })).toBe(false);
});

test("una confirmación de otra sincronización (otro usuario o intento) no cuenta", () => {
  expect(
    shouldRereadOnDivergence({ ...base, confirmed: { key: "7:1", empresa: 1 }, sessionEmpresa: 55 })
  ).toBe(false);
});

test("la pestaña que cambia de empresa no reacciona a su propia escritura", () => {
  expect(shouldRereadOnDivergence({ ...base, switching: true, sessionEmpresa: 55 })).toBe(false);
});

test("las relecturas están acotadas por sincronización", () => {
  expect(
    shouldRereadOnDivergence({ ...base, sessionEmpresa: 55, rereadsDone: MAX_DIVERGENCE_REREADS - 1 })
  ).toBe(true);
  expect(
    shouldRereadOnDivergence({ ...base, sessionEmpresa: 55, rereadsDone: MAX_DIVERGENCE_REREADS })
  ).toBe(false);
});

test("si el servidor sigue en la empresa de la pestaña, se reescribe (era un token viejo)", () => {
  expect(resolveDivergence(1, 1)).toBe("reapply");
  expect(resolveDivergence(null, null)).toBe("reapply");
});

test("si el servidor está en otra empresa, se recarga en vez de revertirla", () => {
  expect(resolveDivergence(1, 55)).toBe("reload");
  expect(resolveDivergence(null, 55)).toBe("reload");
  expect(resolveDivergence(1, null)).toBe("reload");
});

/**
 * Escenario de dos pestañas: A cambia 1 → 55 y next-auth difunde su sesión a
 * B. Con la regla anterior B reaplicaba 1 en la cookie compartida.
 */
test("dos pestañas: la que cambia no relee y la otra recarga sin tocar la sesión", () => {
  // A: `beginSwitch(55)` antes de escribir la sesión.
  const tabA = { ...base, confirmed: { key: KEY, empresa: 55 }, switching: true, sessionEmpresa: 55 };
  expect(shouldRereadOnDivergence(tabA)).toBe(false);

  // B: recibe la sesión con 55, sigue confirmada en 1; el servidor dice 55.
  const tabB = { ...base, sessionEmpresa: 55 };
  expect(shouldRereadOnDivergence(tabB)).toBe(true);
  expect(resolveDivergence(tabB.confirmed.empresa, 55)).toBe("reload");
});

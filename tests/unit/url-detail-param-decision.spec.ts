import { expect, test } from "@playwright/test";
import {
  decideUrlDetail,
  isCurrentUrlDetailId,
  type UrlDetailDecisionInput,
} from "@/src/utils/urlDetailParamDecision";

/** Decisión de `useUrlDetailParam` (`?solicitud=<id>`, EC-935). */

const ROWS = new Set([44, 7]);
const SEEN_AT = 1_000;

const input = (overrides: Partial<UrlDetailDecisionInput>): UrlDetailDecisionInput => ({
  raw: "44",
  seenAt: SEEN_AT,
  hasLoaded: true,
  dataUpdatedAt: SEEN_AT + 50,
  hasRow: (id) => ROWS.has(id),
  dismissedId: null,
  ...overrides,
});

test("sin parámetro no hay nada que hacer", () => {
  expect(decideUrlDetail(input({ raw: null }))).toEqual({ id: null, urlDetailId: null, action: "none" });
});

test("un id presente abre su diálogo", () => {
  expect(decideUrlDetail(input({}))).toEqual({ id: 44, urlDetailId: 44, action: "none" });
});

test("mientras el listado no carga no abre ni verifica", () => {
  expect(decideUrlDetail(input({ hasLoaded: false, dataUpdatedAt: 0 }))).toEqual({
    id: 44,
    urlDetailId: null,
    action: "none",
  });
});

test("cerrado: el mismo id no reabre mientras la URL siga trayéndolo", () => {
  expect(decideUrlDetail(input({ dismissedId: 44 }))).toEqual({ id: 44, urlDetailId: null, action: "none" });
});

test("reabrir el mismo id tras cerrar: con el descarte ya limpio vuelve a abrir", () => {
  // El hook limpia `dismissedId` en cuanto la URL deja de traer el id (raw null).
  expect(decideUrlDetail(input({ raw: null, dismissedId: 44 })).id).toBeNull();
  expect(decideUrlDetail(input({ dismissedId: null })).urlDetailId).toBe(44);
});

test("un descarte de otro id no impide abrir este", () => {
  expect(decideUrlDetail(input({ raw: "7", dismissedId: 44 })).urlDetailId).toBe(7);
});

test("id ausente con caché ANTERIOR al parámetro: se verifica con un refetch", () => {
  expect(decideUrlDetail(input({ raw: "999", dataUpdatedAt: SEEN_AT - 60_000 }))).toEqual({
    id: 999,
    urlDetailId: null,
    action: "verify",
  });
});

test("id ausente en un listado que llegó DESPUÉS del parámetro: no-encontrado, sin otro refetch", () => {
  // Carga en frío: el listado llega después de ver el parámetro.
  expect(decideUrlDetail(input({ raw: "999", dataUpdatedAt: SEEN_AT + 300 })).action).toBe("not-found");
  // Mismo instante: también cuenta como fresco.
  expect(decideUrlDetail(input({ raw: "999", dataUpdatedAt: SEEN_AT })).action).toBe("not-found");
});

test("valores inválidos se quitan sin aviso", () => {
  for (const raw of ["abc", "0", "-1", "1.5", "", " 44"]) {
    expect(decideUrlDetail(input({ raw }))).toEqual({ id: null, urlDetailId: null, action: "remove-invalid" });
  }
});

test("un parámetro inválido se quita aunque el listado no haya cargado", () => {
  expect(decideUrlDetail(input({ raw: "abc", hasLoaded: false })).action).toBe("remove-invalid");
});

test("la verificación de un id viejo no aplica si la URL ya lleva otro", () => {
  expect(isCurrentUrlDetailId(999, "999")).toBe(true);
  expect(isCurrentUrlDetailId(999, "44")).toBe(false);
  expect(isCurrentUrlDetailId(999, null)).toBe(false);
  expect(isCurrentUrlDetailId(999, "abc")).toBe(false);
});

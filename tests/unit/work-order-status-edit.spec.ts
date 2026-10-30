import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { buildReflectiveStatusPayload } from "@/src/features/reflective-orders/utils/buildReflectiveStatusPayload";
import { buildCorteMangaStatusPayload } from "@/src/features/corte-manga/utils/buildCorteMangaStatusPayload";
import {
  getWorkOrderTransitions,
  isWorkOrderTerminal,
  workOrderUpdateErrorMessage,
} from "@/src/utils/workOrderStatusEdit";

const httpError = (status: number, data: unknown): AxiosError => {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: "", headers: {}, config, data } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, response);
};

const CANCELADA = "La orden está cancelada: ya no se edita.";

/**
 * Pruebas unitarias de EC-653: el cuerpo del `PATCH` de estatus de las órdenes
 * de reflejante y corte de manga (nucleo-erp #755) y los destinos que ofrece el
 * selector. `fecha_fin` es la parte que no se ve en pantalla: la clave debe
 * faltar siempre, porque el backend solo la sella al entrar a Completado y la
 * limpia al salir cuando no viene en el cuerpo (nucleo-erp #786).
 */

test.describe("buildReflectiveStatusPayload", () => {
  test("al entrar a Completado no envía fecha_fin, para que el backend la selle", () => {
    const payload = buildReflectiveStatusPayload(5);
    expect(payload).toEqual({ estatus_reflejante: 5 });
    expect("fecha_fin" in payload).toBe(false);
  });

  test("al salir de Completado tampoco envía fecha_fin: la limpia el backend", () => {
    const payload = buildReflectiveStatusPayload(3);
    expect(payload).toEqual({ estatus_reflejante: 3 });
    expect("fecha_fin" in payload).toBe(false);
    expect(buildReflectiveStatusPayload(1)).toEqual({ estatus_reflejante: 1 });
  });
});

test.describe("buildCorteMangaStatusPayload", () => {
  test("usa la clave estatus_corte y tampoco envía fecha_fin", () => {
    expect(buildCorteMangaStatusPayload(5)).toEqual({ estatus_corte: 5 });
    expect(buildCorteMangaStatusPayload(6)).toEqual({ estatus_corte: 6 });
  });
});

test.describe("transiciones de reflejante y corte de manga", () => {
  test("ofrece todos los demás estatus menos Cancelado", () => {
    expect(getWorkOrderTransitions(1)).toEqual([2, 3, 4, 5, 6]);
    expect(getWorkOrderTransitions(5)).toEqual([1, 2, 3, 4, 6]);
    expect(getWorkOrderTransitions(6)).toEqual([1, 2, 3, 4, 5]);
  });

  test("Cancelado es terminal y no tiene destinos", () => {
    expect(isWorkOrderTerminal(7)).toBe(true);
    expect(getWorkOrderTransitions(7)).toEqual([]);
    expect(isWorkOrderTerminal(5)).toBe(false);
    expect(isWorkOrderTerminal(6)).toBe(false);
  });
});

test.describe("workOrderUpdateErrorMessage", () => {
  test("muestra el 400 de orden cancelada, que llega bajo el campo de estatus", () => {
    // Forma real de `_EditarOrdenServicioSerializer.validate` (nucleo-erp #755).
    expect(
      workOrderUpdateErrorMessage(
        httpError(400, { estatus_reflejante: [CANCELADA] }),
        "orden de reflejante",
      ),
    ).toBe(CANCELADA);
    expect(
      workOrderUpdateErrorMessage(
        httpError(400, { estatus_corte: [CANCELADA] }),
        "orden de corte de manga",
      ),
    ).toBe(CANCELADA);
  });

  test("un 404 dice que la orden ya no existe o salió del alcance", () => {
    expect(
      workOrderUpdateErrorMessage(httpError(404, { detail: "No encontrado." }), "orden de corte de manga"),
    ).toBe("La orden de corte de manga ya no existe o no tienes acceso a ella.");
  });

  test("un 500 o un error de red caen al mensaje genérico", () => {
    expect(workOrderUpdateErrorMessage(httpError(500, "<html>"), "orden de reflejante")).toBe(
      "No se pudo actualizar la orden de reflejante",
    );
    expect(workOrderUpdateErrorMessage(new Error("Network Error"), "orden de reflejante")).toBe(
      "No se pudo actualizar la orden de reflejante",
    );
  });
});

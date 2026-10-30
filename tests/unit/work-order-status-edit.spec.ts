import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
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
 * Pruebas unitarias de EC-653: los destinos que ofrece el selector de estatus
 * de las órdenes de reflejante y corte de manga (nucleo-erp #755) y el mensaje
 * cuando falla su `PATCH`.
 */

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

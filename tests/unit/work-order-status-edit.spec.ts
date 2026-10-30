import { expect, test } from "@playwright/test";
import { buildReflectiveStatusPayload } from "@/src/features/reflective-orders/utils/buildReflectiveStatusPayload";
import { buildCorteMangaStatusPayload } from "@/src/features/corte-manga/utils/buildCorteMangaStatusPayload";
import {
  getAvailableTransitions as getReflectiveTransitions,
  isTerminalStatus as isReflectiveTerminal,
} from "@/src/features/reflective-orders/constants/reflectiveOrderStatusTransitions";
import {
  getAvailableTransitions as getCorteMangaTransitions,
  isTerminalStatus as isCorteMangaTerminal,
} from "@/src/features/corte-manga/constants/corteMangaOrderStatusTransitions";

/**
 * Pruebas unitarias de EC-653: el cuerpo del `PATCH` de estatus de las órdenes
 * de reflejante y corte de manga (nucleo-erp #755) y los destinos que ofrece el
 * selector. La regla de `fecha_fin` es la parte que no se ve en pantalla: al
 * ENTRAR a Completado la clave debe faltar para que el backend la selle, y al
 * SALIR debe viajar `null` en el mismo `PATCH`.
 */

test.describe("buildReflectiveStatusPayload", () => {
  test("al entrar a Completado no envía fecha_fin, para que el backend la selle", () => {
    const payload = buildReflectiveStatusPayload(4, 5);
    expect(payload).toEqual({ estatus_reflejante: 5 });
    expect("fecha_fin" in payload).toBe(false);
  });

  test("al salir de Completado limpia fecha_fin en el mismo PATCH", () => {
    expect(buildReflectiveStatusPayload(5, 3)).toEqual({ estatus_reflejante: 3, fecha_fin: null });
    expect(buildReflectiveStatusPayload(5, 1)).toEqual({ estatus_reflejante: 1, fecha_fin: null });
  });

  test("entre estatus que no son Completado no toca fecha_fin", () => {
    expect(buildReflectiveStatusPayload(1, 2)).toEqual({ estatus_reflejante: 2 });
    expect(buildReflectiveStatusPayload(6, 4)).toEqual({ estatus_reflejante: 4 });
  });
});

test.describe("buildCorteMangaStatusPayload", () => {
  test("usa la clave estatus_corte y la misma regla de fecha_fin", () => {
    expect(buildCorteMangaStatusPayload(3, 5)).toEqual({ estatus_corte: 5 });
    expect(buildCorteMangaStatusPayload(5, 6)).toEqual({ estatus_corte: 6, fecha_fin: null });
    expect(buildCorteMangaStatusPayload(2, 3)).toEqual({ estatus_corte: 3 });
  });
});

for (const [name, getTransitions, isTerminal] of [
  ["reflejante", getReflectiveTransitions, isReflectiveTerminal],
  ["corte de manga", getCorteMangaTransitions, isCorteMangaTerminal],
] as const) {
  test.describe(`transiciones de ${name}`, () => {
    test("ofrece todos los demás estatus menos Cancelado", () => {
      expect(getTransitions(1)).toEqual([2, 3, 4, 5, 6]);
      expect(getTransitions(5)).toEqual([1, 2, 3, 4, 6]);
      expect(getTransitions(6)).toEqual([1, 2, 3, 4, 5]);
    });

    test("Cancelado es terminal y no tiene destinos", () => {
      expect(isTerminal(7)).toBe(true);
      expect(getTransitions(7)).toEqual([]);
      expect(isTerminal(5)).toBe(false);
      expect(isTerminal(6)).toBe(false);
    });
  });
}

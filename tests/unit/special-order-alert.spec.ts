import { expect, test } from "@playwright/test";
import {
  isAtrasadoActivo,
  sortAtrasadosFirst,
} from "@/src/features/special-orders/utils/specialOrderAlert";

/**
 * EC-865: la alerta de 24 h solo aplica a pedidos activos. El listado incluye
 * pedidos dados de baja y también los marca `atrasado` (EC-873).
 */
test.describe("isAtrasadoActivo", () => {
  test("solo con activo === true y atrasado === true", () => {
    expect(isAtrasadoActivo({ activo: true, atrasado: true })).toBe(true);
    expect(isAtrasadoActivo({ activo: false, atrasado: true })).toBe(false);
    expect(isAtrasadoActivo({ activo: true, atrasado: false })).toBe(false);
  });

  test("sin `activo` (el backend aún no lo manda) no hay alerta", () => {
    expect(isAtrasadoActivo({ atrasado: true })).toBe(false);
    expect(isAtrasadoActivo({})).toBe(false);
  });
});

test.describe("sortAtrasadosFirst", () => {
  test("atrasados activos primero, cada grupo en el orden del servidor", () => {
    const rows = [
      { id: 1, activo: true, atrasado: false },
      { id: 2, activo: true, atrasado: true },
      { id: 3, activo: false, atrasado: true },
      { id: 4, activo: true, atrasado: true },
      { id: 5 },
    ];
    expect(sortAtrasadosFirst(rows).map((r) => r.id)).toEqual([2, 4, 1, 3, 5]);
  });

  test("sin atrasados activos devuelve el mismo arreglo", () => {
    const rows = [{ id: 1, atrasado: true }, { id: 2, activo: false, atrasado: true }];
    expect(sortAtrasadosFirst(rows)).toBe(rows);
  });
});

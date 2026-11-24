import { expect, test } from "@playwright/test";
import { formatDiasRestantes } from "@/src/features/orders/utils/pedidoFormat";

/** Plazo de la hoja Avances: va tras la fecha, en minúscula y en masculino (EC-932). */
test.describe("formatDiasRestantes", () => {
  test("sin dato no pinta nada", () => {
    expect(formatDiasRestantes(null)).toBeNull();
  });

  test("conserva los textos que ya mostraba", () => {
    expect(formatDiasRestantes(-1)).toBe("vencido hace 1 día");
    expect(formatDiasRestantes(-7)).toBe("vencido hace 7 días");
    expect(formatDiasRestantes(0)).toBe("vence hoy");
    expect(formatDiasRestantes(1)).toBe("falta 1 día");
    expect(formatDiasRestantes(113)).toBe("faltan 113 días");
  });
});

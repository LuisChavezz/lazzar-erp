import { expect, test } from "@playwright/test";
import { entregaLabel } from "@/src/features/special-orders/utils/specialOrderEntrega";

/**
 * Texto de la columna Entrega de pedidos especiales (EC-932), contra el día de
 * México de "ahora": 12:00 de México del 24 nov 2026.
 */
const NOW = new Date("2026-11-24T12:00:00-06:00").getTime();

test.describe("entregaLabel", () => {
  test("vencido: singular y plural, en masculino", () => {
    expect(entregaLabel("2026-11-23", NOW)).toBe("Vencido hace 1 día");
    expect(entregaLabel("2026-11-14T00:00:00Z", NOW)).toBe("Vencido hace 10 días");
  });

  test("hoy, 1 día y N días", () => {
    expect(entregaLabel("2026-11-24", NOW)).toBe("Vence hoy");
    expect(entregaLabel("2026-11-25", NOW)).toBe("Falta 1 día");
    expect(entregaLabel("2027-03-24", NOW)).toBe("Faltan 120 días");
  });

  test("el día es el de México: a las 23:30 de México (ya 25 en UTC) sigue siendo hoy", () => {
    const tarde = new Date("2026-11-24T23:30:00-06:00").getTime();
    expect(entregaLabel("2026-11-24", tarde)).toBe("Vence hoy");
  });

  test("una fecha que no empieza con YYYY-MM-DD no lleva texto", () => {
    expect(entregaLabel("17/03/2027", NOW)).toBeNull();
    expect(entregaLabel("  2027-03-17", NOW)).toBeNull();
    expect(entregaLabel("pendiente", NOW)).toBeNull();
  });
});

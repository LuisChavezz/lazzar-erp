import { expect, test } from "@playwright/test";
import { formatDeadlineText } from "@/src/utils/formatDeadlineText";

/** Texto único de los plazos (EC-932): días-calendario con signo, negativo = vencido. */
test.describe("formatDeadlineText", () => {
  test("vencido: singular y plural, en masculino", () => {
    expect(formatDeadlineText(-1, { gender: "m" })).toBe("Vencido hace 1 día");
    expect(formatDeadlineText(-2, { gender: "m" })).toBe("Vencido hace 2 días");
    expect(formatDeadlineText(-30, { gender: "m" })).toBe("Vencido hace 30 días");
  });

  test("vencida: singular y plural, en femenino", () => {
    expect(formatDeadlineText(-1, { gender: "f" })).toBe("Vencida hace 1 día");
    expect(formatDeadlineText(-24, { gender: "f" })).toBe("Vencida hace 24 días");
  });

  test("hoy: 'Vence hoy' en ambos géneros", () => {
    expect(formatDeadlineText(0, { gender: "m" })).toBe("Vence hoy");
    expect(formatDeadlineText(0, { gender: "f" })).toBe("Vence hoy");
  });

  test("-0 cuenta como hoy", () => {
    expect(formatDeadlineText(-0, { gender: "m" })).toBe("Vence hoy");
  });

  test("falta 1 día (singular) y faltan N días (plural), sin género", () => {
    for (const gender of ["m", "f"] as const) {
      expect(formatDeadlineText(1, { gender })).toBe("Falta 1 día");
      expect(formatDeadlineText(2, { gender })).toBe("Faltan 2 días");
      expect(formatDeadlineText(113, { gender })).toBe("Faltan 113 días");
    }
  });

  test("capitalize: true es el valor por defecto", () => {
    expect(formatDeadlineText(3, { gender: "m", capitalize: true })).toBe(formatDeadlineText(3, { gender: "m" }));
  });

  test("capitalize: false deja todo en minúscula, para ir a media frase", () => {
    expect(formatDeadlineText(-1, { gender: "m", capitalize: false })).toBe("vencido hace 1 día");
    expect(formatDeadlineText(-5, { gender: "f", capitalize: false })).toBe("vencida hace 5 días");
    expect(formatDeadlineText(0, { gender: "f", capitalize: false })).toBe("vence hoy");
    expect(formatDeadlineText(1, { gender: "m", capitalize: false })).toBe("falta 1 día");
    expect(formatDeadlineText(113, { gender: "m", capitalize: false })).toBe("faltan 113 días");
  });
});

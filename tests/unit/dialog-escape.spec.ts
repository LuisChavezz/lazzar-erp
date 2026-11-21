import { expect, test } from "@playwright/test";
import { isEscapeFromSelect } from "../../src/utils/dialogEscape";

test.describe("Escape en MainDialog (EC-922)", () => {
  test("solo un Escape que sale de un <select> se ignora", () => {
    expect(isEscapeFromSelect({ target: { tagName: "SELECT" } as unknown as EventTarget })).toBe(true);
    expect(isEscapeFromSelect({ target: { tagName: "select" } as unknown as EventTarget })).toBe(true);
    for (const tagName of ["INPUT", "TEXTAREA", "BUTTON", "DIV", "BODY"]) {
      expect(isEscapeFromSelect({ target: { tagName } as unknown as EventTarget })).toBe(false);
    }
  });

  test("sin target o con un target sin etiqueta (window, document) cierra como siempre", () => {
    expect(isEscapeFromSelect({ target: null })).toBe(false);
    expect(isEscapeFromSelect({ target: {} as EventTarget })).toBe(false);
  });
});

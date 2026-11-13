import { expect, test } from "@playwright/test";
import { getOnboardingMissingItems } from "@/src/features/product-variant-onboarding/utils/onboardingPrerequisites";

/**
 * EC-887 (revisión): el alta rápida de variante solo avisa "faltan productos"
 * cuando el conteo de una fila RESOLVIÓ en cero. Mientras carga o si falló
 * (`undefined`), el formulario y su selector de producto siguen usables.
 */

const COLORES = [{ id: 1 }];

test("products are missing only when the count resolved to zero", () => {
  expect(getOnboardingMissingItems({ productTotal: 0, colors: COLORES })).toEqual(["Productos"]);
});

test("a pending or failed count never reports missing products", () => {
  expect(getOnboardingMissingItems({ productTotal: undefined, colors: COLORES })).toEqual([]);
});

test("a positive count reports nothing", () => {
  expect(getOnboardingMissingItems({ productTotal: 12, colors: COLORES })).toEqual([]);
});

test("colors are missing only once they loaded empty", () => {
  expect(getOnboardingMissingItems({ productTotal: 3, colors: [] })).toEqual(["Colores"]);
  expect(getOnboardingMissingItems({ productTotal: 3, colors: null })).toEqual([]);
});

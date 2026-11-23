import { expect, test } from "@playwright/test";
import { urlWithoutSearchParam } from "@/src/utils/removeSearchParam";

/** Lo que reescribe `useUrlDetailParam` al cerrar el detalle (EC-935). */
test.describe("urlWithoutSearchParam", () => {
  test("quita el parámetro y conserva el resto de la query", () => {
    expect(urlWithoutSearchParam("/hr/vacations", "?solicitud=4&x=1", "solicitud")).toBe("/hr/vacations?x=1");
    expect(urlWithoutSearchParam("/hr/vacations", "?solicitud=4", "solicitud")).toBe("/hr/vacations");
  });

  test("sin el parámetro no hay nada que reescribir", () => {
    expect(urlWithoutSearchParam("/hr/vacations", "", "solicitud")).toBeNull();
    expect(urlWithoutSearchParam("/hr/vacations", "?x=1", "solicitud")).toBeNull();
  });
});

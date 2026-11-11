import { expect, test } from "@playwright/test";
import { switchableCompanies } from "@/src/features/workspace/utils/switchableCompanies";

/** EC-847: el selector no ofrece la empresa actual ni filas sin id. */

test("excluye la empresa actual", () => {
  expect(switchableCompanies([{ id: 1 }, { id: 55 }, { id: 3 }], 1)).toEqual([{ id: 55 }, { id: 3 }]);
});

test("sin empresa actual ofrece todas", () => {
  expect(switchableCompanies([{ id: 1 }, { id: 55 }], null)).toEqual([{ id: 1 }, { id: 55 }]);
});

test("una empresa sin id no se puede pedir y no se ofrece", () => {
  expect(switchableCompanies([{ id: undefined }, { id: 55 }], 1)).toEqual([{ id: 55 }]);
});

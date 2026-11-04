import { expect, test } from "@playwright/test";
import {
  cobroBankAccountLabel,
  getBlockedCatalogDraftLabels,
} from "@/src/features/collections/utils/cobroDraft";

/**
 * EC-734: al editar un borrador sin permiso para leer los catálogos de clientes
 * o de cuentas bancarias, el selector queda deshabilitado con su motivo, pero
 * muestra el cliente y la cuenta que ya trae el borrador (no "Seleccionar…").
 */

const draft = {
  values: { cliente: 15, cuenta_bancaria: 3 },
  clienteNombre: "Cliente Demo",
  cuentaBancariaLabel: "QA CONCILIACION MXN · MXN",
};

test("con los dos catálogos bloqueados muestra el cliente y la cuenta del borrador", () => {
  expect(getBlockedCatalogDraftLabels(draft, { customers: true, bankAccounts: true })).toEqual({
    customerLabel: "Cliente Demo",
    bankAccountOption: { value: 3, label: "QA CONCILIACION MXN · MXN" },
  });
});

test("con el catálogo legible manda el catálogo (sin etiqueta propia)", () => {
  expect(getBlockedCatalogDraftLabels(draft, { customers: false, bankAccounts: true }).customerLabel).toBeNull();
  expect(getBlockedCatalogDraftLabels(draft, { customers: true, bankAccounts: false }).bankAccountOption).toBeNull();
});

test("en el alta (sin borrador) o sin selección no inventa etiquetas", () => {
  expect(getBlockedCatalogDraftLabels(undefined, { customers: true, bankAccounts: true })).toEqual({
    customerLabel: null,
    bankAccountOption: null,
  });
  const vacio = { ...draft, values: { cliente: 0, cuenta_bancaria: 0 } };
  expect(getBlockedCatalogDraftLabels(vacio, { customers: true, bankAccounts: true })).toEqual({
    customerLabel: null,
    bankAccountOption: null,
  });
});

test("la etiqueta de la cuenta sale de los campos embebidos del cobro", () => {
  expect(
    cobroBankAccountLabel({ cuenta_bancaria: 3, cuenta_bancaria_alias: "Operativa", cuenta_bancaria_moneda_codigo: "USD" }),
  ).toBe("Operativa · USD");
  expect(
    cobroBankAccountLabel({ cuenta_bancaria: 9, cuenta_bancaria_alias: null, cuenta_bancaria_moneda_codigo: null }),
  ).toBe("Cuenta #9");
});

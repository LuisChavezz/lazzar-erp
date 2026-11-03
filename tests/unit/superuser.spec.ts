import { expect, test } from "@playwright/test";
import { isSuperuser } from "@/src/features/users/utils/superuser";

/**
 * EC-714: la escritura de tipos de producto y tallas es solo del superusuario
 * (`SoloSuperusuarioEscribe`). La compuerta falla cerrado.
 */

test("solo is_superuser === true es superusuario", () => {
  expect(isSuperuser({ is_superuser: true })).toBe(true);
});

test("un admin de empresa que no es superusuario no lo es", () => {
  const adminEmpresa = { is_superuser: false, is_admin_empresa: true };
  expect(isSuperuser(adminEmpresa)).toBe(false);
});

test("sin sesión o sin la bandera falla cerrado", () => {
  expect(isSuperuser(undefined)).toBe(false);
  expect(isSuperuser(null)).toBe(false);
  expect(isSuperuser({})).toBe(false);
});

import { expect, test } from "@playwright/test";
import { canEditWorkOrder } from "@/src/utils/workOrderEditAccess";

/**
 * Pruebas unitarias de EC-672: quién edita la ficha de una orden de reflejante
 * o de corte de manga. Debe coincidir con `_require_produccion` del backend
 * (nucleo-erp #786), que deja fuera a `is_staff` aunque la sesión lo marque
 * con el rol "admin".
 */

const OR = "R-PRODUCCION-OR";
const CM = "R-PRODUCCION-CM";

test.describe("canEditWorkOrder", () => {
  test("el superusuario edita aunque su lista de permisos llegue vacía", () => {
    const user = { permissions: [], is_superuser: true, is_admin_empresa: false };
    expect(canEditWorkOrder(user, OR)).toBe(true);
    expect(canEditWorkOrder(user, CM)).toBe(true);
  });

  test("el admin de empresa edita aunque su lista de permisos llegue vacía", () => {
    const user = { permissions: [], is_superuser: false, is_admin_empresa: true };
    expect(canEditWorkOrder(user, OR)).toBe(true);
    expect(canEditWorkOrder(user, CM)).toBe(true);
  });

  test("quien tiene el código de la ruta edita solo esa ficha", () => {
    const user = { permissions: ["R-PRODUCCION", OR], is_superuser: false, is_admin_empresa: false };
    expect(canEditWorkOrder(user, OR)).toBe(true);
    expect(canEditWorkOrder(user, CM)).toBe(false);
  });

  test("un usuario solo is_staff (rol admin por es_admin) queda de solo lectura", () => {
    const user = { role: "admin", permissions: [], is_superuser: false, is_admin_empresa: false };
    expect(canEditWorkOrder(user, OR)).toBe(false);
    expect(canEditWorkOrder(user, CM)).toBe(false);
  });

  test("sin permisos, o sin sesión, queda de solo lectura", () => {
    const user = { role: "user", permissions: ["R-PRODUCCION"], is_superuser: false, is_admin_empresa: false };
    expect(canEditWorkOrder(user, OR)).toBe(false);
    expect(canEditWorkOrder(null, OR)).toBe(false);
    expect(canEditWorkOrder(undefined, CM)).toBe(false);
  });

  test("una sesión sin las banderas de admin falla cerrado", () => {
    const user = { role: "admin", permissions: [] };
    expect(canEditWorkOrder(user, OR)).toBe(false);
  });
});

import { expect, test } from "@playwright/test";
import {
  canDeleteWorkOrderAvance,
  canEditWorkOrder,
  WORK_ORDER_DELETE_PERMISSION,
  WORK_ORDER_EDIT_PERMISSION,
} from "@/src/utils/workOrderEditAccess";

/**
 * Pruebas unitarias de EC-672: quién edita la ficha de una orden de reflejante
 * o de corte de manga. Debe coincidir con `_require_produccion` del backend
 * (nucleo-erp #786), que deja fuera a `is_staff`. Desde EC-673 la sesión ya
 * no le da el rol "admin" y el `jwt` corrige los tokens anteriores que traen
 * las banderas; uno sin ellas conserva ese rol. Aquí el rol no cuenta: solo
 * las banderas o el código de EDICIÓN de la sección (`E-`, EC-895), que rige
 * la ficha y sus avances.
 */

const OR = WORK_ORDER_EDIT_PERMISSION.OR;
const CM = WORK_ORDER_EDIT_PERMISSION.CM;

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

  test("quien tiene el E- de una sección edita solo esa ficha y sus avances", () => {
    const user = { permissions: ["R-PRODUCCION", "R-PRODUCCION-OR", OR], is_superuser: false, is_admin_empresa: false };
    expect(canEditWorkOrder(user, OR)).toBe(true);
    expect(canEditWorkOrder(user, CM)).toBe(false);
  });

  test("el código de lectura de la sección ya no basta para editar (EC-895)", () => {
    const user = {
      permissions: ["R-PRODUCCION", "R-PRODUCCION-OR", "R-PRODUCCION-CM", "C-PRODUCCION-OR", "D-PRODUCCION-CM"],
      is_superuser: false,
      is_admin_empresa: false,
    };
    expect(canEditWorkOrder(user, OR)).toBe(false);
    expect(canEditWorkOrder(user, CM)).toBe(false);
  });

  test("un token emitido antes de EC-673 con rol admin por is_staff queda de solo lectura", () => {
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

  test("una sesión sin las banderas de admin falla cerrado aunque traiga rol admin", () => {
    const user = { role: "admin", permissions: [] };
    expect(canEditWorkOrder(user, OR)).toBe(false);
    // Con una sola bandera tampoco se sabe (misma regla que `useCompanyAdminStatus`).
    const partial = { role: "admin", permissions: [], is_superuser: true };
    expect(canEditWorkOrder(partial, CM)).toBe(false);
  });
});

test.describe("canDeleteWorkOrderAvance (EC-895)", () => {
  const D_OR = WORK_ORDER_DELETE_PERMISSION.OR;
  const D_CM = WORK_ORDER_DELETE_PERMISSION.CM;
  const flags = { is_superuser: false, is_admin_empresa: false };

  test("los códigos son los del catálogo", () => {
    expect([OR, CM, D_OR, D_CM]).toEqual(["E-PRODUCCION-OR", "E-PRODUCCION-CM", "D-PRODUCCION-OR", "D-PRODUCCION-CM"]);
  });

  test("con solo E- registra avances pero no los borra", () => {
    const user = { permissions: ["R-PRODUCCION-OR", "R-PRODUCCION-CM", OR, CM], ...flags };
    expect(canEditWorkOrder(user, OR)).toBe(true);
    expect(canEditWorkOrder(user, CM)).toBe(true);
    expect(canDeleteWorkOrderAvance(user, D_OR)).toBe(false);
    expect(canDeleteWorkOrderAvance(user, D_CM)).toBe(false);
  });

  test("con E- y D- de una sección borra solo en esa sección", () => {
    const user = { permissions: [OR, D_OR, CM], ...flags };
    expect(canDeleteWorkOrderAvance(user, D_OR)).toBe(true);
    expect(canDeleteWorkOrderAvance(user, D_CM)).toBe(false);
  });

  test("superusuario y admin de empresa borran; sin sesión no", () => {
    expect(canDeleteWorkOrderAvance({ permissions: [], is_superuser: true, is_admin_empresa: false }, D_OR)).toBe(true);
    expect(canDeleteWorkOrderAvance({ permissions: [], is_superuser: false, is_admin_empresa: true }, D_CM)).toBe(true);
    expect(canDeleteWorkOrderAvance(null, D_OR)).toBe(false);
  });
});

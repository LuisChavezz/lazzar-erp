import { expect, test } from "@playwright/test";
import { getRefreshedTokenRole, getSessionRole } from "@/src/lib/sessionRole";

/**
 * Pruebas unitarias de EC-673: el rol "admin" de la sesión (el que
 * `hasPermission` cortocircuita) es el mismo atajo que `tiene_permiso` del
 * backend, superusuario o admin de empresa. `es_admin` / `is_staff` no cuentan.
 */

test.describe("getSessionRole", () => {
  test("el superusuario es admin", () => {
    expect(getSessionRole({ is_superuser: true, is_admin_empresa: false })).toBe("admin");
  });

  test("el admin de empresa es admin", () => {
    expect(getSessionRole({ is_superuser: false, is_admin_empresa: true })).toBe("admin");
  });

  test("un usuario solo is_staff (es_admin del backend) es user", () => {
    const payload = { es_admin: true, is_staff: true, is_superuser: false, is_admin_empresa: false };
    expect(getSessionRole(payload)).toBe("user");
  });

  test("un usuario sin banderas de admin es user", () => {
    expect(getSessionRole({ is_superuser: false, is_admin_empresa: false })).toBe("user");
  });
});

test.describe("getRefreshedTokenRole", () => {
  test("un token de antes de EC-673 con rol admin por is_staff baja a user", () => {
    const token = { role: "admin", is_superuser: false, is_admin_empresa: false };
    expect(getRefreshedTokenRole(token)).toBe("user");
  });

  test("un admin de empresa o superusuario conserva admin", () => {
    expect(getRefreshedTokenRole({ role: "admin", is_superuser: false, is_admin_empresa: true })).toBe("admin");
    expect(getRefreshedTokenRole({ role: "admin", is_superuser: true, is_admin_empresa: false })).toBe("admin");
  });

  test("un token sin las banderas conserva el rol que traía", () => {
    expect(getRefreshedTokenRole({ role: "admin" })).toBe("admin");
    expect(getRefreshedTokenRole({ role: "user" })).toBe("user");
    // Con una sola bandera tampoco hay con qué recalcular.
    expect(getRefreshedTokenRole({ role: "admin", is_superuser: false })).toBe("admin");
  });
});

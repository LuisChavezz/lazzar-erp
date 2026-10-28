import { expect, test } from "@playwright/test";
import { isTransferCandidate } from "@/src/features/opportunities/utils/transferCandidates";
import type { Role } from "@/src/features/roles/interfaces/role.interface";
import type { User } from "@/src/features/users/interfaces/user.interface";

/**
 * Pruebas unitarias de EC-613: quién puede recibir una oportunidad en
 * "Transferir". Replican la regla de `transferir/` del backend
 * (`claves_departamento_usuario`): usuario activo con un rol activo de
 * `VENTAS` o `MESACONTROLYVENTAS`. Corren con `npm run test:unit`.
 */

const role = (id: number, overrides: Partial<Role> = {}): Role => ({
  id,
  permisos_count: 0,
  codigo: `rol-${id}`,
  nombre: `Rol ${id}`,
  descripcion: "",
  clave_departamento: "VENTAS",
  is_system: false,
  estatus: "activo",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  empresa: 1,
  ...overrides,
});

const user = (overrides: Partial<User> = {}): User => ({
  id: 10,
  username: "vendedor",
  email: "vendedor@example.test",
  first_name: "",
  last_name: "",
  is_active: true,
  estatus: "activo",
  empresa: 1,
  sucursal_default: 1,
  sucursales: [1],
  departamentos: [],
  telefono: "",
  avatar_url: null,
  is_admin_empresa: false,
  is_superuser: false,
  date_joined: "2026-10-01T00:00:00Z",
  last_login: null,
  roles_ids: [1],
  ...overrides,
});

const byId = (...roles: Role[]) => new Map(roles.map((r) => [r.id, r]));

test.describe("isTransferCandidate", () => {
  test("acepta un usuario activo con rol activo de VENTAS", () => {
    expect(isTransferCandidate(user(), byId(role(1)))).toBe(true);
  });

  test("acepta MESACONTROLYVENTAS", () => {
    expect(isTransferCandidate(user(), byId(role(1, { clave_departamento: "MESACONTROLYVENTAS" })))).toBe(true);
  });

  test("normaliza espacios y minúsculas en la clave", () => {
    expect(isTransferCandidate(user(), byId(role(1, { clave_departamento: "  ventas " })))).toBe(true);
  });

  test("rechaza CONTAVENTAS y MESACONTROL", () => {
    for (const clave of ["CONTAVENTAS", "MESACONTROL"]) {
      expect(isTransferCandidate(user(), byId(role(1, { clave_departamento: clave })))).toBe(false);
    }
  });

  test("rechaza una clave null", () => {
    expect(isTransferCandidate(user(), byId(role(1, { clave_departamento: null })))).toBe(false);
  });

  test("rechaza un rol inactivo", () => {
    expect(isTransferCandidate(user(), byId(role(1, { estatus: "inactivo" })))).toBe(false);
  });

  test("rechaza un rol que no está en el catálogo", () => {
    expect(isTransferCandidate(user({ roles_ids: [99] }), byId(role(1)))).toBe(false);
  });

  test("rechaza un usuario inactivo", () => {
    expect(isTransferCandidate(user({ is_active: false }), byId(role(1)))).toBe(false);
  });

  test("rechaza un usuario bloqueado aunque is_active sea true", () => {
    expect(isTransferCandidate(user({ estatus: "bloqueado" }), byId(role(1)))).toBe(false);
  });

  test("basta con un rol de Ventas entre varios", () => {
    const roles = byId(role(1, { clave_departamento: "WMS" }), role(2));
    expect(isTransferCandidate(user({ roles_ids: [1, 2] }), roles)).toBe(true);
  });
});

import { expect, test } from "@playwright/test";
import { applyEmpresaUpdate, parseSessionEmpresa } from "@/src/lib/sessionEmpresa";

/**
 * EC-842: la empresa de la sesión sale del `empresa` entero de `/auth/user/`
 * y el cliente solo puede tocar esa clave del token con `update()`.
 */

test.describe("parseSessionEmpresa", () => {
  test("acepta un pk entero positivo", () => {
    expect(parseSessionEmpresa(7)).toBe(7);
  });

  test("null es 'sin empresa'", () => {
    expect(parseSessionEmpresa(null)).toBeNull();
  });

  test("cualquier otra forma es inválida (undefined)", () => {
    for (const value of [undefined, 0, -1, 1.5, "7", {}, true]) {
      expect(parseSessionEmpresa(value)).toBeUndefined();
    }
  });
});

test.describe("applyEmpresaUpdate", () => {
  const token = { role: "user", permissions: ["R-CRM"], empresa: 1 as number | null };

  test("escribe la empresa nueva", () => {
    expect(applyEmpresaUpdate(token, { empresa: 2 })).toEqual({ ...token, empresa: 2 });
  });

  test("escribe null explícito", () => {
    expect(applyEmpresaUpdate(token, { empresa: null })).toEqual({ ...token, empresa: null });
  });

  test("completa un token anterior a EC-842 sin la clave", () => {
    const old: { role: string; empresa?: number | null } = { role: "user" };
    expect(applyEmpresaUpdate(old, { empresa: 3 })).toEqual({ role: "user", empresa: 3 });
  });

  test("ignora un payload sin la clave o con forma inválida", () => {
    for (const payload of [undefined, null, "x", {}, { empresa: "2" }, { empresa: 0 }]) {
      expect(applyEmpresaUpdate(token, payload)).toBe(token);
    }
  });

  test("nunca toma otras claves del cliente", () => {
    const next = applyEmpresaUpdate(token, { empresa: 2, role: "admin", permissions: [] });
    expect(next.role).toBe("user");
    expect(next.permissions).toEqual(["R-CRM"]);
  });
});

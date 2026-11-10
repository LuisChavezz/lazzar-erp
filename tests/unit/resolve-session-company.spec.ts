import { expect, test } from "@playwright/test";
import { resolveSessionCompany } from "@/src/features/workspace/utils/resolveSessionCompany";

/**
 * EC-842: "sin empresa" solo se afirma cuando está confirmado; un token sin la
 * clave (anterior a EC-842) nunca se lee como "sin empresa".
 */

const SYNCS = ["pending", "done", "failed"] as const;

test.describe("resolveSessionCompany", () => {
  test("sin sesión autenticada es loading", () => {
    for (const sync of SYNCS) {
      expect(resolveSessionCompany({ authenticated: false, empresa: 1, sync })).toEqual({
        status: "loading",
        companyId: null,
      });
    }
  });

  test("token sin la clave: loading mientras sincroniza o tras sincronizar, unknown si falla, nunca none", () => {
    expect(resolveSessionCompany({ authenticated: true, empresa: undefined, sync: "pending" }).status).toBe("loading");
    expect(resolveSessionCompany({ authenticated: true, empresa: undefined, sync: "done" }).status).toBe("loading");
    expect(resolveSessionCompany({ authenticated: true, empresa: undefined, sync: "failed" }).status).toBe("unknown");
  });

  test("null explícito antes de terminar la sincronización es loading", () => {
    expect(resolveSessionCompany({ authenticated: true, empresa: null, sync: "pending" })).toEqual({
      status: "loading",
      companyId: null,
    });
  });

  test("null tras sincronizar (o con la sincronización fallida) es none", () => {
    expect(resolveSessionCompany({ authenticated: true, empresa: null, sync: "done" }).status).toBe("none");
    expect(resolveSessionCompany({ authenticated: true, empresa: null, sync: "failed" }).status).toBe("none");
  });

  test("empresa numérica es ready en cualquier estado de sincronización", () => {
    for (const sync of SYNCS) {
      expect(resolveSessionCompany({ authenticated: true, empresa: 7, sync })).toEqual({
        status: "ready",
        companyId: 7,
      });
    }
  });

  test("empresa cambiada por la sincronización: el token nuevo manda", () => {
    const before = resolveSessionCompany({ authenticated: true, empresa: 1, sync: "pending" });
    const after = resolveSessionCompany({ authenticated: true, empresa: 2, sync: "done" });
    expect(before).toEqual({ status: "ready", companyId: 1 });
    expect(after).toEqual({ status: "ready", companyId: 2 });
    // Y si la sincronización le quitó la empresa, pasa a none (no se queda en la anterior).
    expect(resolveSessionCompany({ authenticated: true, empresa: null, sync: "done" }).status).toBe("none");
  });
});

import { expect, test } from "@playwright/test";
import {
  SESSION_RECOVERY_DELAYS_MS,
  classifySessionResponse,
} from "@/src/features/auth/utils/sessionRecovery";
import {
  getSidebarSectionsForSession,
  sidebarItemRequiresPermission,
} from "@/src/utils/getSidebarItems";
import { getRouteSectionsForSession } from "@/src/utils/routeSections";
import { appRouteGroups } from "@/src/constants/appRoutes";

/**
 * EC-767: recuperación de la sesión de NextAuth en el cliente y secciones del
 * sidebar mientras la sesión está pendiente.
 */

test.describe("classifySessionResponse", () => {
  test("una sesión con usuario es 'session'", () => {
    expect(classifySessionResponse(true, { user: { email: "a@b.c" }, expires: "x" })).toBe("session");
  });

  test("un objeto vacío con 200 es 'none' (definitivo, no se reintenta)", () => {
    expect(classifySessionResponse(true, {})).toBe("none");
  });

  test("status no 2xx es 'failed' aunque el cuerpo parezca válido", () => {
    expect(classifySessionResponse(false, {})).toBe("failed");
    expect(classifySessionResponse(false, { user: { email: "a@b.c" } })).toBe("failed");
  });

  test("cuerpos inesperados son 'failed'", () => {
    expect(classifySessionResponse(true, null)).toBe("failed");
    expect(classifySessionResponse(true, [])).toBe("failed");
    expect(classifySessionResponse(true, "html")).toBe("failed");
    expect(classifySessionResponse(true, { message: "error" })).toBe("failed");
    expect(classifySessionResponse(true, { user: null })).toBe("failed");
  });
});

test("los reintentos son finitos y crecientes", () => {
  expect(SESSION_RECOVERY_DELAYS_MS.length).toBeGreaterThan(0);
  for (let i = 1; i < SESSION_RECOVERY_DELAYS_MS.length; i++) {
    expect(SESSION_RECOVERY_DELAYS_MS[i]).toBeGreaterThan(SESSION_RECOVERY_DELAYS_MS[i - 1]);
  }
});

test.describe("getSidebarSectionsForSession", () => {
  test("pendiente: estructura completa, Inicio real y lo protegido como skeleton", () => {
    const sections = getSidebarSectionsForSession("/operations/orders", undefined, true);
    const items = sections.flatMap((section) => section.items);
    const home = items.find((item) => item.href === "/");
    expect(home?.isPlaceholder).toBe(false);
    for (const item of items) {
      expect(item.isPlaceholder).toBe(sidebarItemRequiresPermission(item));
    }
    // Configuración exige R-CONFIGURACION: también es skeleton.
    expect(items.find((item) => item.href === "/config")?.isPlaceholder).toBe(true);
  });

  test("resuelta sin usuario: solo lo que no exige permiso, nada como skeleton", () => {
    const items = getSidebarSectionsForSession("/operations/orders", undefined, false).flatMap(
      (section) => section.items
    );
    expect(items.every((item) => !item.isPlaceholder)).toBe(true);
    expect(items.every((item) => !sidebarItemRequiresPermission(item))).toBe(true);
  });

  test("resuelta con admin: igual que la pendiente pero sin skeletons", () => {
    const admin = { role: "admin", permissions: [] };
    const pending = getSidebarSectionsForSession("/procurement/purchase-orders", undefined, true);
    const resolved = getSidebarSectionsForSession("/procurement/purchase-orders", admin, false);
    expect(resolved.flatMap((s) => s.items.map((i) => i.href))).toEqual(
      pending.flatMap((s) => s.items.map((i) => i.href))
    );
  });
});

test("getRouteSectionsForSession: pendiente marca las hojas con permiso", () => {
  const group = appRouteGroups.find((candidate) => candidate.sections);
  expect(group).toBeDefined();
  const pending = getRouteSectionsForSession(group!, undefined, true) ?? [];
  const leaves = pending.flatMap((section) => section.items);
  expect(leaves.length).toBeGreaterThan(0);
  for (const leaf of leaves) {
    expect(leaf.isPlaceholder).toBe(Boolean(leaf.permission));
  }
  const resolved = getRouteSectionsForSession(group!, { role: "admin", permissions: [] }, false) ?? [];
  expect(resolved.flatMap((section) => section.items).every((leaf) => !leaf.isPlaceholder)).toBe(true);
});

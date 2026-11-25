import { expect, test } from "@playwright/test";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { routePermissions } from "@/src/constants/routePermissions";
import { getSidebarItems } from "@/src/utils/getSidebarItems";
import { canAccessRoute, findRoutePermissionRule } from "@/src/utils/routeAccess";
import { getRouteSectionsForSession, getVisibleRouteSections } from "@/src/utils/routeSections";
import { permissionRequirementCodes } from "@/src/utils/permissions";

/**
 * EC-960 (#274): el permiso de cada hoja de `appRoutes` se deriva de su `path`
 * con la misma regla que el proxy (`getRouteRequirement`). Estas pruebas fijan
 * que el sidebar, los sub-grupos de `ModuleNav` y el landing del módulo nunca
 * ofrecen una hoja que el proxy rebotaría, ni ocultan una que dejaría abrir.
 */

const perfil = (...permissions: string[]) => ({ role: "user", permissions });

// Un perfil por cada código que exige alguna regla, más combinaciones que
// cruzan secciones de Finanzas (lectura jerárquica) y los dos extremos.
const codes = [...new Set(routePermissions.flatMap((rule) => permissionRequirementCodes(rule.permission)))];
const profiles = [
  { role: "admin", permissions: [] },
  perfil(),
  ...codes.map((code) => perfil(code)),
  perfil("R-CONTABILIDAD-FACTURACION", "R-CONTABILIDAD-CXC"),
];
const profileLabel = (profile: { role: string; permissions: string[] }) =>
  `${profile.role}[${profile.permissions.join(",")}]`;

const allLeaves = appRouteGroups.flatMap((group) => group.items.map((item) => ({ group, item })));

test("cada hoja de appRoutes tiene una regla en routePermissions", () => {
  expect(allLeaves.length).toBeGreaterThan(0);
  const sinRegla = allLeaves
    .filter(({ item }) => !findRoutePermissionRule(item.path))
    .map(({ group, item }) => `${group.key}/${item.key} (${item.path})`);
  // Sin regla la hoja no tendría permiso y el sidebar la mostraría a todos.
  expect(sinRegla).toEqual([]);
});

for (const group of appRouteGroups.filter((g) => g.items.some((item) => item.showInSidebar !== false))) {
  const navigable = group.items.filter((item) => item.showInSidebar !== false);

  test(`${group.key}: el sidebar lista exactamente las hojas que el proxy deja abrir`, () => {
    for (const profile of profiles) {
      const expected = navigable
        .filter((item) => canAccessRoute(item.path, profile))
        .map((item) => item.path);
      const sidebar = getSidebarItems(profile, navigable[0].path)
        .flatMap((section) => section.items.map((item) => item.href))
        .filter((href) => navigable.some((item) => item.path === href));
      expect(sidebar, profileLabel(profile)).toEqual(expected);

      const sections = getVisibleRouteSections(group, profile);
      if (sections) {
        const leaves = sections.flatMap((section) => section.items.map((item) => item.path));
        expect([...leaves].sort(), profileLabel(profile)).toEqual([...expected].sort());
      }
    }
  });

  if (group.sections) {
    test(`${group.key}: mientras la sesión carga, toda hoja es un skeleton`, () => {
      const pending = getRouteSectionsForSession(group, undefined, true) ?? [];
      const leaves = pending.flatMap((section) => section.items);
      expect(leaves.length).toBe(navigable.length);
      expect(leaves.every((leaf) => leaf.isPlaceholder)).toBe(true);
    });
  }
}

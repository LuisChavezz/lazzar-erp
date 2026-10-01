import type { AppRouteGroup, AppRouteItem } from "../constants/appRoutes";
import type { PermissionContext } from "../interfaces/permission-context.interface";
import { hasPermission } from "./permissions";

/** Sub-grupo de navegación con las hojas que le tocan. */
export interface RouteSection {
  key: string;
  label: string;
  items: AppRouteItem[];
}

/**
 * Clave del sub-grupo de respaldo que recoge las hojas sin `section` válido.
 * Nunca debería aparecer en producción: si aparece, falta asignar `section` en
 * `appRoutes` (en desarrollo se avisa por consola).
 */
const UNSECTIONED_KEY = "__unsectioned";

// Un aviso por hoja: el helper corre en cada render del sidebar y de ModuleNav.
const warnedItemKeys = new Set<string>();

const warnUnsectioned = (group: AppRouteGroup, item: AppRouteItem) => {
  if (process.env.NODE_ENV !== "development" || warnedItemKeys.has(item.key)) {
    return;
  }
  warnedItemKeys.add(item.key);
  const reason = item.section
    ? `su section "${item.section}" no está declarada en \`sections\``
    : "no tiene `section`";
  console.warn(
    `[appRoutes] La hoja "${item.key}" del módulo "${group.key}" ${reason}. ` +
      `Se muestra al final, en un sub-grupo de respaldo "${group.moduleLabel}".`
  );
};

/** Misma regla de visibilidad por hoja que el sidebar y `ModuleNav` en plano. */
const canSeeItem = (item: AppRouteItem, context?: PermissionContext | null) =>
  item.permission ? hasPermission(item.permission, context) : true;

/**
 * Sub-grupos del módulo con TODAS sus hojas navegables, sin filtrar permisos
 * (sirve para dimensionar skeletons mientras carga la sesión). `null` si el
 * grupo no declara `sections`: el consumidor debe navegarlo plano.
 *
 * Una hoja sin `section`, o con una que no está en `sections`, no se descarta:
 * va a un sub-grupo de respaldo al final y se avisa en desarrollo.
 */
export const getRouteSections = (group: AppRouteGroup): RouteSection[] | null => {
  if (!group.sections) {
    return null;
  }

  const declaredKeys = new Set(group.sections.map((section) => section.key));
  // Las rutas ocultas (detalle, alta) no se listan en ninguna superficie.
  const navigableItems = group.items.filter((item) => item.showInSidebar !== false);

  const sections: RouteSection[] = group.sections.map((section) => ({
    key: section.key,
    label: section.label,
    items: navigableItems.filter((item) => item.section === section.key),
  }));

  const unsectionedItems = navigableItems.filter(
    (item) => !item.section || !declaredKeys.has(item.section)
  );
  if (unsectionedItems.length === 0) {
    return sections;
  }

  unsectionedItems.forEach((item) => warnUnsectioned(group, item));
  return [
    ...sections,
    { key: UNSECTIONED_KEY, label: group.moduleLabel, items: unsectionedItems },
  ];
};

/**
 * Poda sobre sub-grupos ya resueltos con `getRouteSections`: cada uno solo con
 * las hojas que el permiso del usuario permite, y sin los que quedan vacíos.
 * Útil cuando el consumidor también necesita la lista sin filtrar (skeletons)
 * y no quiere resolverla dos veces.
 */
export const filterVisibleRouteSections = (
  sections: RouteSection[],
  context?: PermissionContext | null
): RouteSection[] =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeItem(item, context)),
    }))
    .filter((section) => section.items.length > 0);

/**
 * Sub-grupos que ESTE usuario ve (ver `filterVisibleRouteSections`). Es la
 * única fuente de visibilidad del sidebar, de los menús de `ModuleNav` y del
 * landing del módulo, para que las tres superficies muestren exactamente lo
 * mismo. `null` si el grupo no declara `sections`.
 */
export const getVisibleRouteSections = (
  group: AppRouteGroup,
  context?: PermissionContext | null
): RouteSection[] | null => {
  const sections = getRouteSections(group);
  return sections ? filterVisibleRouteSections(sections, context) : null;
};

/**
 * Sub-grupo de la ruta actual: el de la hoja cuyo `path` es la ruta o un
 * prefijo suyo (gana el más largo).
 *
 * Es la MISMA coincidencia por prefijo con la que `SidebarItem` y `ModuleNav`
 * marcan la hoja activa, así que el sub-grupo activo y la hoja resaltada nunca
 * discrepan. Las rutas ocultas de detalle se resuelven por eso mismo: su URL
 * cuelga de la de su `parentPath` (`/sales/customers/[id]` bajo
 * `/sales/customers`). Una ruta oculta que NO colgara de su padre no
 * resolvería sub-grupo, igual que hoy no resalta ninguna hoja.
 */
export const findActiveRouteSection = (
  sections: RouteSection[],
  pathname: string
): RouteSection | undefined => {
  let activeSection: RouteSection | undefined;
  let longestMatch = -1;

  for (const section of sections) {
    for (const item of section.items) {
      const matches = pathname === item.path || pathname.startsWith(`${item.path}/`);
      if (matches && item.path.length > longestMatch) {
        activeSection = section;
        longestMatch = item.path.length;
      }
    }
  }

  return activeSection;
};

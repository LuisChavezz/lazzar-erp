import { getSidebarSectionsByPath, type SidebarItem } from "../constants/sidebarItems";
import { PermissionContext } from "../interfaces/permission-context.interface";
import { getModuleEntryHref } from "./moduleEntry";
import { hasAnyPermission, meetsPermissionRequirement } from "./permissions";

/**
 * ¿Se le muestra este acceso al usuario?
 *
 * `permissionAnyOf` (items de MÓDULO) se satisface con CUALQUIERA de sus
 * códigos; `permission` (sub-rutas) exige ese código exacto, o uno de la lista
 * si es un arreglo (lectura jerárquica de Finanzas). Sin código, visible.
 */
const canSeeItem = (item: SidebarItem, context?: PermissionContext | null) => {
  if (item.permissionAnyOf?.length) {
    return hasAnyPermission(item.permissionAnyOf, context);
  }
  return item.permission ? meetsPermissionRequirement(item.permission, context) : true;
};

/**
 * El acceso tal como se le pinta al usuario, o `null` si no se le ofrece. Un
 * item de MÓDULO lleva al destino de `getModuleEntryHref` (la portada o, si el
 * proxy no lo deja entrar en ella, su primera sección abrible) y no se ofrece
 * si no hay ninguno.
 */
const resolveItem = (item: SidebarItem, context?: PermissionContext | null): SidebarItem | null => {
  if (!canSeeItem(item, context)) return null;
  if (!item.entryGroup) return item;
  const href = getModuleEntryHref(item.entryGroup, context);
  return href ? { ...item, href } : null;
};

export const getSidebarItems = (
  context?: PermissionContext | null,
  pathname: string = "/"
) =>
  getSidebarSectionsByPath(pathname)
    .map((section) => ({
      ...section,
      items: section.items.flatMap((item) => {
        const resolved = resolveItem(item, context);
        return resolved ? [resolved] : [];
      }),
    }))
    .filter((section) => section.items.length > 0);

/**
 * ¿La visibilidad de este acceso depende de los permisos de la sesión? Mismo
 * criterio que `canSeeItem`: sin código, se ve siempre (p. ej. "Inicio").
 */
export const sidebarItemRequiresPermission = (item: SidebarItem) =>
  Boolean(item.permissionAnyOf?.length || item.permission);

/** Acceso del sidebar listo para pintar: real o, si `isPlaceholder`, skeleton. */
export type SidebarEntry = SidebarItem & { isPlaceholder: boolean };

export interface SidebarEntrySection {
  title?: string;
  items: SidebarEntry[];
}

/**
 * Secciones del sidebar según el estado de la sesión (EC-767).
 *
 * Mientras la sesión está pendiente (carga o se está recuperando) se devuelve la
 * estructura SIN filtrar —el máximo que puede ver el usuario, así el menú solo
 * se encoge al llegar los permisos— y cada acceso que depende de un permiso va
 * como `isPlaceholder`. Los que no dependen de ninguno salen reales desde el
 * primer pintado. Con la sesión resuelta, es `getSidebarItems` tal cual.
 */
export const getSidebarSectionsForSession = (
  pathname: string,
  context: PermissionContext | null | undefined,
  isSessionPending: boolean
): SidebarEntrySection[] =>
  isSessionPending
    ? getSidebarSectionsByPath(pathname).map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          isPlaceholder: sidebarItemRequiresPermission(item),
        })),
      }))
    : getSidebarItems(context, pathname).map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, isPlaceholder: false })),
      }));

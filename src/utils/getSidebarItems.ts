import { getSidebarSectionsByPath, type SidebarItem } from "../constants/sidebarItems";
import { PermissionContext } from "../interfaces/permission-context.interface";
import { getModuleEntryHref } from "./moduleEntry";
import { meetsPermissionRequirement } from "./permissions";

/**
 * El acceso tal como se le pinta al usuario, o `null` si no se le ofrece.
 *
 * - Item de MÓDULO (`entryGroup`): se ofrece si y solo si tiene destino de
 *   entrada (`getModuleEntryHref`: la portada o, si el proxy no lo deja entrar
 *   en ella, su primera sección abrible), y lleva a ese destino. Visibilidad y
 *   destino salen así de la misma regla (EC-813).
 * - Resto: `permission` exige ese código, o uno de la lista si es un arreglo
 *   (lectura jerárquica de Finanzas). Sin código, visible.
 */
const resolveItem = (item: SidebarItem, context?: PermissionContext | null): SidebarItem | null => {
  if (item.entryGroup) {
    const href = getModuleEntryHref(item.entryGroup, context);
    return href ? { ...item, href } : null;
  }
  if (item.permission && !meetsPermissionRequirement(item.permission, context)) return null;
  return item;
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
 * ¿La visibilidad de este acceso depende de los permisos de la sesión? Sin
 * código, se ve siempre (p. ej. "Inicio"); con él, es un skeleton mientras la
 * sesión carga.
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

import type React from "react";
import { HomeIcon } from "../components/Icons";
import { appRouteGroups, getGroupAccessPermissions, type AppRouteGroup } from "./appRoutes";
import type { PermissionRequirement } from "../utils/permissions";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Un código, o un arreglo que se cumple con CUALQUIERA (ver `AppRouteItem.permission`). */
  permission?: PermissionRequirement;
  /**
   * Items de MÓDULO: los códigos que pueden darle acceso (el del módulo y los
   * de sus secciones navegables, `getGroupAccessPermissions`). Solo marca que
   * su visibilidad depende de la sesión (skeleton mientras carga); la decide
   * `entryGroup`.
   */
  permissionAnyOf?: string[];
  /**
   * Items de MÓDULO: su grupo. `href` es entonces solo el valor por defecto
   * (`modulePath`); `getSidebarItems` resuelve con `getModuleEntryHref` el
   * destino real y si se ofrece (EC-813): la portada exige el código de módulo
   * y quien solo tiene una sección sería rebotado.
   */
  entryGroup?: AppRouteGroup;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

const homeItem: SidebarItem = {
  label: "Inicio",
  href: "/",
  icon: HomeIcon,
};

// Agrupa los módulos principales que se muestran en Home y navegación principal.
// Única fuente: `Sidebar` y `MobileSidebar` la importan para decidir si pintan
// el bloque de módulo activo.
export const mainGroupKeys = new Set([
  "system",
  "sales",
  "wms",
  "procurement",
  "manufacturing",
  "finance",
  "hr",
  "operations",
]);

// Agrupa accesos de cuenta y configuración para mostrarlos en la sección inferior.
const settingsGroupKeys = new Set(["settings", "config"]);

const mapGroupToSidebarItem = (group: (typeof appRouteGroups)[number]): SidebarItem => ({
  label: group.moduleLabel,
  href: group.modulePath,
  icon: group.moduleIcon,
  permissionAnyOf: getGroupAccessPermissions(group),
  entryGroup: group,
});

const getActiveGroup = (pathname: string) =>
  appRouteGroups.find(
    (group) =>
      pathname === group.modulePath || pathname.startsWith(`${group.modulePath}/`)
  );

export const getSidebarItemsByPath = (pathname: string): SidebarItem[] => {
  const normalizedPath = pathname || "/";
  const isHome = normalizedPath === "/";
  const isConfig = normalizedPath === "/config" || normalizedPath.startsWith("/config/");

  // En Home y Configuración se listan módulos principales como navegación global.
  if (isHome || isConfig) {
    return [
      homeItem,
      ...appRouteGroups
        .filter((group) => group.showInHome !== false && mainGroupKeys.has(group.key))
        .map(mapGroupToSidebarItem),
    ];
  }

  const activeGroup = getActiveGroup(normalizedPath);
  // Si no hay coincidencia de módulo, se mantiene la navegación global principal.
  if (!activeGroup) {
    return [
      homeItem,
      ...appRouteGroups
        .filter((group) => group.showInHome !== false && mainGroupKeys.has(group.key))
        .map(mapGroupToSidebarItem),
    ];
  }

  const moduleItems = activeGroup.items
    .filter((item) => item.showInSidebar !== false)
    .map((item) => ({
      label: item.label,
      href: item.path,
      icon: item.icon,
      permission: item.permission,
    }));

  // Cuando un módulo no tiene subitems visibles, se muestra solo el acceso raíz del módulo.
  if (moduleItems.length === 0) {
    return [
      homeItem,
      {
        label: activeGroup.moduleLabel,
        href: activeGroup.modulePath,
        icon: activeGroup.moduleIcon,
        permission: activeGroup.permission,
      },
    ];
  }

  return [homeItem, ...moduleItems];
};

export const getSidebarSectionsByPath = (pathname: string): SidebarSection[] => {
  const mainItems = getSidebarItemsByPath(pathname);
  // Ajustes y Configuración se separan en bloque inferior para distinguirlos del núcleo operativo.
  const settingsItems = appRouteGroups
    .filter(
      (group) =>
        settingsGroupKeys.has(group.key) &&
        (group.showInHome !== false || group.key === "config")
    )
    .map(mapGroupToSidebarItem);

  const sections: SidebarSection[] = [
    {
      items: mainItems,
    },
  ];

  if (settingsItems.length > 0) {
    sections.push({
      title: "Ajustes",
      items: settingsItems,
    });
  }

  return sections;
};



import type React from "react";
import { HomeIcon } from "../components/Icons";
import { appRouteGroups } from "./appRoutes";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  permission?: string;
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

const getActiveGroup = (pathname: string) =>
  appRouteGroups.find(
    (group) =>
      pathname === group.modulePath || pathname.startsWith(`${group.modulePath}/`)
  );

export const getSidebarItemsByPath = (pathname: string): SidebarItem[] => {
  const normalizedPath = pathname || "/";
  const isHome = normalizedPath === "/";
  const isConfig = normalizedPath === "/config" || normalizedPath.startsWith("/config/");

  if (isHome || isConfig) {
    return [
      homeItem,
      ...appRouteGroups
        .filter((group) => group.showInHome !== false)
        .map((group) => ({
          label: group.moduleLabel,
          href: group.modulePath,
          icon: group.moduleIcon,
        })),
    ];
  }

  const activeGroup = getActiveGroup(normalizedPath);
  if (!activeGroup) {
    return [
      homeItem,
      ...appRouteGroups
        .filter((group) => group.showInHome !== false)
        .map((group) => ({
          label: group.moduleLabel,
          href: group.modulePath,
          icon: group.moduleIcon,
        })),
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

  if (moduleItems.length === 0) {
    return [
      homeItem,
      {
        label: activeGroup.moduleLabel,
        href: activeGroup.modulePath,
        icon: activeGroup.moduleIcon,
      },
    ];
  }

  return [homeItem, ...moduleItems];
};

export const getSidebarSectionsByPath = (pathname: string): SidebarSection[] => [
  {
    items: getSidebarItemsByPath(pathname),
  },
];



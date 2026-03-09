"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { hasPermission } from "@/src/utils/permissions";

interface ModuleNavProps {
  moduleKey?: string;
  modulePath?: string;
  className?: string;
}

export default function ModuleNav({ moduleKey, modulePath, className }: ModuleNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const activeGroup = moduleKey
    ? appRouteGroups.find((group) => group.key === moduleKey)
    : modulePath
      ? appRouteGroups.find(
          (group) =>
            group.modulePath === modulePath || modulePath.startsWith(`${group.modulePath}/`)
        )
      : appRouteGroups.find(
          (group) =>
            pathname === group.modulePath || pathname.startsWith(`${group.modulePath}/`)
        );

  if (!activeGroup) {
    return null;
  }

  const tabs = [
    {
      label: activeGroup.moduleLabel,
      href: activeGroup.modulePath,
      isRoot: true,
    },
    ...activeGroup.items
      .filter((item) => item.showInSidebar !== false)
      .filter((item) => (item.permission ? hasPermission(item.permission, session?.user) : true))
      .map((item) => ({
        label: item.label,
        href: item.path,
        isRoot: false,
      })),
  ];

  const isActive = (href: string, isRoot: boolean) =>
    isRoot ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navegación del módulo"
      className={`w-full border-b border-slate-200/70 dark:border-white/10 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={isActive(tab.href, tab.isRoot) ? "page" : undefined}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
              isActive(tab.href, tab.isRoot)
                ? "text-sky-600 dark:text-sky-300 border-sky-500 dark:border-sky-400"
                : "text-slate-500 dark:text-slate-400 border-transparent hover:text-sky-600 dark:hover:text-sky-300"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

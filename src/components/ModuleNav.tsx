"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { hasPermission } from "@/src/utils/permissions";

interface ModuleNavProps {
  moduleKey?: string;
  modulePath?: string;
  className?: string;
}

export default function ModuleNav({ moduleKey, modulePath, className }: ModuleNavProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recalcula si hay contenido oculto a izquierda/derecha del contenedor scrollable.
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  }, []);

  const isLoading = status === "loading";

  // Observa cambios de tamaño del contenedor y del contenido para mostrar/ocultar flechas.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(el);
    // Observa también la fila interna: cambios en el número de tabs alteran scrollWidth.
    const inner = el.firstElementChild;
    if (inner) observer.observe(inner);

    el.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, isLoading]);

  // Al navegar (o montar), lleva el tab activo al área visible del contenedor.
  useEffect(() => {
    if (isLoading) return;
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      active.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    }
    updateScrollState();
  }, [pathname, isLoading, updateScrollState]);

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

  const visibleRouteItems = activeGroup.items.filter(
    (item) => item.showInSidebar !== false
  );

  const tabs = [
    {
      label: activeGroup.moduleLabel,
      href: activeGroup.modulePath,
      isRoot: true,
    },
    ...visibleRouteItems
      .filter((item) => (item.permission ? hasPermission(item.permission, session?.user) : true))
      .map((item) => ({
        label: item.label,
        href: item.path,
        isRoot: false,
      })),
  ];
  const loadingTabPlaceholders = Array.from({
    length: Math.max(1, visibleRouteItems.length),
  });

  const isActive = (href: string, isRoot: boolean) =>
    isRoot ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navegación del módulo"
      aria-busy={isLoading}
      className={`relative w-full min-h-12 border-b border-slate-200/70 dark:border-white/10 ${className ?? ""}`}
    >
      <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
        <div className="flex min-h-12 items-end gap-4 sm:gap-6 flex-nowrap">
          {isLoading ? (
            <>
              <span className="shrink-0 pb-3 text-sm font-semibold text-sky-600 dark:text-sky-300 border-b-2 border-sky-500 dark:border-sky-400">
                {activeGroup.moduleLabel}
              </span>
              {loadingTabPlaceholders.map((_, index) => (
                <div
                  key={`module-nav-skeleton-${activeGroup.key}-${index}`}
                  className={`shrink-0 pb-3 ${index % 2 === 0 ? "w-24" : "w-20"}`}
                  aria-hidden="true"
                >
                  <LoadingSkeleton className="h-4 rounded-full" />
                </div>
              ))}
            </>
          ) : (
            tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                aria-current={isActive(tab.href, tab.isRoot) ? "page" : undefined}
                className={`shrink-0 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                  isActive(tab.href, tab.isRoot)
                    ? "text-sky-600 dark:text-sky-300 border-sky-500 dark:border-sky-400"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-sky-600 dark:hover:text-sky-300"
                }`}
              >
                {tab.label}
              </Link>
            ))
          )}
        </div>
      </div>

      {!isLoading && canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-50 dark:from-black to-transparent" />
          <button
            type="button"
            aria-label="Desplazar a la izquierda"
            onClick={() => scrollBy("left")}
            className="pointer-events-auto relative flex h-7 w-7 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-300"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {!isLoading && canScrollRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-end">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 dark:from-black to-transparent" />
          <button
            type="button"
            aria-label="Desplazar a la derecha"
            onClick={() => scrollBy("right")}
            className="pointer-events-auto relative flex h-7 w-7 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-300"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </nav>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { DropdownMenu } from "@radix-ui/themes";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, HomeIcon } from "./Icons";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { hasPermission } from "@/src/utils/permissions";
import {
  filterVisibleRouteSections,
  findActiveRouteSection,
  getRouteSections,
  type RouteSection,
} from "@/src/utils/routeSections";

interface SectionMenuProps {
  section: RouteSection;
  isActive: boolean;
  isCurrentPath: (path: string) => boolean;
}

/**
 * Un sub-grupo como menú desplegable: el disparador es su etiqueta (nunca
 * cambia de texto) y cada opción es un enlace real a una hoja.
 *
 * `DropdownMenu.Item` de Radix Themes acepta `asChild` (lo declara su
 * `baseMenuItemPropDefs`), así que la opción ES el `<Link>`: abrir en otra
 * pestaña, clic medio, prefetch y `href` visible funcionan como en las migas.
 * Enter sobre la opción la "clickea", y el `<Link>` navega.
 *
 * El resaltado usa el `sky` de Tailwind, igual que las migas planas y el
 * sidebar, y no el token de acento de Radix: el `<Theme>` de la app usa
 * `indigo` como acento y desentonaría con el resto de la navegación.
 */
function SectionMenu({ section, isActive, isCurrentPath }: SectionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          // `data-active` lo busca el efecto de scroll para llevar el sub-grupo
          // activo a la vista; `aria-current` anuncia a lectores de pantalla en
          // qué sub-grupo está la página con el menú cerrado (la hoja con
          // `aria-current="page"` solo existe en el DOM con el menú abierto).
          data-active={isActive ? "" : undefined}
          aria-current={isActive ? "true" : undefined}
          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1 cursor-pointer transition-colors ${
            isActive
              ? "font-semibold text-sky-600 dark:text-sky-300"
              : "text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300"
          }`}
        >
          {section.label}
          <ChevronDownIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        className="bg-white! dark:bg-zinc-900! min-w-44 max-h-80 overflow-y-auto rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
      >
        {section.items.map((item) => {
          const isCurrent = isCurrentPath(item.path);
          return (
            <DropdownMenu.Item
              key={item.path}
              asChild
              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ease-in-out ${
                isCurrent
                  ? "font-semibold text-sky-600 dark:text-sky-300"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Link href={item.path} aria-current={isCurrent ? "page" : undefined}>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCurrent ? "bg-sky-500" : "bg-transparent"}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

interface ModuleNavProps {
  moduleKey?: string;
  modulePath?: string;
  className?: string;
}

/**
 * Miga de pan del módulo: Inicio > Módulo > (sub-rutas del módulo, separadas
 * por chevron). Todas las sub-rutas quedan presentes y son clickeables —
 * "semi-activas" en gris, la actual resaltada en azul — en vez del navbar de
 * tabs anterior (con borde inferior y más alto). Se desplaza horizontalmente
 * cuando no caben todas.
 *
 * Si el módulo declara `sections`: Inicio > un menú desplegable por sub-grupo
 * visible (hermanos, sin chevron entre ellos), cada uno con sus hojas. El del
 * sub-grupo de la ruta actual se resalta y su menú marca la hoja actual; en el
 * landing del módulo ninguno está activo.
 */
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
    // Observa también la fila interna: cambios en el número de crumbs alteran scrollWidth.
    const inner = el.firstElementChild;
    if (inner) observer.observe(inner);

    el.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, isLoading]);

  // Al navegar (o montar), lleva el crumb activo al área visible del contenedor.
  // Con sub-grupos el elemento activo es el disparador del sub-grupo
  // (`data-active`): sus hojas viven en un portal, fuera de este contenedor.
  useEffect(() => {
    if (isLoading) return;
    const el = scrollRef.current;
    if (!el) return;
    const active =
      el.querySelector<HTMLElement>("[data-active]") ??
      el.querySelector<HTMLElement>('[aria-current="page"]');
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

  // El crumb raíz enlaza al landing del módulo, que el proxy protege con el
  // permiso de MÓDULO. Tras la granularización un usuario puede tener una
  // sección sin tener el módulo (p. ej. R-WMS-PICKING sin R-WMS): sin este
  // filtro se le ofrecería un crumb que solo lo rebota a "/".
  const canSeeModuleRoot = activeGroup.permission
    ? hasPermission(activeGroup.permission, session?.user)
    : true;

  // Con sub-grupos, un menú por sub-grupo; la visibilidad (permiso por hoja +
  // poda de sub-grupos vacíos) y el sub-grupo activo salen del helper compartido.
  // Se resuelven UNA vez: la lista declarada (sin filtrar) dimensiona el skeleton.
  const declaredSections = getRouteSections(activeGroup);
  const visibleSections = declaredSections
    ? filterVisibleRouteSections(declaredSections, session?.user)
    : null;
  const activeSection = visibleSections
    ? findActiveRouteSection(visibleSections, pathname)
    : undefined;

  // La "casita" ya ES el crumb raíz (dashboard del módulo) — se come esa
  // primera opción para ahorrar espacio, en vez de repetirla como texto.
  // Solo en módulos planos: con sub-grupos no se pintan.
  const crumbs = declaredSections
    ? []
    : visibleRouteItems
        .filter((item) => (item.permission ? hasPermission(item.permission, session?.user) : true))
        .map((item) => ({
          label: item.label,
          href: item.path,
          isRoot: false,
        }));

  // Mientras carga la sesión aún no hay permisos: el skeleton se dimensiona
  // con lo declarado (sin filtrar): un hueco por sub-grupo, o uno por hoja.
  const loadingCrumbPlaceholders = Array.from({
    length: declaredSections
      ? Math.max(1, declaredSections.length)
      : Math.max(1, visibleRouteItems.length),
  });

  const isActive = (href: string, isRoot: boolean) =>
    isRoot ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const isModuleRootActive = pathname === activeGroup.modulePath;

  return (
    <nav
      aria-label="Navegación del módulo"
      aria-busy={isLoading}
      className={`relative flex w-full items-center ${className ?? ""}`}
    >
      <Link
        href={canSeeModuleRoot ? activeGroup.modulePath : "/"}
        aria-label={activeGroup.moduleLabel}
        aria-current={isModuleRootActive ? "page" : undefined}
        title={activeGroup.moduleLabel}
        className={`flex shrink-0 items-center justify-center rounded p-0.5 transition-colors ${
          isModuleRootActive
            ? "text-sky-600 dark:text-sky-300"
            : "text-slate-400 hover:text-sky-600 dark:text-slate-500 dark:hover:text-sky-300"
        }`}
      >
        <HomeIcon className="h-3.5 w-3.5" />
      </Link>

      <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
        <div className="flex items-center flex-nowrap text-xs sm:text-sm">
          {isLoading && declaredSections ? (
            // Misma estructura que la fila cargada (un chevron y luego los
            // disparadores hermanos) para que no salte al resolver la sesión.
            <>
              <ChevronRightIcon className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
              <div className="flex items-center gap-2">
                {loadingCrumbPlaceholders.map((_, index) => (
                  <div
                    key={`module-nav-skeleton-${activeGroup.key}-${index}`}
                    // `h-5`: misma altura que un disparador, para que la fila no cambie de alto.
                    className={`flex h-5 shrink-0 items-center ${index % 2 === 0 ? "w-24" : "w-20"}`}
                    aria-hidden="true"
                  >
                    <LoadingSkeleton className="h-4 rounded-full" />
                  </div>
                ))}
              </div>
            </>
          ) : isLoading ? (
            <>
              <ChevronRightIcon className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
              <span className="shrink-0 font-semibold text-sky-600 dark:text-sky-300">
                {activeGroup.moduleLabel}
              </span>
              {loadingCrumbPlaceholders.map((_, index) => (
                <span key={`module-nav-skeleton-${activeGroup.key}-${index}`} className="flex items-center">
                  <ChevronRightIcon className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                  <div
                    className={`shrink-0 ${index % 2 === 0 ? "w-20" : "w-16"}`}
                    aria-hidden="true"
                  >
                    <LoadingSkeleton className="h-4 rounded-full" />
                  </div>
                </span>
              ))}
            </>
          ) : visibleSections ? (
            visibleSections.length > 0 && (
              <>
                <ChevronRightIcon className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                <div className="flex items-center gap-2">
                  {visibleSections.map((section) => (
                    <SectionMenu
                      key={section.key}
                      section={section}
                      isActive={section.key === activeSection?.key}
                      isCurrentPath={(path) => isActive(path, false)}
                    />
                  ))}
                </div>
              </>
            )
          ) : (
            crumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center">
                <ChevronRightIcon className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                <Link
                  href={crumb.href}
                  aria-label={crumb.label}
                  aria-current={isActive(crumb.href, crumb.isRoot) ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap transition-colors ${
                    isActive(crumb.href, crumb.isRoot)
                      ? "font-semibold text-sky-600 dark:text-sky-300"
                      : "text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300"
                  }`}
                >
                  {crumb.label}
                </Link>
              </span>
            ))
          )}
        </div>
      </div>

      {!isLoading && canScrollLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-6 z-10 flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-50 dark:from-black to-transparent" />
          <button
            type="button"
            aria-label="Desplazar a la izquierda"
            onClick={() => scrollBy("left")}
            className="pointer-events-auto relative flex h-6 w-6 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-300"
          >
            <ChevronLeftIcon className="h-4 w-4" />
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
            className="pointer-events-auto relative flex h-6 w-6 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:text-sky-600 dark:hover:text-sky-300"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

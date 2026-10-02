"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NavigationMenu } from "radix-ui";
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

/** Retardo de apertura por hover (`delayDuration` de NavigationMenu). */
const HOVER_OPEN_DELAY_MS = 100;

/**
 * Borde izquierdo del disparador de `sectionKey` respecto a la nav, ya restado
 * el scroll horizontal de la fila: donde debe empezar su menú.
 */
const measureTriggerLeft = (nav: HTMLElement | null, sectionKey: string) => {
  const trigger = nav?.querySelector<HTMLElement>(`[data-section="${sectionKey}"]`);
  if (!nav || !trigger) return 0;
  return trigger.getBoundingClientRect().left - nav.getBoundingClientRect().left;
};

interface SectionMenuProps {
  section: RouteSection;
  isActive: boolean;
  isCurrentPath: (path: string) => boolean;
  /** Registra el tipo de puntero que pulsó el disparador (ver `ModuleNav`). */
  onTriggerPointerDown: (event: React.PointerEvent) => void;
  /** Olvida ese registro si la pulsación no acabó en clic. */
  onTriggerPointerCancel: () => void;
}

/**
 * Un sub-grupo como menú de navegación (`NavigationMenu` de Radix): el
 * disparador es su etiqueta (nunca cambia de texto) y cada opción es un enlace
 * real a una hoja.
 *
 * `NavigationMenu` es el primitivo pensado para menús de enlaces que se abren
 * con hover: abre al pasar el mouse, cambia de menú sin esperar si ya hay uno
 * abierto, no toma el foco al abrir por hover (quien escribía en un campo sigue
 * escribiendo ahí), y con teclado el disparador abre con Enter/Espacio, la
 * flecha abajo entra a las opciones y Escape cierra devolviendo el foco al
 * disparador. El hover solo reacciona al mouse; en táctil abre y cierra el
 * toque.
 *
 * `NavigationMenu.Link asChild` envuelve el `<Link>` de Next: la opción ES el
 * enlace (otra pestaña, clic medio, prefetch y `href` visible funcionan) y su
 * `active` pone `aria-current="page"` en la hoja actual. Elegir una hoja cierra
 * el menú.
 *
 * El contenido NO se pinta aquí: Radix lo lleva al `NavigationMenu.Viewport`
 * de `ModuleNav`, que vive fuera del contenedor con scroll horizontal para que
 * no lo recorte.
 *
 * Estilos: es un primitivo sin estilos, así que el aspecto del menú anterior
 * (Radix Themes `DropdownMenu`) se replica con sus mismos tokens (`--gray-12`,
 * `--accent-9`, `--accent-contrast`, `--shadow-5`, `--default-font-family`).
 * La hoja actual se marca con el `sky` de Tailwind, igual que las migas planas
 * y el sidebar, en los `<span>` internos; con la opción resaltada (hover o
 * foco, fondo de acento) el texto y el punto toman el color de contraste para
 * no quedar sky sobre índigo, y la hoja sigue distinguiéndose por peso y punto.
 */
function SectionMenu({
  section,
  isActive,
  isCurrentPath,
  onTriggerPointerDown,
  onTriggerPointerCancel,
}: SectionMenuProps) {
  return (
    <NavigationMenu.Item value={section.key}>
      <NavigationMenu.Trigger
        onPointerDown={onTriggerPointerDown}
        onPointerCancel={onTriggerPointerCancel}
        // Lo usa `ModuleNav` para colocar el menú bajo su disparador.
        data-section={section.key}
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
      </NavigationMenu.Trigger>
      <NavigationMenu.Content
        className="absolute left-0 top-0 max-h-80 min-w-44 overflow-y-auto rounded-lg border border-slate-100 bg-white p-3 font-(family-name:--default-font-family) text-sm shadow-[var(--shadow-5)] dark:border-slate-800 dark:bg-zinc-900"
      >
        {section.items.map((item) => {
          const isCurrent = isCurrentPath(item.path);
          return (
            <NavigationMenu.Link key={item.path} asChild active={isCurrent}>
              <Link
                href={item.path}
                className="group flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap rounded px-3 text-(--gray-12) outline-none hover:bg-(--accent-9) hover:text-(--accent-contrast) focus:bg-(--accent-9) focus:text-(--accent-contrast)"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isCurrent
                      ? "bg-sky-500 group-hover:bg-(--accent-contrast) group-focus:bg-(--accent-contrast)"
                      : "bg-transparent"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={
                    isCurrent
                      ? "font-semibold text-sky-600 dark:text-sky-300 group-hover:text-inherit group-focus:text-inherit"
                      : undefined
                  }
                >
                  {item.label}
                </span>
              </Link>
            </NavigationMenu.Link>
          );
        })}
      </NavigationMenu.Content>
    </NavigationMenu.Item>
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

  const navRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Menús de sub-grupo (`NavigationMenu`, solo en módulos con `sections`) ──
  // `value` controlado: la clave del sub-grupo abierto, o "" si ninguno.
  const [openSection, setOpenSection] = useState("");
  // Abierto con un toque: se pinta la capa que intercepta el toque de cierre.
  const [openedByTouch, setOpenedByTouch] = useState(false);
  // Borde izquierdo del menú abierto, relativo a la nav (bajo su disparador).
  const [viewportLeft, setViewportLeft] = useState(0);
  // Tipo de puntero del último `pointerdown` en un disparador; se consume en
  // el siguiente `onValueChange` (el clic que alterna el menú). Se olvida si
  // la pulsación se cancela sin clic (p. ej. el dedo arrastra la fila): si no,
  // la siguiente apertura con mouse o teclado se tomaría por táctil.
  const lastTriggerPointerTypeRef = useRef<string | null>(null);
  const [renderedPathname, setRenderedPathname] = useState(pathname);

  // Al cambiar de ruta (navegación, atrás/adelante, `router.push`) el menú se
  // cierra en el mismo render: nunca se pinta abierto en la ruta nueva.
  if (renderedPathname !== pathname) {
    setRenderedPathname(pathname);
    setOpenSection("");
    setOpenedByTouch(false);
  }

  const handleSectionChange = (value: string) => {
    const pointerType = lastTriggerPointerTypeRef.current;
    lastTriggerPointerTypeRef.current = null;
    setOpenSection(value);
    // Todo puntero sin hover (dedo o lápiz) abre con un toque y necesita la
    // capa; el mouse y el teclado (sin `pointerdown`) no.
    setOpenedByTouch(value !== "" && pointerType !== null && pointerType !== "mouse");
    if (value) setViewportLeft(measureTriggerLeft(navRef.current, value));
  };

  const handleTriggerPointerDown = (event: React.PointerEvent) => {
    lastTriggerPointerTypeRef.current = event.pointerType;
  };

  const handleTriggerPointerCancel = () => {
    lastTriggerPointerTypeRef.current = null;
  };

  // Con un menú abierto, si la fila se desplaza o cambia el ancho de la
  // ventana, el menú sigue a su disparador.
  useEffect(() => {
    if (!openSection) return;
    const row = scrollRef.current;
    const reposition = () => setViewportLeft(measureTriggerLeft(navRef.current, openSection));
    row?.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      row?.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [openSection]);
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
  // (`data-active`): sus hojas se pintan en el `Viewport`, fuera de este contenedor.
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

  const showTouchOverlay = Boolean(declaredSections) && openSection !== "" && openedByTouch;

  const nav = (
    <nav
      ref={navRef}
      aria-label="Navegación del módulo"
      aria-busy={isLoading}
      className={`relative flex w-full items-center ${className ?? ""}`}
    >
      {showTouchOverlay && (
        // Menú abierto con un toque: capa fija y transparente bajo el menú y la
        // fila. El toque "fuera" cae aquí y solo cierra el menú; sin ella,
        // `NavigationMenu` (que no es modal) cerraría el menú y además dejaría
        // pasar el toque al elemento de debajo (p. ej. un enlace de folio).
        // Con mouse o teclado no hay capa: el cambio de menú por hover sigue.
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40"
          onClick={() => handleSectionChange("")}
        />
      )}
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

      <div
        ref={scrollRef}
        className={`overflow-x-auto no-scrollbar${showTouchOverlay ? " relative z-50" : ""}`}
      >
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
                <NavigationMenu.List className="flex items-center gap-2">
                  {visibleSections.map((section) => (
                    <SectionMenu
                      key={section.key}
                      section={section}
                      isActive={section.key === activeSection?.key}
                      isCurrentPath={(path) => isActive(path, false)}
                      onTriggerPointerDown={handleTriggerPointerDown}
                      onTriggerPointerCancel={handleTriggerPointerCancel}
                    />
                  ))}
                </NavigationMenu.List>
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

      {declaredSections && (
        // Aquí pinta Radix el menú abierto: dentro de la nav (que es su
        // `position: relative`) pero FUERA del contenedor con scroll horizontal,
        // así que ese `overflow` no lo recorta. Se coloca bajo su disparador y
        // se acota para no salirse por la derecha de la nav. Ancho y alto los
        // mide Radix del contenido (variables `--radix-navigation-menu-*`); en
        // el primer frame de cada apertura aún no existen, de ahí el `0px` de
        // respaldo (sin él el `calc` es inválido y el menú salta desde el borde).
        <NavigationMenu.Viewport
          className="absolute top-full z-50 mt-1 h-(--radix-navigation-menu-viewport-height) w-(--radix-navigation-menu-viewport-width)"
          style={{
            left: `clamp(0px, ${viewportLeft}px, calc(100% - var(--radix-navigation-menu-viewport-width, 0px)))`,
          }}
        />
      )}

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

  // Con sub-grupos la propia nav es el `Root` de `NavigationMenu` (`asChild`),
  // sin anidar un segundo landmark. Los módulos planos no lo llevan: su DOM
  // queda igual que antes.
  return declaredSections ? (
    <NavigationMenu.Root
      asChild
      value={openSection}
      onValueChange={handleSectionChange}
      delayDuration={HOVER_OPEN_DELAY_MS}
    >
      {nav}
    </NavigationMenu.Root>
  ) : (
    nav
  );
}

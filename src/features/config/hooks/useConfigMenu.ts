import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasPermission } from "@/src/utils/permissions";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { configCards, configGroups } from "../constants/configCardItems";
import {
  CONFIG_VIEW_PARAM,
  configViewQuery,
  nextOpenedFromMenu,
  resolveConfigView,
} from "../utils/configViewUrl";

/** Lo que tarda la animación de salida del menú antes de ocultarlo. */
const GRID_HIDE_DELAY_MS = 500;

export function useConfigMenu(user?: PermissionContext | null) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar tarjetas visibles según permisos
  const visibleCards = useMemo(() => {
    const canReadConfig = hasPermission("R-CONFIGURACION", user);
    return configCards.filter((card) => (card.adminOnly ? canReadConfig : true));
  }, [user]);

  // La vista abierta sale de la URL (`?view=`), validada contra las tarjetas
  // que este usuario ve: un valor desconocido o sin permiso muestra el menú.
  const viewParam = searchParams.get(CONFIG_VIEW_PARAM);
  const selectedView = resolveConfigView(
    viewParam,
    visibleCards.map((card) => card.view),
  );

  // ¿La entrada actual es una vista abierta justo después del menú en esta
  // sesión montada? (ver `nextOpenedFromMenu`). Se sigue sobre el parámetro
  // CRUDO y no sobre `selectedView`, que vale `null` mientras cargan los
  // permisos y haría pasar una recarga por "abierta desde el menú".
  const [trackedViewParam, setTrackedViewParam] = useState(viewParam);
  const [openedFromMenu, setOpenedFromMenu] = useState(false);
  if (trackedViewParam !== viewParam) {
    setTrackedViewParam(viewParam);
    setOpenedFromMenu(nextOpenedFromMenu(trackedViewParam, viewParam, openedFromMenu));
  }

  // Query del menú pendiente de aplicar tras un "Volver" con `history.back()`.
  const pendingMenuQuery = useRef<string | null>(null);
  useEffect(() => {
    // Al llegar a la entrada del menú, se reescribe con los parámetros de la
    // tabla que se acaba de cerrar. El orden frente al `popstate` de Next no
    // importa: los dos despachan un "restore" y Next descarta el pendiente en
    // favor del último, y ambos leen la URL ya reescrita (`location.href`).
    const onPopState = () => {
      const query = pendingMenuQuery.current;
      if (query === null) return;
      pendingMenuQuery.current = null;
      // Si "atrás" no cayó en el menú (no debería), no se toca esa entrada.
      if (new URLSearchParams(window.location.search).has(CONFIG_VIEW_PARAM)) return;
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [pathname]);

  // El menú se oculta (`hidden`) cuando termina su animación de salida.
  // `gridHiddenFor` es la vista para la que ya se ocultó; en cuanto la vista
  // cambia (volver al menú con el botón o con "atrás", o pasar a otra) se
  // limpia y el menú vuelve a mostrarse, así reabrir la misma tarjeta repite la
  // animación de salida.
  const [gridHiddenFor, setGridHiddenFor] = useState<string | null>(null);
  const [hasGridHidden, setHasGridHidden] = useState(false);
  if (gridHiddenFor !== null && gridHiddenFor !== selectedView) {
    setGridHiddenFor(null);
  }
  useEffect(() => {
    if (!selectedView) return;
    const timer = window.setTimeout(() => {
      setGridHiddenFor(selectedView);
      setHasGridHidden(true);
    }, GRID_HIDE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [selectedView]);
  const isGridVisible = selectedView === null || gridHiddenFor !== selectedView;
  // Ya se ocultó alguna vez: al reaparecer, el menú entra con animación.
  const isGridReturning = hasGridHidden;

  /**
   * Abre una vista con una entrada NUEVA en el historial (`pushState`, que Next
   * integra con `useSearchParams`): atrás vuelve al menú y adelante la reabre.
   * Parte de la query ACTUAL del navegador y solo toca `view`: los parámetros
   * de cada tabla se conservan.
   */
  const handleCardClick = useCallback(
    (view: string) => {
      const qs = configViewQuery(window.location.search, view);
      window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  // Entrar al grupo seleccionado y reiniciar búsqueda
  const handleGroupClick = useCallback((group: string) => {
    setSelectedGroup(group);
    setSearchTerm("");
  }, []);

  // Regresar al menú de grupos
  const handleGroupBack = useCallback(() => {
    setSelectedGroup(null);
    setSearchTerm("");
  }, []);

  /**
   * "Volver a configuración" se comporta como el "atrás" del navegador cuando
   * puede: si la vista se abrió justo después del menú, `history.back()` y, ya
   * en el menú, se le pasan los parámetros de la tabla (sin `view`), así el
   * historial no crece. Si no (recarga, enlace directo), la entrada actual se
   * reemplaza por el menú con esos mismos parámetros.
   */
  const handleBack = () => {
    if (pendingMenuQuery.current !== null) return;
    const menuQuery = configViewQuery(window.location.search, null);
    if (openedFromMenu) {
      pendingMenuQuery.current = menuQuery;
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", menuQuery ? `${pathname}?${menuQuery}` : pathname);
  };

  // Normalizar búsqueda para filtrar tarjetas
  const normalizedQuery = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);
  const filteredCards = useMemo(
    () =>
      normalizedQuery
        ? visibleCards.filter((card) => {
            const titleMatch = card.title.toLowerCase().includes(normalizedQuery);
            const descriptionMatch = card.description?.toLowerCase().includes(normalizedQuery);
            return titleMatch || descriptionMatch;
          })
        : visibleCards,
    [normalizedQuery, visibleCards]
  );
  // Grupos disponibles según tarjetas visibles
  const availableGroups = useMemo(
    () => configGroups.filter((group) => visibleCards.some((card) => card.group === group.group)),
    [visibleCards]
  );
  // Tarjetas del grupo seleccionado
  const selectedGroupCards = useMemo(
    () => (selectedGroup ? filteredCards.filter((card) => card.group === selectedGroup) : []),
    [filteredCards, selectedGroup]
  );

  return {
    selectedView,
    isGridVisible,
    isGridReturning,
    selectedGroup,
    searchTerm,
    setSearchTerm,
    handleCardClick,
    handleBack,
    handleGroupClick,
    handleGroupBack,
    availableGroups,
    filteredCards,
    selectedGroupCards,
  };
}

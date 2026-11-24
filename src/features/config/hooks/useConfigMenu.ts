import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hasPermission } from "@/src/utils/permissions";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { configCards, configGroups } from "../constants/configCardItems";
import { CONFIG_VIEW_PARAM, configViewQuery, resolveConfigView } from "../utils/configViewUrl";

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
  const selectedView = resolveConfigView(
    searchParams.get(CONFIG_VIEW_PARAM),
    visibleCards.map((card) => card.view),
  );

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
   * Abre o cierra una vista con una entrada NUEVA en el historial (`pushState`,
   * que Next integra con `useSearchParams`): atrás vuelve al estado anterior y
   * adelante lo rehace. Parte de la query ACTUAL del navegador y solo toca
   * `view`: los parámetros de cada tabla se conservan.
   */
  const pushView = useCallback(
    (view: string | null) => {
      const qs = configViewQuery(window.location.search, view);
      window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );

  // Ir a vista detallada de configuración
  const handleCardClick = useCallback((view: string) => pushView(view), [pushView]);

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

  // Regresar desde vista detallada al grid principal (solo se quita `view`)
  const handleBack = useCallback(() => pushView(null), [pushView]);

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

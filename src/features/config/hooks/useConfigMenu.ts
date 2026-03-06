import { useCallback, useMemo, useState } from "react";
import { hasPermission } from "@/src/utils/permissions";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { configCards, configGroups } from "../constants/configCardItems";

export function useConfigMenu(user?: PermissionContext | null) {
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Ir a vista detallada de configuración
  const handleCardClick = useCallback((view: string) => {
    setSelectedView(view);
    setTimeout(() => setIsGridVisible(false), 500);
  }, []);

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

  // Regresar desde vista detallada al grid principal
  const handleBack = useCallback(() => {
    setIsGridVisible(true);
    requestAnimationFrame(() => {
      setSelectedView(null);
    });
  }, []);

  // Filtrar tarjetas visibles según permisos
  const visibleCards = useMemo(() => {
    const canReadConfig = hasPermission("R-CONF", user);
    return configCards.filter((card) => (card.adminOnly ? canReadConfig : true));
  }, [user]);

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

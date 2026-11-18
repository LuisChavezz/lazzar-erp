"use client";

import { useUrlFilters } from "@/src/hooks/useUrlFilters";
import { SALIDAS_MAQUILA_TABLE } from "../constants/salidasMaquilaTable";

/**
 * Filtros del listado de SM (`?op=`, `?centro_confeccion=`) con la URL como
 * fuente de verdad (`useUrlFilters`). La página envuelve la vista en
 * `<Suspense>`.
 */
export const useSalidasMaquilaFilters = () => useUrlFilters(SALIDAS_MAQUILA_TABLE);

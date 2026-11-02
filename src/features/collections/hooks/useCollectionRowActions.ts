"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { CobroRow } from "../utils/collection.utils";

/**
 * Acciones de fila del listado de cobros. Llegan por contexto y no por
 * `getCollectionColumns`: si cambiaran las definiciones de columna (p. ej. al
 * resolverse la sesión), todas las celdas se remontarían y se cerraría un menú
 * abierto. Ver `createRowActionsContext`.
 */
export interface CollectionRowActionsContextValue {
  /** Abre el detalle del cobro; el diálogo vive en `CollectionList`. */
  onViewDetail: (cobro: CobroRow) => void;
  /** ¿Se ofrece "Timbrar REP" para este cobro a este usuario? (`canStampCobroRep`) */
  canStampRep: (cobro: CobroRow) => boolean;
  /** Abre la confirmación de timbrado; el diálogo vive en `CollectionList`. */
  onStampRep: (id: number) => void;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<CollectionRowActionsContextValue>("CobroIdCell", "CollectionList");

/** Callbacks del menú de fila (`CobroIdCell`); ver `createRowActionsContext`. */
export const CollectionRowActionsProvider = Provider;
export const useCollectionRowActionsContext = useRowActionsContext;

"use client";

import { createContext, useContext } from "react";
import type { CobroRow } from "../utils/collection.utils";

/**
 * Acciones de fila del listado de cobros que dependen del usuario o cambian
 * con el tiempo. Llegan por contexto y no por `getCollectionColumns`: si
 * cambiaran las definiciones de columna (p. ej. al resolverse la sesión),
 * todas las celdas se remontarían y se cerraría un menú abierto. Mismo patrón
 * que `InvoiceRowActionsProvider` (Facturación).
 */
export interface CollectionRowActionsContextValue {
  /** ¿Se ofrece "Timbrar REP" para este cobro a este usuario? (`canStampCobroRep`) */
  canStampRep: (cobro: CobroRow) => boolean;
  /** Abre la confirmación de timbrado; el diálogo vive en `CollectionList`. */
  onStampRep: (id: number) => void;
}

const CollectionRowActionsContext = createContext<CollectionRowActionsContextValue | null>(null);

export const CollectionRowActionsProvider = CollectionRowActionsContext.Provider;

export function useCollectionRowActionsContext(): CollectionRowActionsContextValue {
  const value = useContext(CollectionRowActionsContext);
  if (!value) {
    throw new Error(
      "Las acciones de fila de cobros deben renderizarse dentro de un CollectionRowActionsProvider (ver CollectionList).",
    );
  }
  return value;
}

"use client";

import { createContext, useContext } from "react";

/**
 * Contexto para el menú de fila de un listado: los callbacks y el "en vuelo"
 * llegan a la celda por contexto, NO por la factoría de columnas. Si viajaran
 * dentro de `getColumns(...)`, cada inicio y fin de una acción crearía
 * funciones `cell` nuevas y React remontaría TODAS las celdas (los menús se
 * cerrarían a media interacción).
 *
 * `cellName` y `listName` solo nombran el error de una celda montada fuera de
 * su `Provider`.
 */
export function createRowActionsContext<V>(cellName: string, listName: string) {
  const RowActionsContext = createContext<V | null>(null);

  function useRowActionsContext(): V {
    const value = useContext(RowActionsContext);
    if (!value) {
      throw new Error(
        `${cellName} debe renderizarse dentro de su RowActionsProvider (ver ${listName}).`
      );
    }
    return value;
  }

  return { Provider: RowActionsContext.Provider, useRowActionsContext };
}

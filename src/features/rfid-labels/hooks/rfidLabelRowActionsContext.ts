"use client";

import { createContext, useContext } from "react";
import type { EtiquetaRFIDRow } from "../interfaces/rfid-label.interface";

// "Ver detalles" llega a la celda por contexto, NO por la factoría de columnas:
// las columnas son estáticas y el diálogo vive en `RfidLabelsView`, así que
// sigue abierto aunque la celda se desmonte al refrescar, paginar u ordenar.

export interface RfidLabelRowActionsContextValue {
  onViewDetail: (row: EtiquetaRFIDRow) => void;
}

const RfidLabelRowActionsContext = createContext<RfidLabelRowActionsContextValue | null>(null);

export const RfidLabelRowActionsProvider = RfidLabelRowActionsContext.Provider;

export function useRfidLabelRowActionsContext(): RfidLabelRowActionsContextValue {
  const value = useContext(RfidLabelRowActionsContext);
  if (!value) {
    throw new Error(
      "Las acciones de impresiones RFID deben renderizarse dentro de un RfidLabelRowActionsProvider (ver RfidLabelsView).",
    );
  }
  return value;
}

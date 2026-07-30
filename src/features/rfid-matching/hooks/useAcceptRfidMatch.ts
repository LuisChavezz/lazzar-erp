"use client";

import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { acceptRfidMatch, listRfidMatches } from "../mocks/rfid-matches.mock";
import { RFID_MATCHES_QUERY_KEY } from "./useRfidMatches";
import type { RfidMatch } from "../interfaces/rfid-matching.interface";

/**
 * Marca el encuadre como aceptado en QA. El nuevo estatus se publica en la
 * caché, así que el badge del listado cambia junto con el del diálogo.
 *
 * Aceptar NO mueve inventario ni exige que el conteo cuadre — el aviso lo dice
 * explícitamente, con el mismo texto que el backend (ver `acceptRfidMatch` en
 * `mocks/rfid-matches.mock.ts`).
 */
export const useAcceptRfidMatch = () => {
  const queryClient = useQueryClient();

  return (matchId: number): RfidMatch | null => {
    const match = acceptRfidMatch(matchId);
    if (!match) return null;

    queryClient.setQueryData<RfidMatch[]>(RFID_MATCHES_QUERY_KEY, listRfidMatches());
    toast.success("Encuadre aceptado en QA. No mueve inventario: deja el conteo validado.");
    return match;
  };
};

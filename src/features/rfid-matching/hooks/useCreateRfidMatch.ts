"use client";

import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createRfidMatch, listRfidMatches } from "../mocks/rfid-matches.mock";
import { RFID_MATCHES_QUERY_KEY } from "./useRfidMatches";
import type { CreateRfidMatchPayload, RfidMatch } from "../interfaces/rfid-matching.interface";

/**
 * Alta de un encuadre. El registro nace PENDIENTE y sin ninguna lectura: el
 * conteo empieza en el diálogo de detalle.
 *
 * No es un `useMutation` porque no hay nada asíncrono que envolver —la
 * escritura es síncrona sobre el estado en memoria (ver
 * `mocks/rfid-matches.mock.ts`)— y un `useMutation` sobre una función síncrona
 * solo añadiría un `isPending` que jamás sería `true`. Lo que sí se conserva
 * es la forma de una mutación del proyecto: escribe el resultado en la caché
 * con `setQueryData` (mismo mecanismo que las actualizaciones optimistas de
 * los `useDelete*`) y avisa por `toast`, de modo que la vista y el diálogo se
 * enteran por la MISMA vía que usarían con un endpoint real.
 */
export const useCreateRfidMatch = () => {
  const queryClient = useQueryClient();

  return (payload: CreateRfidMatchPayload): RfidMatch => {
    const match = createRfidMatch(payload);
    queryClient.setQueryData<RfidMatch[]>(RFID_MATCHES_QUERY_KEY, listRfidMatches());
    toast.success(`${match.nombre} creado. Ya puedes escanear tags.`);
    return match;
  };
};

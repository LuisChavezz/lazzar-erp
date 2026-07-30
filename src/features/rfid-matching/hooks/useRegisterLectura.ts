"use client";

import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { listRfidMatches, registrarLectura } from "../mocks/rfid-matches.mock";
import { RFID_MATCHES_QUERY_KEY } from "./useRfidMatches";
import type { RegistrarLecturaResultado, RfidMatch } from "../interfaces/rfid-matching.interface";

/**
 * Registra UNA lectura contra UN encuadre y publica el resultado en la caché,
 * de donde lo releen tanto el listado como el diálogo abierto — por eso el
 * avance de un encuadre nunca toca el de otro: la escritura es por `id`.
 *
 * Devuelve el resultado para que el llamador pueda reaccionar (limpiar y
 * reenfocar el campo de escaneo) además del aviso que ya emite este hook.
 * Síncrono a propósito: la lectura tiene que sentirse instantánea, y no hay
 * red de por medio (ver `useCreateRfidMatch` para el mismo criterio).
 */
export const useRegisterLectura = () => {
  const queryClient = useQueryClient();

  return (matchId: number, codigoTag: string): RegistrarLecturaResultado => {
    const resultado = registrarLectura(matchId, codigoTag);

    switch (resultado.tipo) {
      case "ASIGNADA":
        queryClient.setQueryData<RfidMatch[]>(RFID_MATCHES_QUERY_KEY, listRfidMatches());
        toast.success(`Tag ${resultado.codigo} asignado a ${resultado.producto}.`);
        break;

      case "SIN_ASIGNAR":
        if (resultado.codigo === "") {
          toast.error("Debes escanear o capturar un tag.");
          break;
        }
        // La lectura SÍ se guardó (queda en el panel "sin asignar"), por eso se
        // publica el nuevo estado: no es un error, es un tag que no pertenece a
        // esta orden y que el operador debe revisar.
        queryClient.setQueryData<RfidMatch[]>(RFID_MATCHES_QUERY_KEY, listRfidMatches());
        toast(`Tag ${resultado.codigo} leído, pero quedó sin asignar.`, { icon: "⚠️" });
        break;

      case "DUPLICADA":
        toast(`El tag ${resultado.codigo} ya fue leído en este encuadre.`, { icon: "🔁" });
        break;

      case "NO_PENDIENTE":
        toast.error("Solo puedes escanear encuadres pendientes.");
        break;
    }

    return resultado;
  };
};

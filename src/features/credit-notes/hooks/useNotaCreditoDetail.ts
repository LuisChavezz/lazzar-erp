import { useQuery } from "@tanstack/react-query";
import { getNotaCredito } from "../services/actions";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/**
 * Una nota de crédito por id. Llave en su propio namespace
 * (`["credit-note-detail", id]`) y NO bajo `["credit-notes"]`: ese prefijo es
 * el que las mutaciones del listado cancelan y reescriben de forma optimista,
 * y esta consulta no debe entrar en ese juego (esas mutaciones sí la
 * invalidan). `null` mantiene la consulta apagada.
 *
 * Datos frescos en cada apertura (`staleTime: 0` + `refetchOnMount: "always"`,
 * mismo criterio que el desglose): la nota pudo emitirse o cancelarse en otra
 * pantalla o sesión. `gcTime: 0` suelta la caché al cerrar el diálogo, para
 * que la siguiente apertura NO pinte un instante el estatus viejo mientras
 * refresca: siempre arranca en carga.
 */
export const useNotaCreditoDetail = (id: number | null) =>
  useQuery<NotaCredito>({
    queryKey: ["credit-note-detail", id],
    queryFn: () => getNotaCredito(id as number),
    enabled: id !== null && id > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

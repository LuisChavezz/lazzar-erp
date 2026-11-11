import { z } from "zod";
import type { BitacoraDocumento } from "../interfaces/document-audit.interface";

/**
 * Forma de `linea-tiempo/` (nucleo-erp PR #1072): `{eventos, truncado}`. Se
 * valida la envoltura, no cada evento: lo que protege es no confundir otra
 * respuesta (p. ej. el arreglo de antes de #1072, si se revierte el backend)
 * con "sin eventos". Un evento solo debe ser un objeto.
 */
export const documentTimelineResponseSchema = z.object({
  eventos: z.array(
    z.custom<BitacoraDocumento>((value) => typeof value === "object" && value !== null),
  ),
  truncado: z.boolean(),
});

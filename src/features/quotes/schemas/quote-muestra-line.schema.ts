/**
 * Schema de una línea de "producto de muestra" (producto externo).
 *
 * Una muestra es una SOLICITUD DE ALTA: el vendedor escribe el nombre del
 * producto que todavía no existe en el catálogo, y alguien lo dará de alta
 * después. Por eso no lleva talla, color ni precio — solo texto.
 *
 * El `id` es client-side (`crypto.randomUUID()`), igual que en
 * `quoteExtraServiceSchema`: sirve como key de React y para editar/eliminar la
 * línea, y NO viaja al API.
 *
 * `max(350)` refleja el `CharField(max_length=350)` de
 * `CotizacionDetalle.producto_nombre_externo` en el backend.
 */
import { z } from "zod";

export const quoteMuestraLineSchema = z.object({
  id: z.string(),
  nombre: z
    .string()
    .trim()
    .min(1, "Requerido")
    .max(350, "Máximo 350 caracteres"),
});

export type QuoteMuestraLine = z.output<typeof quoteMuestraLineSchema>;

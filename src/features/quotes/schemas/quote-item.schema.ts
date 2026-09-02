/**
 * Schema para un item de la cotización (partida).
 *
 * Es una UNIÓN DISCRIMINADA por `tipo`, porque una cotización es MIXTA: puede
 * llevar partidas de catálogo y de muestra en el mismo arreglo `items`.
 *
 * - `tipo: "catalogo"` → apunta al catálogo con `productoId` (número ≥ 1).
 * - `tipo: "muestra"`  → `productoId: null` y el nombre libre en
 *   `producto_nombre_externo`, que es el marcador persistido de la partida.
 *
 * `tipo` es un campo SOLO DE FORMULARIO: no viaja al API. El payload lo arma
 * `useQuoteForm` leyendo el discriminante y emitiendo `producto` (id o `null`)
 * más `producto_nombre_externo` cuando corresponde.
 */
import { z } from "zod";
import { isCustomEmbroideryPosition } from "../constants/embroideryPositions";
import { embroiderySchema } from "./embroidery.schema";
import { quoteItemSizeSchema } from "./quote-item-size.schema";
import { reflectiveSchema } from "./reflective.schema";

/**
 * Campos comunes a las dos variantes. Se mantienen aquí una sola vez para que
 * catálogo y muestra no puedan divergir en lo que sí comparten.
 *
 * Los campos de color siguen siendo OPCIONALES en la base, no exclusivos de
 * catálogo: una muestra simplemente no los llena. Declararlos en ambas variantes
 * permite que la tabla y los diálogos sigan leyendo `item.colorNombre` sin
 * estrechar por `tipo` para algo que solo es presentación.
 */
const quoteItemBaseSchema = z.object({
  descripcion: z.string().min(1, "Requerido"),
  unidad: z.string().min(1, "Requerido"),
  cantidad: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .int("Debe ser un número entero")
    .min(1, "Debe ser mayor o igual a 1"),
  precio: z.coerce.number().gt(0, "Debe ser positivo"),
  descuento: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .int("Debe ser un número entero")
    .min(0, "No puede ser menor a 0")
    .max(100, "No puede ser mayor a 100"),
  importe: z.coerce.number().min(0, "No puede ser negativo"),
  colorId: z.coerce.number().int().min(1).optional(),
  // Nombre y código hex del color seleccionado — persistencia client-side.
  // No se envían al API; solo se usan para renderizar la columna en la tabla.
  colorNombre: z.string().optional(),
  colorHex: z.string().optional(),
  // Persistencia client-side de las tallas disponibles según la variante seleccionada.
  // Zod las conserva (passthrough implícito vía optional) pero no se validan ni envían al API.
  availableSizes: z
    .array(z.object({ id: z.number(), nombre: z.string() }))
    .optional(),
  tallas: z.array(quoteItemSizeSchema).optional(),
  bordados: embroiderySchema.optional(),
  reflejantes: reflectiveSchema.optional(),
  lleva_corte_manga: z.boolean().optional(),
});

/**
 * Refinamiento de bordado, común a las dos variantes: una partida con bordado
 * activo necesita al menos una especificación y no puede repetir ubicación.
 */
const refineEmbroidery = (
  data: z.infer<typeof quoteItemBaseSchema>,
  ctx: z.RefinementCtx
) => {
  if (!data.bordados?.activo) return;
  if (!data.bordados.especificaciones || data.bordados.especificaciones.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bordados", "especificaciones"],
      message: "Agrega al menos una especificación",
    });
  }
  const used = new Set<string>();
  data.bordados.especificaciones.forEach((spec, index) => {
    if (!spec.posicionCodigo || isCustomEmbroideryPosition(spec.posicionCodigo)) {
      return;
    }
    if (used.has(spec.posicionCodigo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bordados", "especificaciones", index, "posicionCodigo"],
        message: "La ubicación ya fue seleccionada",
      });
    }
    used.add(spec.posicionCodigo);
  });
};

/** Partida de CATÁLOGO: la forma que existía antes de la unión. */
export const quoteCatalogoItemSchema = quoteItemBaseSchema
  .extend({
    tipo: z.literal("catalogo"),
    productoId: z.coerce.number().min(1, "Requerido"),
  })
  .superRefine(refineEmbroidery);

/**
 * Partida de MUESTRA: producto que aún no existe en el catálogo.
 *
 * `productoId` es `null` por contrato —no un id sintético—: la clave sintética
 * que el diálogo usa internamente para indexar sus mapas nunca sale de ahí.
 *
 * `max(350)` refleja el `CharField(max_length=350)` de
 * `CotizacionDetalle.producto_nombre_externo` en el backend.
 */
export const quoteMuestraItemSchema = quoteItemBaseSchema
  .extend({
    tipo: z.literal("muestra"),
    productoId: z.null(),
    producto_nombre_externo: z
      .string()
      .trim()
      .min(1, "Requerido")
      .max(350, "Máximo 350 caracteres"),
  })
  .superRefine(refineEmbroidery);

export const quoteItemSchema = z.discriminatedUnion("tipo", [
  quoteCatalogoItemSchema,
  quoteMuestraItemSchema,
]);

export type QuoteCatalogoItem = z.output<typeof quoteCatalogoItemSchema>;
export type QuoteMuestraItem = z.output<typeof quoteMuestraItemSchema>;

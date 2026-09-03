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
  /**
   * PASSTHROUGH de la edición de PEDIDOS por Mesa de Control. Ninguno de los dos
   * flujos de cotización los captura ni los envía; se declaran aquí —y no en un
   * mapa aparte— porque Zod ESTRIPA las claves no declaradas: sin esto,
   * `quoteSubmitSchema.safeParse` los borraría de `parsed.data.items` justo
   * antes de armar el payload, y la edición de pedido —que borra y recrea el
   * detalle— los perdería en cada guardado. Mismo motivo por el que ya viven
   * aquí `colorNombre`, `colorHex` y `availableSizes`.
   *
   * Nombres del API (`precio_lista`, `direccion_envio_cliente`) y no camelCase:
   * son campos reales del backend que solo viajan de ida y vuelta, sin
   * traducción, igual que `lleva_corte_manga`.
   *
   * `precio_lista` es el precio de LISTA del catálogo, distinto del `precio`
   * negociado del renglón. `undefined` en un renglón nuevo: no tiene uno propio
   * y el backend lo resuelve desde `producto.precio_base`.
   */
  precio_lista: z.coerce.number().min(0).optional(),
  /**
   * SIN `.positive()`: es un passthrough opaco, no un campo capturado, y el
   * backend mismo trata el `0` como "sin dirección" (`_merge_detalle` lo
   * colapsa a `None`). Con la restricción, un `0` guardado hacía fallar el
   * `safeParse` en `items.N.direccion_envio_cliente` —una ruta sin ningún input
   * en pantalla—, así que el formulario rechazaba el envío sin mostrar nada y
   * sin nada que el usuario pudiera corregir. La normalización de `0` a `null`
   * se hace al hidratar; esto solo deja de convertir un dato en un bloqueo.
   */
  direccion_envio_cliente: z.number().int().nullish(),
  /**
   * Configuraciones congeladas que el formulario NO captura y que, sin
   * arrastrarlas, el guardado destructivo del pedido borraría:
   *
   * - `corte_manga_config`: el formulario solo tiene la bandera
   *   `lleva_corte_manga`; el JSON con el tipo de corte lo escribe el módulo de
   *   Corte de Manga y aquí solo viaja de ida y vuelta.
   * - `lleva_cambio_talla` / `cambio_talla_config`: el formulario no los expone
   *   en absoluto, y `_save_pedido_detalle` los recrea desde el payload (a
   *   `false`/`null` si no viajan).
   *
   * `z.unknown()` porque son `JSONField` sin forma garantizada: se conservan
   * verbatim, nunca se interpretan. Se declaran aquí —y no en un mapa aparte—
   * por el mismo motivo que `precio_lista`: Zod estripa las claves no
   * declaradas.
   */
  corte_manga_config: z.unknown().optional(),
  lleva_cambio_talla: z.boolean().optional(),
  cambio_talla_config: z.unknown().optional(),
  /**
   * Copia ÍNTEGRA de `bordado_config` / `reflejante_config` tal como los
   * devolvió el servidor, para poder FUSIONAR sobre ella al serializar en vez
   * de reconstruir el JSON desde cero.
   *
   * A diferencia de `corte_manga_config`, aquí el formulario sí posee una parte
   * del contenido (las ubicaciones y sus banderas), pero solo una parte: el JSON
   * lo escriben también los módulos de Producción, que meten claves que este
   * formulario ni lee ni sabe pintar (`foto`, `imagen`, `posicion`,
   * `observaciones`, y `nombre` dentro de cada ubicación). Reconstruir borraba
   * todo eso en cada guardado; con el original a mano se conserva.
   */
  bordado_config_original: z.unknown().optional(),
  reflejante_config_original: z.unknown().optional(),
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

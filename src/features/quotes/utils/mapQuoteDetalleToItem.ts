import type {
  QuoteById,
  QuoteItem,
  QuoteOnboardingData,
} from "../interfaces/quote.interface";

type OnboardingProduct = QuoteOnboardingData["busqueda"]["productos"][number];

/**
 * Proyecta un detalle guardado (`QuoteById["detalles"]`) a la partida del
 * formulario. Única fuente para la edición y para la validación previa a
 * revisión: dos copias ya divergieron una vez (una seguía tratando las muestras
 * como catálogo).
 *
 * Recibe el catálogo de productos para derivar las tallas disponibles por
 * variante.
 */
export const mapQuoteDetalleToItem = (
  detalle: QuoteById["detalles"][number],
  products?: OnboardingProduct[]
): QuoteItem => {
  const primeraTalla = detalle.tallas[0];
  const llevaBordado = primeraTalla?.lleva_bordado ?? false;
  const llevaReflejante = primeraTalla?.lleva_reflejante ?? false;
  const llevaCorteManga = primeraTalla?.lleva_corte_manga ?? false;

  const cantidadTotal = detalle.tallas.reduce((sum, t) => sum + t.cantidad, 0);
  const precio = Number(detalle.precio_unitario) || 0;
  // Calcular el importe localmente en lugar de depender de subtotal_linea del API,
  // que puede venir como "0.00" y provocar que los totales sean incorrectos
  // en la carga inicial del formulario de edición.
  const importe = Number((cantidadTotal * precio).toFixed(2));

  // `producto: null` es la señal de contrato de una partida de MUESTRA (ver
  // el comentario de `QuoteById["detalles"]`): no apunta al catálogo y su
  // nombre viaja en `producto_nombre_externo`, no en `producto_nombre`.
  const esMuestra = detalle.producto === null;

  const camposComunes = {
    unidad: "PZA",
    cantidad: cantidadTotal,
    precio,
    descuento: 0,
    importe,
    colorId: detalle.color ?? undefined,
    colorNombre: detalle.color_nombre ?? undefined,
    colorHex: detalle.color_codigo_hex ?? undefined,
    // Derivar las tallas disponibles desde las variantes del producto en el catálogo.
    // Si no se encuentran variantes para ese producto/color (o es muestra, sin
    // producto real), queda undefined y useEditSizesDialog usará el catálogo
    // global como fallback.
    availableSizes: (() => {
      if (esMuestra || !products?.length) return undefined;
      const product = products.find((p) => p.id === detalle.producto);
      if (!product?.variantes?.length) return undefined;
      const colorId = detalle.color ?? null;
      const seen = new Set<number>();
      const sizesList: Array<{ id: number; nombre: string }> = [];
      for (const variant of product.variantes) {
        if (colorId !== null && variant.color.id !== colorId) continue;
        if (!seen.has(variant.talla.id)) {
          seen.add(variant.talla.id);
          sizesList.push(variant.talla);
        }
      }
      return sizesList.length > 0 ? sizesList : undefined;
    })(),
    tallas: detalle.tallas.map((t) => ({
      tallaId: t.talla,
      nombre: t.talla_nombre,
      cantidad: t.cantidad,
    })),
    bordados: llevaBordado
      ? {
          activo: true,
          observaciones: primeraTalla?.bordado_config?.notas ?? "",
          especificaciones: (primeraTalla?.bordado_config?.ubicaciones ?? []).map((u) => ({
            posicionCodigo: u.codigo,
            posicionNombre: u.descripcion_posicion?.trim() || u.codigo,
            posicionPersonalizada: u.descripcion_posicion ?? "",
            // Convertir null/cero a undefined para que Zod los omita en .optional()
            ancho: Number(u.ancho_cm) > 0 ? u.ancho_cm : undefined,
            alto: Number(u.alto_cm) > 0 ? u.alto_cm : undefined,
            colorHilo: u.color_hilo ?? undefined,
            // `pantones` y las cinco técnicas se LEEN de la respuesta. Estaban
            // fijas en `undefined`/`false`, así que abrir una cotización y
            // guardarla borraba lo capturado —y, desde que `tipos_servicio` se
            // deriva de estas banderas, borraba también el agregado—. El
            // `?? false` cubre las cotizaciones viejas, cuyo `bordado_config`
            // no trae estas claves.
            pantones: u.pantones ?? undefined,
            imagen: u.imagen ?? "",
            nuevoPonchado: u.nuevo_ponchado ?? false,
            serigrafia: u.serigrafia ?? false,
            sublimado: u.sublimado ?? false,
            dtf: u.dtf ?? false,
            revelado: u.revelado ?? false,
          })),
        }
      : { activo: false, observaciones: "", especificaciones: [] },
    reflejantes: llevaReflejante
      ? {
          activo: true,
          observaciones: "",
          especificaciones: (Array.isArray(primeraTalla?.reflejante_config)
            ? primeraTalla.reflejante_config
            : []
          ).map((r) => ({
            // Normalizar posibles null del backend a cadena vacía
            opcion: r.opcion || "",
            posicion: r.posicion || "",
            tipo: r.tipo || "",
          })),
        }
      : { activo: false, observaciones: "", especificaciones: [] },
    lleva_corte_manga: llevaCorteManga,
  };

  if (esMuestra) {
    const nombreExterno = detalle.producto_nombre_externo ?? "";
    return {
      tipo: "muestra",
      productoId: null,
      producto_nombre_externo: nombreExterno,
      descripcion: nombreExterno,
      ...camposComunes,
    };
  }

  return {
    tipo: "catalogo",
    productoId: detalle.producto ?? 0,
    descripcion: detalle.producto_nombre ?? "",
    ...camposComunes,
  };
};

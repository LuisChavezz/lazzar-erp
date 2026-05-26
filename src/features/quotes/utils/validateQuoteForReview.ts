/**
 * Utilidad de validación previa al envío de cotizaciones a revisión.
 *
 * Proyecta la cotización guardada a una estructura alineada con el formulario,
 * incorpora datos de onboarding para validar catálogos y campos derivados del
 * cliente, y devuelve una lista estructurada de errores legibles.
 */
import type {
  QuoteById,
  QuoteItem,
  QuoteOnboardingData,
  QuotePaymentCondition,
} from "../interfaces/quote.interface";
import type { QuoteFormValues } from "../schemas/quote.schema";
import {
  quoteReviewSchema,
  QUOTE_REVIEW_FIELD_LABELS,
} from "../schemas/quote-review.schema";

type OnboardingCustomer = QuoteOnboardingData["busqueda"]["clientes"][number];
type OnboardingProduct = QuoteOnboardingData["busqueda"]["productos"][number];
type QuoteReviewValidationInput = Omit<QuoteFormValues, "items"> & {
  cliente: number;
  items: QuoteItem[];
};

type OriginFieldKey =
  | "recompra"
  | "chat_online"
  | "pedido_online"
  | "prospeccion"
  | "recomendacion"
  | "amazon"
  | "google"
  | "publicidad"
  | "mercado_libre"
  | "redes_sociales"
  | "otro"
  | "mailing";

const ORIGIN_FIELD_MAP: { label: string; field: OriginFieldKey }[] = [
  { label: "Recompra", field: "recompra" },
  { label: "Chat Online", field: "chat_online" },
  { label: "Pedido Online", field: "pedido_online" },
  { label: "Prospección", field: "prospeccion" },
  { label: "Recomendación", field: "recomendacion" },
  { label: "Amazon", field: "amazon" },
  { label: "Google", field: "google" },
  { label: "Publicidad", field: "publicidad" },
  { label: "Mercado Libre", field: "mercado_libre" },
  { label: "Redes Sociales", field: "redes_sociales" },
  { label: "Otro", field: "otro" },
  { label: "Mailing", field: "mailing" },
];

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export interface QuoteReviewValidationError {
  /** Etiqueta legible del campo con error (ej. "Forma de pago"). */
  field: string;
  /** Mensaje de error descriptivo. */
  message: string;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Valida que una cotización esté completa antes de enviarla a revisión.
 *
 * @param quote - Datos completos de la cotización obtenidos del servidor.
 * @param onboardingData - Catálogos y datos auxiliares del flujo de cotización.
 * @returns Lista de errores de validación. Array vacío si la cotización es válida.
 */
export function validateQuoteForReview(
  quote: QuoteById,
  onboardingData: QuoteOnboardingData
): QuoteReviewValidationError[] {
  const reviewInput = mapQuoteToReviewValidationInput(quote, onboardingData);
  const schemaErrors = getSchemaValidationErrors(reviewInput);
  const catalogErrors = getCatalogValidationErrors(quote, reviewInput, onboardingData);

  return dedupeValidationErrors([...schemaErrors, ...catalogErrors]);
}

// ─── Proyección a valores de validación ───────────────────────────────────────

const reverseMapCondicionPago = (quote: QuoteById): QuotePaymentCondition => {
  if (quote.anticipo_total) return "100_anticipo";
  if (quote.anticipo_parcial) return "50_anticipo";
  if (quote.vendedor_autoriza) return "vendedor_autoriza";
  if (quote.pago_antes_embarque) return "pago_antes_embarque";
  if (quote.por_confirmar) return "por_confirmar";
  if (quote.otra_cantidad) return "otra_cantidad";
  return "100_anticipo";
};

const reverseMapOrigenFlags = (quote: QuoteById): string => {
  const match = ORIGIN_FIELD_MAP.find((item) => quote[item.field] === true);
  return match?.label ?? "";
};

const readOptionalNumberProperty = (source: object, key: string): number => {
  const value = Reflect.get(source, key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const resolveRegimenFiscal = (
  customer: OnboardingCustomer | undefined,
  onboardingData: QuoteOnboardingData
): string => {
  if (!customer) {
    return "";
  }

  const regimen = onboardingData.catalogos.regimenes_fiscales.find(
    (item) => item.value === String(customer.sat_regimen_fiscal_id)
  );

  return regimen?.value ?? customer.sat_regimen_fiscal__codigo ?? "";
};

const mapDetalleToQuoteItem = (
  detalle: QuoteById["detalles"][number],
  products: OnboardingProduct[]
): QuoteItem => {
  const primeraTalla = detalle.tallas[0];
  const llevaBordado = primeraTalla?.lleva_bordado ?? false;
  const llevaReflejante = primeraTalla?.lleva_reflejante ?? false;
  const llevaCorteManga = primeraTalla?.lleva_corte_manga ?? false;

  const product = products.find((item) => item.id === detalle.producto);
  const colorId = detalle.color ?? null;
  const availableSizes = (() => {
    if (!product?.variantes?.length) {
      return undefined;
    }

    const seen = new Set<number>();
    const sizes: Array<{ id: number; nombre: string }> = [];

    for (const variant of product.variantes) {
      if (colorId !== null && variant.color.id !== colorId) {
        continue;
      }

      if (seen.has(variant.talla.id)) {
        continue;
      }

      seen.add(variant.talla.id);
      sizes.push({ id: variant.talla.id, nombre: variant.talla.nombre });
    }

    return sizes.length > 0 ? sizes : undefined;
  })();

  return {
    productoId: detalle.producto,
    descripcion: detalle.producto_nombre,
    unidad: "PZA",
    cantidad: detalle.tallas.reduce((sum, talla) => sum + talla.cantidad, 0),
    precio: Number(detalle.precio_unitario) || 0,
    descuento: 0,
    importe: Number(detalle.subtotal_linea) || 0,
    colorId: detalle.color ?? undefined,
    colorNombre: detalle.color_nombre ?? undefined,
    colorHex: detalle.color_codigo_hex ?? undefined,
    availableSizes,
    tallas: detalle.tallas.map((talla) => ({
      tallaId: talla.talla,
      nombre: talla.talla_nombre,
      cantidad: talla.cantidad,
    })),
    bordados: llevaBordado
      ? {
          activo: true,
          observaciones: primeraTalla?.bordado_config?.notas ?? "",
          especificaciones: (primeraTalla?.bordado_config?.ubicaciones ?? []).map(
            (ubicacion) => ({
              posicionCodigo: ubicacion.codigo,
              posicionNombre:
                ubicacion.descripcion_posicion?.trim() || ubicacion.codigo,
              posicionPersonalizada: ubicacion.descripcion_posicion ?? "",
              ancho:
                Number(ubicacion.ancho_cm) > 0 ? ubicacion.ancho_cm : undefined,
              alto:
                Number(ubicacion.alto_cm) > 0 ? ubicacion.alto_cm : undefined,
              colorHilo: ubicacion.color_hilo ?? undefined,
              pantones: undefined,
              imagen: ubicacion.imagen ?? "",
              nuevoPonchado: false,
              serigrafia: false,
              sublimado: false,
              dtf: false,
              revelado: false,
            })
          ),
        }
      : { activo: false, observaciones: "", especificaciones: [] },
    reflejantes: llevaReflejante
      ? {
          activo: true,
          observaciones: "",
          especificaciones: (primeraTalla?.reflejante_config ?? []).map(
            (reflective) => ({
              opcion: reflective.opcion || "",
              posicion: reflective.posicion || "",
              tipo: reflective.tipo || "",
            })
          ),
        }
      : { activo: false, observaciones: "", especificaciones: [] },
    lleva_corte_manga: llevaCorteManga,
  };
};

const mapQuoteToReviewValidationInput = (
  quote: QuoteById,
  onboardingData: QuoteOnboardingData
): QuoteReviewValidationInput => {
  const customer = onboardingData.busqueda.clientes.find(
    (item) => item.id === quote.cliente
  );

  return {
    cliente: quote.cliente,
    clienteBusqueda: quote.cliente_razon_social || quote.cliente_nombre || "",
    clienteNombre: quote.cliente_nombre || "",
    razonSocial: quote.cliente_razon_social || "",
    rfc: customer?.rfc ?? "",
    regimenFiscal: resolveRegimenFiscal(customer, onboardingData),
    direccionFiscal: customer?.direccion_fiscal ?? "",
    coloniaFiscal: customer?.colonia ?? "",
    codigoPostalFiscal: customer?.codigo_postal ?? "",
    ciudadFiscal: customer?.ciudad ?? "",
    estadoFiscal: customer?.estado ?? "",
    giroEmpresa: customer?.giro_empresarial ?? "",
    persona_pagos: quote.persona_pagos || "",
    correo_facturas: quote.correo_facturas || "",
    telefono_pagos: quote.telefono_pagos || "",
    oc: quote.oc || "",
    forma_pago: quote.forma_pago || "",
    metodo_pago: quote.metodo_pago || "",
    uso_cfdi: quote.uso_cfdi || "",
    referenciarOcFactura: false,
    condicionPago: reverseMapCondicionPago(quote),
    condicionPagoMonto: Number(quote.monto) || 0,
    fecha: quote.created_at ? quote.created_at.slice(0, 10) : "",
    agente: onboardingData.vendedor.username || "",
    tipo_pedido: readOptionalNumberProperty(quote, "tipo_pedido"),
    origen: reverseMapOrigenFlags(quote),
    destinatario: quote.destinatario || "",
    empresaEnvio: quote.empresa_envio || "",
    telefonoEnvio: quote.telefono_envio || "",
    celularEnvio: quote.celular_envio || "",
    direccionEnvio: quote.direccion_envio || "",
    coloniaEnvio: quote.colonia_envio || "",
    codigoPostalEnvio: quote.codigo_postal || "",
    ciudadEnvio: quote.ciudad_envio || "",
    estadoEnvio: quote.estado_envio || "",
    referenciasEnvio: quote.referencias || "",
    enviarDomicilioFiscal: false,
    embarcarConOtrosPedidos: false,
    empaque_ecologico: Boolean(quote.empaque_ecologico),
    embarque_parcial: Boolean(quote.embarque_parcial),
    comentarios_parcialidad: quote.comentarios_parcialidad || "",
    servicioEnvioActivo: Number(quote.envio) > 0,
    envio: Number(quote.envio) || 0,
    programaBordadosActivo: Number(quote.programa_bordados) > 0,
    programa_bordados: Number(quote.programa_bordados) || 0,
    bordadoPantalonesExtrasActivo: Number(quote.bordado_pantalones_extras) > 0,
    bordado_pantalones_extras: Number(quote.bordado_pantalones_extras) || 0,
    serigrafiaActivo: Number(quote.serigrafia) > 0,
    serigrafia: Number(quote.serigrafia) || 0,
    reflejanteActivo: Number(quote.reflejante) > 0,
    reflejante: Number(quote.reflejante) || 0,
    bordado_logotipo: Boolean(quote.bordado_logotipo),
    estatusPedido: "Pendiente",
    docRelacionado: `cotización-oc${(quote.oc ?? "").trim()}`,
    observaciones: quote.observaciones || "",
    flete: Number(quote.flete) || 0,
    seguros: Number(quote.seguros) || 0,
    anticipo: Number(quote.anticipo) || 0,
    iva: quote.iva ?? 0,
    moneda: quote.moneda || 0,
    items: (quote.detalles ?? []).map((detalle) =>
      mapDetalleToQuoteItem(detalle, onboardingData.busqueda.productos)
    ),
  };
};

// ─── Validación del schema y catálogos ───────────────────────────────────────

const getSchemaValidationErrors = (
  reviewInput: QuoteReviewValidationInput
): QuoteReviewValidationError[] => {
  const result = quoteReviewSchema.safeParse(reviewInput);
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => ({
    field: buildFieldLabel(normalizeIssuePath(issue.path)),
    message: issue.message,
  }));
};

const getCatalogValidationErrors = (
  quote: QuoteById,
  reviewInput: QuoteReviewValidationInput,
  onboardingData: QuoteOnboardingData
): QuoteReviewValidationError[] => {
  const errors: QuoteReviewValidationError[] = [];
  const customerExists = onboardingData.busqueda.clientes.some(
    (customer) => customer.id === quote.cliente
  );

  if (!customerExists) {
    errors.push(
      createValidationError(["cliente"], "Selecciona un cliente válido")
    );
  }

  validateCatalogSelection(
    reviewInput.forma_pago,
    onboardingData.catalogos.formas_pago.map((item) => item.value),
    ["forma_pago"],
    "Selecciona una forma de pago válida",
    errors
  );
  validateCatalogSelection(
    reviewInput.metodo_pago,
    onboardingData.catalogos.metodos_pago.map((item) => item.value),
    ["metodo_pago"],
    "Selecciona un método de pago válido",
    errors
  );
  validateCatalogSelection(
    reviewInput.uso_cfdi,
    onboardingData.catalogos.usos_cfdi.map((item) => item.value),
    ["uso_cfdi"],
    "Selecciona un uso de CFDI válido",
    errors
  );
  validateCatalogSelection(
    reviewInput.regimenFiscal,
    onboardingData.catalogos.regimenes_fiscales.map((item) => item.value),
    ["regimenFiscal"],
    "Selecciona un régimen fiscal válido",
    errors
  );

  if (
    typeof reviewInput.tipo_pedido === "number" &&
    reviewInput.tipo_pedido > 0 &&
    !onboardingData.catalogos.tipos_pedido.some(
      (item) => item.value === reviewInput.tipo_pedido
    )
  ) {
    errors.push(
      createValidationError(
        ["tipo_pedido"],
        "Selecciona un tipo de pedido válido"
      )
    );
  }

  if (
    typeof reviewInput.origen === "string" &&
    reviewInput.origen &&
    !ORIGIN_FIELD_MAP.some((item) => item.label === reviewInput.origen)
  ) {
    errors.push(
      createValidationError(["origen"], "Selecciona un origen válido")
    );
  }

  (reviewInput.items ?? []).forEach((item, itemIndex) => {
    const rawDetail = quote.detalles[itemIndex];
    const product = onboardingData.busqueda.productos.find(
      (candidate) => candidate.id === item.productoId
    );

    if (!product) {
      errors.push(
        createValidationError(
          ["items", itemIndex, "productoId"],
          "Selecciona un producto válido"
        )
      );
      return;
    }

    const colorId = item.colorId ?? 0;
    const hasColor = product.variantes.some((variant) => variant.color.id === colorId);

    if (!hasColor) {
      errors.push(
        createValidationError(
          ["items", itemIndex, "colorId"],
          "Selecciona un color válido para el producto"
        )
      );
    }

    const availableSizeIds = new Set(
      product.variantes
        .filter((variant) => variant.color.id === colorId)
        .map((variant) => variant.talla.id)
    );

    (item.tallas ?? []).forEach((size, sizeIndex) => {
      if (!availableSizeIds.has(size.tallaId)) {
        errors.push(
          createValidationError(
            ["items", itemIndex, "tallas", sizeIndex, "tallaId"],
            "Selecciona una talla válida para el color elegido"
          )
        );
      }
    });

    if (
      rawDetail?.tallas.some(
        (size) => size.lleva_corte_manga && !size.corte_manga_config?.tipo?.trim()
      )
    ) {
      errors.push(
        createValidationError(
          ["items", itemIndex, "lleva_corte_manga"],
          "Configura el tipo de corte de manga"
        )
      );
    }
  });

  return errors;
};

const validateCatalogSelection = (
  selectedValue: unknown,
  allowedValues: string[],
  path: (string | number)[],
  message: string,
  target: QuoteReviewValidationError[]
) => {
  if (typeof selectedValue !== "string" || !selectedValue.trim()) {
    return;
  }

  if (!allowedValues.includes(selectedValue)) {
    target.push(createValidationError(path, message));
  }
};

// ─── Utilidades de formato ───────────────────────────────────────────────────

const dedupeValidationErrors = (
  errors: QuoteReviewValidationError[]
): QuoteReviewValidationError[] => {
  const seen = new Set<string>();

  return errors.filter(({ field, message }) => {
    const key = `${field}:${message}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const createValidationError = (
  path: (string | number)[],
  message: string
): QuoteReviewValidationError => ({
  field: buildFieldLabel(path),
  message,
});

const normalizeIssuePath = (
  path: readonly PropertyKey[]
): Array<string | number> => {
  return path.flatMap((segment) => {
    if (typeof segment === "string" || typeof segment === "number") {
      return [segment];
    }

    return [];
  });
};

const buildFieldLabel = (path: readonly (string | number)[]): string => {
  const segments = path.map(String);
  if (segments.length === 0) {
    return "Validación";
  }

  if (segments[0] === "items" && segments.length >= 2) {
    return buildItemFieldLabel(segments);
  }

  const joinedPath = segments.join(".");
  return (
    QUOTE_REVIEW_FIELD_LABELS[joinedPath] ??
    QUOTE_REVIEW_FIELD_LABELS[segments[segments.length - 1]] ??
    formatFieldLabel(segments[segments.length - 1])
  );
};

const buildItemFieldLabel = (segments: string[]): string => {
  const itemIndex = Number(segments[1]);
  const itemLabel = `Producto ${Number.isFinite(itemIndex) ? itemIndex + 1 : ""}`.trim();
  const fieldSegment = segments[2];

  if (fieldSegment === "tallas") {
    if (segments.length >= 5) {
      const sizeIndex = Number(segments[3]);
      const sizeLabel = `Talla ${Number.isFinite(sizeIndex) ? sizeIndex + 1 : ""}`.trim();
      const finalLabel =
        QUOTE_REVIEW_FIELD_LABELS[segments[4]] ?? formatFieldLabel(segments[4]);
      return `${itemLabel} - ${sizeLabel} - ${finalLabel}`;
    }

    return `${itemLabel} - ${QUOTE_REVIEW_FIELD_LABELS.tallas}`;
  }

  if (
    (fieldSegment === "bordados" || fieldSegment === "reflejantes") &&
    segments[3] === "especificaciones" &&
    segments.length >= 6
  ) {
    const specIndex = Number(segments[4]);
    const specGroupLabel =
      fieldSegment === "bordados" ? "Bordado" : "Reflejante";
    const finalLabel =
      QUOTE_REVIEW_FIELD_LABELS[segments[5]] ?? formatFieldLabel(segments[5]);

    return `${itemLabel} - ${specGroupLabel} ${
      Number.isFinite(specIndex) ? specIndex + 1 : ""
    } - ${finalLabel}`.trim();
  }

  const finalLabel =
    QUOTE_REVIEW_FIELD_LABELS[fieldSegment] ?? formatFieldLabel(fieldSegment);
  return `${itemLabel} - ${finalLabel}`;
};

/** Convierte una ruta dot-notation a un label legible como fallback. */
function formatFieldLabel(path: string): string {
  const lastSegment = path.split(".").pop() ?? path;
  return lastSegment
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

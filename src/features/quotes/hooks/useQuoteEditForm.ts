"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import toast from "react-hot-toast";
import type { Customer } from "../../customers/interfaces/customer.interface";
import { useCurrencies } from "../../currency/hooks/useCurrencies";
import { useCustomerAddresses } from "../../customers/hooks/useCustomerAddresses";
import type { CustomerAddress } from "../../customers/interfaces/customer-address.interface";
import type { FormFieldError } from "../../../utils/getFieldError";
import {
  quoteFormSchema,
  quoteSubmitSchema,
  type QuoteFormValues,
} from "../schemas/quote.schema";
import {
  type QuoteById,
  type QuoteCreate,
  type QuoteItem,
  type QuoteOnboardingData,
  type QuotePaymentCondition,
} from "../interfaces/quote.interface";
import { useQuoteOnboardingData } from "./useQuoteOnboardingData";
import { useSatInfo } from "../../sat/hooks/useSatInfo";
import { useQuote } from "./useQuote";
import { createEmptyValues, type ExtraService } from "./useQuoteForm";
import { useUpdateQuote } from "./useUpdateQuote";
import type { QuoteValidationIssue } from "../utils/quoteValidationErrors";

// ─── Catálogos y constantes compartidas ────────────────────────────────────────

type OriginFlagKey =
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

const ORIGIN_FIELD_MAP: { label: string; field: OriginFlagKey }[] = [
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

const ORIGIN_OPTIONS = ORIGIN_FIELD_MAP.map((item) => item.label);

const PAYMENT_CONDITION_OPTIONS: { value: QuotePaymentCondition; label: string }[] = [
  { value: "100_anticipo", label: "100% Anticipo" },
  { value: "50_anticipo", label: "50% Anticipo" },
  { value: "vendedor_autoriza", label: "Vendedor autoriza" },
  { value: "pago_antes_embarque", label: "Pago antes de embarque" },
  { value: "por_confirmar", label: "Por confirmar" },
  { value: "otra_cantidad", label: "Otra cantidad" },
];

const IVA_OPTIONS = [
  { value: 16, label: "16%" },
  { value: 8, label: "8%" },
  { value: 0, label: "0%" },
];

const DEFAULT_USO_CFDI_VALUE = "G03";
const DEFAULT_USO_CFDI_LABEL = "G03 - Gastos en general";

type OnboardingCustomer = QuoteOnboardingData["busqueda"]["clientes"][number];

// ─── Utilidades de mapeo ───────────────────────────────────────────────────────

// Convierte las banderas booleanas de origen de la cotización al valor de string del select
const reverseMapOrigenFlags = (quote: QuoteById): string => {
  const match = ORIGIN_FIELD_MAP.find((item) => quote[item.field as keyof QuoteById] === true);
  return match?.label ?? "";
};

// Convierte el label de origen seleccionado en el formulario a las banderas booleanas del payload
const mapOrigenFlags = (origen: string): Record<OriginFlagKey, boolean> => {
  const selectedField = ORIGIN_FIELD_MAP.find((item) => item.label === origen)?.field;
  return ORIGIN_FIELD_MAP.reduce(
    (accumulator, item) => ({
      ...accumulator,
      [item.field]: item.field === selectedField,
    }),
    {} as Record<OriginFlagKey, boolean>
  );
};

// Convierte las banderas booleanas de condición de pago al enum QuotePaymentCondition
const reverseMapCondicionPago = (quote: QuoteById): QuotePaymentCondition => {
  if (quote.anticipo_total) return "100_anticipo";
  if (quote.anticipo_parcial) return "50_anticipo";
  if (quote.vendedor_autoriza) return "vendedor_autoriza";
  if (quote.pago_antes_embarque) return "pago_antes_embarque";
  if (quote.por_confirmar) return "por_confirmar";
  if (quote.otra_cantidad) return "otra_cantidad";
  return "100_anticipo";
};

// Tipo alias para los productos del catálogo de onboarding
type OnboardingProduct = QuoteOnboardingData["busqueda"]["productos"][number];

// Normaliza cada talla de un detalle para construir el QuoteItem del formulario.
// Recibe el catálogo de productos para derivar las tallas disponibles por variante.
const mapDetalleToQuoteItem = (
  detalle: QuoteById["detalles"][number],
  products?: OnboardingProduct[]
): QuoteItem => {
  const primeraTalla = detalle.tallas[0];
  const llevaBordado = primeraTalla?.lleva_bordado ?? false;
  const llevaReflejante = primeraTalla?.lleva_reflejante ?? false;
  const llevaCorteManga = primeraTalla?.lleva_corte_manga ?? false;

  const cantidadTotal = detalle.tallas.reduce((sum, t) => sum + t.cantidad, 0);
  const precio = Number(detalle.precio_unitario) || 0;
  const importe = Number(detalle.subtotal_linea) || 0;

  return {
    productoId: detalle.producto,
    descripcion: detalle.producto_nombre,
    unidad: "PZA",
    cantidad: cantidadTotal,
    precio,
    descuento: 0,
    importe,
    colorId: detalle.color ?? undefined,
    colorNombre: detalle.color_nombre ?? undefined,
    colorHex: detalle.color_codigo_hex ?? undefined,
    // Derivar las tallas disponibles desde las variantes del producto en el catálogo.
    // Si no se encuentran variantes para ese producto/color, queda undefined
    // y useEditSizesDialog usará el catálogo global como fallback.
    availableSizes: (() => {
      if (!products?.length) return undefined;
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
            posicionNombre: u.codigo,
            // Convertir null/cero a undefined para que Zod los omita en .optional()
            ancho: Number(u.ancho_cm) > 0 ? u.ancho_cm : undefined,
            alto: Number(u.alto_cm) > 0 ? u.alto_cm : undefined,
            colorHilo: u.color_hilo ?? undefined,
            pantones: undefined,
            imagen: u.imagen ?? "",
            nuevoPonchado: false,
            serigrafia: false,
            sublimado: false,
            dtf: false,
            revelado: false,
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
};

// Construye los valores iniciales del formulario a partir de una cotización existente
const mapQuoteByIdToFormValues = (
  quote: QuoteById,
  todayStr: string,
  userName: string,
  customer?: OnboardingCustomer,
  regimenesFiscales?: { value: string; label: string }[],
  products?: OnboardingProduct[]
): QuoteFormValues => {
  const oc = quote.oc ?? "";
  const docRelacionado = `cotización-oc${oc.trim()}`;

  // Resuelve el código de régimen fiscal desde los catálogos
  const regimenFiscal = (() => {
    if (!customer) return "";
    const regimen = regimenesFiscales?.find(
      (r) => r.value === String(customer.sat_regimen_fiscal_id)
    );
    return regimen?.value ?? customer.sat_regimen_fiscal__codigo ?? "";
  })();

  return {
    clienteBusqueda: quote.cliente_razon_social || quote.cliente_nombre || "",
    clienteNombre: quote.cliente_nombre || "",
    razonSocial: quote.cliente_razon_social || "",
    // Los campos de facturación fiscal se obtienen del cliente registrado en los catálogos.
    rfc: customer?.rfc ?? "",
    regimenFiscal,
    direccionFiscal: customer?.direccion_fiscal ?? "",
    coloniaFiscal: customer?.colonia ?? "",
    codigoPostalFiscal: customer?.codigo_postal ?? "",
    ciudadFiscal: customer?.ciudad ?? "",
    estadoFiscal: customer?.estado ?? "",
    giroEmpresa: customer?.giro_empresarial ?? "",
    persona_pagos: quote.persona_pagos || "",
    correo_facturas: quote.correo_facturas || "",
    telefono_pagos: quote.telefono_pagos || "",
    oc,
    forma_pago: quote.forma_pago || "03",
    metodo_pago: quote.metodo_pago || "PUE",
    uso_cfdi: quote.uso_cfdi || DEFAULT_USO_CFDI_VALUE,
    referenciarOcFactura: false,
    condicionPago: reverseMapCondicionPago(quote),
    condicionPagoMonto: Number(quote.monto) || 0,
    fecha: todayStr,
    agente: userName,
    tipo_pedido: 0,
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
    docRelacionado,
    observaciones: quote.observaciones || "",
    flete: Number(quote.flete) || 0,
    seguros: Number(quote.seguros) || 0,
    anticipo: Number(quote.anticipo) || 0,
    iva: quote.iva ?? 16,
    moneda: quote.moneda || 0,
    items: (quote.detalles ?? []).map((d) => mapDetalleToQuoteItem(d, products)),
  };
};

// ─── Utilidades de validación y scroll (idénticas a useQuoteForm) ──────────────

type QuoteField = keyof QuoteFormValues;
type ErrorNode = {
  [key: string]: ErrorNode | FormFieldError | ErrorNode[] | undefined;
};

const setErrorByPath = (target: ErrorNode, path: (string | number)[], message: string) => {
  if (path.length === 0) return;

  let current: ErrorNode | ErrorNode[] = target;
  path.forEach((rawSegment, index) => {
    const segment = String(rawSegment);
    const isLast = index === path.length - 1;

    if (Array.isArray(current)) {
      const numeric = Number(segment);
      const safeIndex = Number.isFinite(numeric) ? numeric : 0;
      if (!current[safeIndex]) current[safeIndex] = {};
      if (isLast) {
        (current[safeIndex] as ErrorNode).message = message as unknown as ErrorNode;
        return;
      }
      current = current[safeIndex] as ErrorNode;
      return;
    }

    if (isLast) {
      current[segment] = { message };
      return;
    }

    const nextSegment = String(path[index + 1]);
    const nextIsIndex = Number.isFinite(Number(nextSegment));
    const nextValue = current[segment];
    if (!nextValue || typeof nextValue !== "object") {
      current[segment] = nextIsIndex ? [] : {};
    }
    current = current[segment] as ErrorNode | ErrorNode[];
  });
};

const getPathValue = (source: unknown, path: string) => {
  if (!source || typeof source !== "object") return undefined;
  const tokens = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: unknown = source;
  for (const token of tokens) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
};

const scrollToFirstValidationError = (formElement: HTMLFormElement, issuePaths: string[]) => {
  if (issuePaths.length === 0) return;

  const normalizedIssuePaths = issuePaths.filter(Boolean);
  const controls = Array.from(
    formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea"
    )
  ).filter(
    (el) =>
      Boolean(el.name) &&
      !el.disabled &&
      !(el instanceof HTMLInputElement && el.type === "hidden")
  );

  const firstInvalidControl = controls.find((control) =>
    normalizedIssuePaths.some(
      (path) =>
        path === control.name ||
        path.startsWith(`${control.name}.`) ||
        control.name.startsWith(`${path}.`)
    )
  );

  if (firstInvalidControl) {
    firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidControl.focus({ preventScroll: true });
    return;
  }

  const hasItemsError = normalizedIssuePaths.some(
    (path) => path === "items" || path.startsWith("items.")
  );
  const hasCustomerError = normalizedIssuePaths.some(
    (path) => path === "clienteBusqueda" || path.startsWith("clienteBusqueda.")
  );
  const hasExtraServicesError = normalizedIssuePaths.some(
    (path) => path === "servicios_extras" || path.startsWith("servicios_extras.")
  );

  if (hasCustomerError) {
    const anchor = formElement.querySelector<HTMLElement>('[data-error-anchor="clienteBusqueda"]');
    anchor?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (hasExtraServicesError) {
    const anchor = formElement.querySelector<HTMLElement>(
      '[data-error-anchor="servicios_extras"]'
    );
    anchor?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (hasItemsError) {
    const anchor = formElement.querySelector<HTMLElement>('[data-error-anchor="items"]');
    anchor?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

const normalizeItem = (item: QuoteItem): QuoteItem => {
  const cantidad = Number(item.cantidad) || 0;
  const precio = Number(item.precio) || 0;
  const descuento = Number(item.descuento) || 0;
  const amount = cantidad * precio;
  const descuentoAmount = amount * (descuento / 100);
  const importe = Number((amount - descuentoAmount).toFixed(2));
  return { ...item, cantidad, precio, descuento, importe };
};

// ─── Hook principal ────────────────────────────────────────────────────────────

export function useQuoteEditForm(quoteId: number) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { data: onboardingData, isLoading: isOnboardingLoading } = useQuoteOnboardingData();
  const { data: satInfo } = useSatInfo();

  // Consulta de la cotización a editar
  const { data: quoteData, isLoading: isQuoteLoading } = useQuote(quoteId);

  const userName = session?.user?.name || "Usuario";
  const sellerName = userName;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement | null>(null);
  const emptyValues = useMemo(() => createEmptyValues(todayStr, userName), [todayStr, userName]);

  const customers = useMemo(
    () => onboardingData?.busqueda.clientes ?? [],
    [onboardingData?.busqueda.clientes]
  );
  const isCustomersLoading = isOnboardingLoading;

  const [errorTree, setErrorTree] = useState<ErrorNode>({});
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isEditSuccessVisible, setIsEditSuccessVisible] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);
  const [customerSelectedFromSearch, setCustomerSelectedFromSearch] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);

  // Estado de diálogos de edición por partida
  const [embroideryEditIndex, setEmbroideryEditIndex] = useState<number | null>(null);
  const [isEmbroideryEditOpen, setIsEmbroideryEditOpen] = useState(false);
  const [reflectiveEditIndex, setReflectiveEditIndex] = useState<number | null>(null);
  const [isReflectiveEditOpen, setIsReflectiveEditOpen] = useState(false);
  const [sizesEditIndex, setSizesEditIndex] = useState<number | null>(null);
  const [isSizesEditOpen, setIsSizesEditOpen] = useState(false);

  // Inicializa los servicios extras cuando se carga la cotización
  const [extraServicesInitialized, setExtraServicesInitialized] = useState(false);

  // Valores derivados de la cotización cargada para usarlos como defaultValues.
  // Depende de onboardingData para hidratar los campos de facturación desde el cliente.
  const initialFormValues = useMemo(() => {
    if (!quoteData || !onboardingData) return null;
    const matchedCustomer = onboardingData.busqueda.clientes.find(
      (c) => c.id === quoteData.cliente
    );
    return mapQuoteByIdToFormValues(
      quoteData,
      todayStr,
      userName,
      matchedCustomer,
      onboardingData.catalogos.regimenes_fiscales,
      onboardingData.busqueda.productos
    );
  }, [quoteData, todayStr, userName, onboardingData]);

  // Inicializa el cliente seleccionado y los servicios extras una sola vez al cargar la cotización.
  // Hacerlo dentro del render provoca rerenders extra justo cuando el formulario intenta hidratarse.
  useEffect(() => {
    if (!quoteData || !initialFormValues || extraServicesInitialized) return;

    setSelectedCustomerId(quoteData.cliente || 0);
    setCustomerSelectedFromSearch(quoteData.cliente > 0);
    setExtraServices(
      (quoteData.servicios_extras ?? []).map((s) => ({
        id: String(s.id),
        nombre: s.nombre,
        monto: Number(s.monto) || 0,
        cantidad: s.cantidad,
      }))
    );
    setExtraServicesInitialized(true);
  }, [extraServicesInitialized, initialFormValues, quoteData]);

  const { addresses: customerAddresses } = useCustomerAddresses({
    customerId: selectedCustomerId,
    enabled: customerSelectedFromSearch && selectedCustomerId > 0,
  });

  // showForm espera a que la cotización, los catálogos y la bootstrap inicial del modo edición estén listos.
  const showForm =
    Boolean(initialFormValues) &&
    extraServicesInitialized &&
    !isOnboardingLoading &&
    !isCurrenciesLoading;

  // Aplica los errores de validación del servidor al árbol de errores del formulario
  const applyServerValidationIssues = useCallback((issues: QuoteValidationIssue[]) => {
    const nextErrors: ErrorNode = {};
    issues.forEach((issue) => {
      setErrorByPath(
        nextErrors,
        issue.path.split(".").filter(Boolean),
        issue.message
      );
    });
    setErrorTree((prev) => ({ ...prev, ...nextErrors }));
    const issuePaths = issues.map((issue) => issue.path).filter(Boolean);
    if (formRef.current) {
      requestAnimationFrame(() => {
        if (!formRef.current) return;
        scrollToFirstValidationError(formRef.current, issuePaths);
      });
    }
  }, []);

  const { mutateAsync: updateQuoteMutation, isPending: isUpdatingQuote } = useUpdateQuote({
    onValidationError: applyServerValidationIssues,
  });

  // TanStack Form inicializado con valores vacíos bien tipados para mantener inputs siempre controlados.
  // Se hidrata con la cotización real mediante form.reset() en el useEffect de inicialización.
  const form = useForm({
    defaultValues: initialFormValues ?? emptyValues,
    onSubmit: async ({ value }) => {
      const parsed = quoteSubmitSchema.safeParse({
        ...value,
        servicios_extras: extraServices,
      });

      if (!parsed.success) {
        const nextErrors: ErrorNode = {};
        const issuePaths = parsed.error.issues
          .map((issue) => issue.path.map((segment) => String(segment)).join("."))
          .filter(Boolean);
        parsed.error.issues.forEach((issue) => {
          if (issue.path.length === 0) return;
          setErrorByPath(nextErrors, issue.path as (string | number)[], issue.message);
        });
        setErrorTree(nextErrors);
        if (formRef.current) {
          requestAnimationFrame(() => {
            if (!formRef.current) return;
            scrollToFirstValidationError(formRef.current, issuePaths);
          });
        }
        return;
      }

      setErrorTree({});
      const normalizedItems = (parsed.data.items ?? []).map(normalizeItem);
      const subtotal = normalizedItems.reduce((sum, item) => sum + item.importe, 0);
      const descuentoTotal = normalizedItems.reduce((sum, item) => {
        const rawAmount = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
        return sum + (rawAmount - item.importe);
      }, 0);

      const servicioEnvio = parsed.data.servicioEnvioActivo ? (parsed.data.envio ?? 0) : 0;
      const programaBordados = parsed.data.programaBordadosActivo
        ? (parsed.data.programa_bordados ?? 0)
        : 0;
      const bordadoPantalones = parsed.data.bordadoPantalonesExtrasActivo
        ? (parsed.data.bordado_pantalones_extras ?? 0)
        : 0;
      const serigrafia = parsed.data.serigrafiaActivo ? (parsed.data.serigrafia ?? 0) : 0;
      const reflejante = parsed.data.reflejanteActivo ? (parsed.data.reflejante ?? 0) : 0;
      const extraServicesTotal = parsed.data.servicios_extras.reduce(
        (sum, service) => sum + (service.monto ?? 0) * (service.cantidad ?? 0),
        0
      );
      const extras =
        (parsed.data.flete ?? 0) +
        (parsed.data.seguros ?? 0) +
        servicioEnvio +
        programaBordados +
        bordadoPantalones +
        serigrafia +
        reflejante +
        extraServicesTotal;
      const ivaRateDecimal = (parsed.data.iva ?? 0) / 100;
      const ivaAmount = Number(((subtotal + extras) * ivaRateDecimal).toFixed(2));
      const granTotal = Number((subtotal + extras + ivaAmount).toFixed(2));
      const saldoPendiente = Number((granTotal - (parsed.data.anticipo ?? 0)).toFixed(2));

      const totals = {
        subtotal: Number(subtotal.toFixed(2)),
        descuentoTotal: Number(descuentoTotal.toFixed(2)),
        ivaAmount,
        granTotal,
        saldoPendiente,
        flete: Number((parsed.data.flete ?? 0).toFixed(2)),
        seguro: Number((parsed.data.seguros ?? 0).toFixed(2)),
        anticipo: Number((parsed.data.anticipo ?? 0).toFixed(2)),
        ivaRate: ivaRateDecimal,
      };

      const mapCondicionPagoFlags = (condicion: QuotePaymentCondition) => ({
        anticipo_total: condicion === "100_anticipo",
        anticipo_parcial: condicion === "50_anticipo",
        vendedor_autoriza: condicion === "vendedor_autoriza",
        pago_antes_embarque: condicion === "pago_antes_embarque",
        por_confirmar: condicion === "por_confirmar",
        otra_cantidad: condicion === "otra_cantidad",
      });

      const detalle = (parsed.data.items ?? []).map((item) => {
        const llevaBordado = Boolean(item.bordados?.activo);
        const bordadoConfig = llevaBordado
          ? {
              ubicaciones:
                item.bordados?.especificaciones?.map((spec) => ({
                  codigo: spec.posicionCodigo,
                  ancho_cm: Math.max(0, Number(spec.ancho) || 0),
                  alto_cm: Math.max(0, Number(spec.alto) || 0),
                  color_hilo: spec.colorHilo ?? null,
                  pantones: spec.pantones ?? null,
                  imagen: spec.imagen,
                  nuevo_ponchado: spec.nuevoPonchado,
                  serigrafia: spec.serigrafia,
                  sublimado: spec.sublimado,
                  dtf: spec.dtf,
                  revelado: spec.revelado,
                })) ?? [],
              notas: item.bordados?.observaciones ?? "",
            }
          : { ubicaciones: [], notas: "" };
        const llevaReflejante = Boolean(item.reflejantes?.activo);
        const reflejanteConfig = llevaReflejante
          ? item.reflejantes?.especificaciones?.map((spec) => ({
              opcion: spec.opcion,
              posicion: spec.posicion,
              tipo: spec.tipo,
            })) ?? []
          : [];
        const llevaCorteManga = Boolean(item.lleva_corte_manga);
        const corteMangaConfig = llevaCorteManga ? { tipo: "1" } : null;
        return {
          producto: item.productoId,
          precio_unitario: String(Number(item.precio).toFixed(2)),
          color_id: item.colorId ?? null,
          tallas:
            item.tallas?.map((t) => ({
              talla: t.tallaId,
              cantidad: Math.max(0, Number(t.cantidad) || 0),
              lleva_bordado: llevaBordado,
              bordado_config: bordadoConfig,
              lleva_reflejante: llevaReflejante,
              reflejante_config: reflejanteConfig,
              lleva_corte_manga: llevaCorteManga,
              corte_manga_config: corteMangaConfig,
            })) ?? [],
        };
      });

      const quoteUpdatePayload: QuoteCreate = {
        pedido: {
          empresa: quoteData?.empresa ?? 1,
          sucursal: quoteData?.sucursal ?? 1,
          cliente: selectedCustomerId > 0 ? selectedCustomerId : null,
          moneda: parsed.data.moneda || 1,
          persona_pagos: parsed.data.persona_pagos ?? "",
          correo_facturas: parsed.data.correo_facturas ?? "",
          telefono_pagos: parsed.data.telefono_pagos ?? "",
          forma_pago: parsed.data.forma_pago ?? "",
          metodo_pago: parsed.data.metodo_pago ?? "",
          uso_cfdi: parsed.data.uso_cfdi ?? "",
          tipo_pedido: parsed.data.tipo_pedido ?? 0,
          estatus:
            parsed.data.estatusPedido === "Pendiente"
              ? 1
              : parsed.data.estatusPedido === "Parcial"
                ? 2
                : parsed.data.estatusPedido === "Completo"
                  ? 3
                  : 4,
          ...mapOrigenFlags(parsed.data.origen ?? ""),
          ...mapCondicionPagoFlags(parsed.data.condicionPago ?? "100_anticipo"),
          oc: parsed.data.oc?.trim() || "",
          monto: parsed.data.condicionPagoMonto ? String(parsed.data.condicionPagoMonto) : "0",
          empaque_ecologico: Boolean(parsed.data.empaque_ecologico),
          cliente_razon_social: parsed.data.razonSocial || "",
          cliente_nombre: parsed.data.clienteNombre || "",
          cliente_rfc: parsed.data.rfc || "",
          cliente_regimen_fiscal: parsed.data.regimenFiscal
            ? Number(parsed.data.regimenFiscal)
            : 1,
          cliente_direccion_fiscal: parsed.data.direccionFiscal || "",
          cliente_colonia: parsed.data.coloniaFiscal || "",
          cliente_codigo_postal: parsed.data.codigoPostalFiscal || "",
          cliente_ciudad: parsed.data.ciudadFiscal || "",
          cliente_estado: parsed.data.estadoFiscal || "",
          cliente_giro_empresarial: parsed.data.giroEmpresa || "",
          destinatario: parsed.data.destinatario || "",
          empresa_envio: parsed.data.empresaEnvio || "",
          telefono_envio: parsed.data.telefonoEnvio || "",
          celular_envio: parsed.data.celularEnvio || "",
          direccion_envio: parsed.data.direccionEnvio || "",
          colonia_envio: parsed.data.coloniaEnvio || "",
          codigo_postal: parsed.data.codigoPostalEnvio || "",
          ciudad_envio: parsed.data.ciudadEnvio || "",
          estado_envio: parsed.data.estadoEnvio || "",
          referencias: parsed.data.referenciasEnvio || "",
          embarque_parcial: Boolean(parsed.data.embarque_parcial),
          comentarios_parcialidad: parsed.data.embarque_parcial
            ? parsed.data.comentarios_parcialidad || ""
            : "",
          observaciones: parsed.data.observaciones || "",
          envio: servicioEnvio ? String(servicioEnvio.toFixed(2)) : "0.00",
          programa_bordados: programaBordados ? String(programaBordados.toFixed(2)) : "0.00",
          bordado_pantalones_extras: bordadoPantalones
            ? String(bordadoPantalones.toFixed(2))
            : "0.00",
          serigrafia: serigrafia ? String(serigrafia.toFixed(2)) : "0.00",
          reflejante: reflejante ? String(reflejante.toFixed(2)) : "0.00",
          bordado_logotipo: Boolean(parsed.data.bordado_logotipo),
          flete: parsed.data.flete ? String(parsed.data.flete.toFixed(2)) : "0.00",
          seguros: parsed.data.seguros ? String(parsed.data.seguros.toFixed(2)) : "0.00",
          anticipo: parsed.data.anticipo ? String(parsed.data.anticipo.toFixed(2)) : "0.00",
          subtotal: totals.subtotal ? String(totals.subtotal.toFixed(2)) : "0.00",
          descuento_global: totals.descuentoTotal
            ? String(totals.descuentoTotal.toFixed(2))
            : "0.00",
          ieps: "0.00",
          iva: parsed.data.iva || 0,
          gran_total: totals.granTotal ? String(totals.granTotal.toFixed(2)) : "0.00",
          activo: true,
          cotizacion: { id: quoteId },
        },
        detalle,
        servicios_extras: parsed.data.servicios_extras.map((service) => ({
          nombre: service.nombre ?? "",
          monto: String((service.monto ?? 0).toFixed(2)),
          cantidad: service.cantidad ?? 0,
        })),
      };

      try {
        await updateQuoteMutation({ quoteId, payload: quoteUpdatePayload });
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 400) {
          return;
        }
        return;
      }

      setIsEditSuccessVisible(true);
      setIsRouteTransitioning(true);
      router.push("/sales/quotes");
    },
  });

  // Hidrata el formulario con los valores de la cotización en cuanto están disponibles.
  // Se ejecuta una sola vez gracias al ref de guardia.
  const wasInitializedRef = useRef(false);
  useEffect(() => {
    if (initialFormValues && !wasInitializedRef.current) {
      wasInitializedRef.current = true;
      form.reset(initialFormValues);
    }
  }, [form, initialFormValues]);

  // Snapshot reactivo de valores del formulario
  const values = useStore(form.baseStore, (state) => state.values);
  const wasEnviarDomicilioFiscalRef = useRef(values.enviarDomicilioFiscal);

  // Sincroniza datos de envío cuando se usa domicilio fiscal
  useEffect(() => {
    if (values.enviarDomicilioFiscal) {
      form.setFieldValue("destinatario", values.clienteNombre || "");
      form.setFieldValue("empresaEnvio", values.razonSocial || "");
      form.setFieldValue("telefonoEnvio", values.telefono_pagos || "");
      form.setFieldValue("celularEnvio", values.telefono_pagos || "");
      form.setFieldValue("direccionEnvio", values.direccionFiscal || "");
      form.setFieldValue("coloniaEnvio", values.coloniaFiscal || "");
      form.setFieldValue("codigoPostalEnvio", values.codigoPostalFiscal || "");
      form.setFieldValue("ciudadEnvio", values.ciudadFiscal || "");
      form.setFieldValue("estadoEnvio", values.estadoFiscal || "");
      wasEnviarDomicilioFiscalRef.current = true;
      return;
    }
    wasEnviarDomicilioFiscalRef.current = false;
  }, [
    form,
    values.ciudadFiscal,
    values.clienteNombre,
    values.codigoPostalFiscal,
    values.coloniaFiscal,
    values.direccionFiscal,
    values.enviarDomicilioFiscal,
    values.estadoFiscal,
    values.razonSocial,
    values.telefono_pagos,
  ]);

  const watchedDocRelacionado = useMemo(
    () => `cotización-oc${(values.oc ?? "").trim()}`,
    [values.oc]
  );

  useEffect(() => {
    if (values.docRelacionado === watchedDocRelacionado) return;
    form.setFieldValue("docRelacionado", watchedDocRelacionado);
  }, [form, values.docRelacionado, watchedDocRelacionado]);

  const normalizePath = (field: string) => field.replace(/\[(\d+)\]/g, ".$1");

  const clearFieldErrors = useCallback((field: string) => {
    const path = field.replace(/\[(\d+)\]/g, ".$1").split(".");
    setErrorTree((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      const next = structuredClone(prev) as ErrorNode;
      let current: unknown = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        if (!current || typeof current !== "object") return next;
        current = (current as Record<string, unknown>)[key];
      }
      if (current && typeof current === "object") {
        delete (current as Record<string, unknown>)[path[path.length - 1]];
      }
      return next;
    });
  }, []);

  const clienteSearchTerm = values.clienteBusqueda ?? "";

  const setClienteSearchTerm = (value: string) => {
    form.setFieldValue("clienteBusqueda", value);
    clearFieldErrors("clienteBusqueda");
  };

  const validateField = (field: QuoteField, value: QuoteFormValues[QuoteField]) => {
    const fieldSchema = quoteFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) {
      clearFieldErrors(field);
      return true;
    }
    setErrorTree((prev) => {
      const next = structuredClone(prev) as ErrorNode;
      next[field] = { message: parsed.error.issues[0]?.message ?? "Valor inválido" };
      return next;
    });
    return false;
  };

  const getError = (field: string): FormFieldError | undefined => {
    const value = getPathValue(errorTree, normalizePath(field));
    if (value && typeof value === "object" && "message" in value) {
      return value as FormFieldError;
    }
    return undefined;
  };

  // Derivados de totales
  const watchedItems = useMemo(() => values.items ?? [], [values.items]);
  const { subtotal, descuentoTotal, ivaAmount, granTotal, saldoPendiente } = useMemo(() => {
    const nextSubtotal = watchedItems.reduce(
      (sum: number, item: QuoteItem) => sum + (Number(item.importe) || 0),
      0
    );
    const nextDescuentoTotal = watchedItems.reduce((sum: number, item: QuoteItem) => {
      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio) || 0;
      const importe = Number(item.importe) || 0;
      return sum + (cantidad * precio - importe);
    }, 0);
    const servicioEnvioTotal = values.servicioEnvioActivo ? Number(values.envio) || 0 : 0;
    const programaBordadosTotal = values.programaBordadosActivo
      ? Number(values.programa_bordados) || 0
      : 0;
    const bordadoPantalonesTotal = values.bordadoPantalonesExtrasActivo
      ? Number(values.bordado_pantalones_extras) || 0
      : 0;
    const serigrafiaTotal = values.serigrafiaActivo ? Number(values.serigrafia) || 0 : 0;
    const reflejanteTotal = values.reflejanteActivo ? Number(values.reflejante) || 0 : 0;
    const extraServicesTotal = extraServices.reduce(
      (sum, service) => sum + (Number(service.monto) || 0) * (Number(service.cantidad) || 0),
      0
    );
    const extras =
      (Number(values.flete) || 0) +
      (Number(values.seguros) || 0) +
      servicioEnvioTotal +
      programaBordadosTotal +
      bordadoPantalonesTotal +
      serigrafiaTotal +
      reflejanteTotal +
      extraServicesTotal;
    const ivaRate = Number(values.iva) || 0;
    const nextIvaAmount = Number(((nextSubtotal + extras) * (ivaRate / 100)).toFixed(2));
    const nextGranTotal = Number((nextSubtotal + extras + nextIvaAmount).toFixed(2));
    const nextSaldoPendiente = Number(
      (nextGranTotal - (Number(values.anticipo) || 0)).toFixed(2)
    );
    return {
      subtotal: nextSubtotal,
      descuentoTotal: nextDescuentoTotal,
      ivaAmount: nextIvaAmount,
      granTotal: nextGranTotal,
      saldoPendiente: nextSaldoPendiente,
    };
  }, [
    watchedItems,
    values.anticipo,
    values.bordadoPantalonesExtrasActivo,
    values.bordado_pantalones_extras,
    values.envio,
    values.flete,
    values.iva,
    values.programaBordadosActivo,
    values.programa_bordados,
    values.reflejante,
    values.reflejanteActivo,
    values.serigrafia,
    values.serigrafiaActivo,
    values.seguros,
    values.servicioEnvioActivo,
    extraServices,
  ]);

  const fields = useMemo(
    () =>
      watchedItems.map((item: QuoteItem, index: number) => ({
        id: `${item.productoId || "item"}-${index}`,
      })),
    [watchedItems]
  );

  // API estilo field-array para tabla de productos
  const append = (itemOrItems: QuoteItem | QuoteItem[]) => {
    const incomingItems = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (incomingItems.length === 0) return;
    const normalizedItems = incomingItems.map(normalizeItem);
    const currentItems = form.state.values.items ?? [];
    form.setFieldValue("items", [...currentItems, ...normalizedItems]);
    clearFieldErrors("items");
  };

  const remove = (index: number) => {
    form.setFieldValue(
      "items",
      watchedItems.filter((_: QuoteItem, itemIndex: number) => itemIndex !== index)
    );
  };

  const update = (index: number, item: QuoteItem) => {
    const normalized = normalizeItem(item);
    form.setFieldValue(
      "items",
      watchedItems.map((current: QuoteItem, itemIndex: number) =>
        itemIndex === index ? normalized : current
      )
    );
    clearFieldErrors(`items.${index}`);
  };

  const openEmbroideryEdit = useCallback((index: number) => {
    setEmbroideryEditIndex(index);
    setIsEmbroideryEditOpen(true);
  }, []);

  const handleEmbroideryEditSave = useCallback(
    (updatedItem: QuoteItem) => {
      if (embroideryEditIndex === null) return;
      update(embroideryEditIndex, updatedItem);
      setIsEmbroideryEditOpen(false);
      setEmbroideryEditIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [embroideryEditIndex]
  );

  const handleEmbroideryEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsEmbroideryEditOpen(nextOpen);
    if (!nextOpen) setEmbroideryEditIndex(null);
  }, []);

  const openReflectiveEdit = useCallback((index: number) => {
    setReflectiveEditIndex(index);
    setIsReflectiveEditOpen(true);
  }, []);

  const handleReflectiveEditSave = useCallback(
    (updatedItem: QuoteItem) => {
      if (reflectiveEditIndex === null) return;
      update(reflectiveEditIndex, updatedItem);
      setIsReflectiveEditOpen(false);
      setReflectiveEditIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reflectiveEditIndex]
  );

  const handleReflectiveEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsReflectiveEditOpen(nextOpen);
    if (!nextOpen) setReflectiveEditIndex(null);
  }, []);

  const openSizesEdit = useCallback((index: number) => {
    setSizesEditIndex(index);
    setIsSizesEditOpen(true);
  }, []);

  const handleSizesEditSave = useCallback(
    (updatedItem: QuoteItem) => {
      if (sizesEditIndex === null) return;
      update(sizesEditIndex, updatedItem);
      setIsSizesEditOpen(false);
      setSizesEditIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sizesEditIndex]
  );

  const handleSizesEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsSizesEditOpen(nextOpen);
    if (!nextOpen) setSizesEditIndex(null);
  }, []);

  const handleSelectShippingAddress = useCallback(
    (address: CustomerAddress) => {
      form.setFieldValue("destinatario", address.destinatario ?? "");
      form.setFieldValue("empresaEnvio", address.empresa_envio ?? "");
      form.setFieldValue("telefonoEnvio", address.telefono_envio ?? "");
      form.setFieldValue("celularEnvio", address.celular_envio ?? "");
      form.setFieldValue("direccionEnvio", address.direccion_envio ?? "");
      form.setFieldValue("coloniaEnvio", address.colonia_envio ?? "");
      form.setFieldValue("codigoPostalEnvio", address.codigo_postal ?? "");
      form.setFieldValue("ciudadEnvio", address.ciudad_envio ?? "");
      form.setFieldValue("estadoEnvio", address.estado_envio ?? "");
      form.setFieldValue("referenciasEnvio", address.referencias ?? "");
    },
    [form]
  );

  const handleSelectCustomer = useCallback(
    (customer: OnboardingCustomer, fromSearch = true) => {
      const selectedRegimen = onboardingData?.catalogos.regimenes_fiscales.find(
        (item) => item.value === String(customer.sat_regimen_fiscal_id)
      );
      const regimenValue =
        selectedRegimen?.value ??
        customer.sat_regimen_fiscal__codigo ??
        String(customer.sat_regimen_fiscal_id);
      form.setFieldValue("clienteBusqueda", customer.razon_social ?? customer.nombre ?? "");
      form.setFieldValue("clienteNombre", customer.nombre ?? "");
      form.setFieldValue("razonSocial", customer.razon_social ?? "");
      form.setFieldValue("rfc", customer.rfc ?? "");
      form.setFieldValue("regimenFiscal", regimenValue);
      form.setFieldValue("direccionFiscal", customer.direccion_fiscal ?? "");
      form.setFieldValue("coloniaFiscal", customer.colonia ?? "");
      form.setFieldValue("codigoPostalFiscal", customer.codigo_postal ?? "");
      form.setFieldValue("ciudadFiscal", customer.ciudad ?? "");
      form.setFieldValue("estadoFiscal", customer.estado ?? "");
      form.setFieldValue("giroEmpresa", customer.giro_empresarial ?? "");
      setSelectedCustomerId(Number(customer.id) || 0);
      setCustomerSelectedFromSearch(fromSearch);
      form.setFieldValue("telefono_pagos", customer.telefono ?? "");
      form.setFieldValue("correo_facturas", customer.correo ?? "");
      form.setFieldValue("enviarDomicilioFiscal", true);
      form.setFieldValue("destinatario", customer.nombre ?? "");
      form.setFieldValue("empresaEnvio", customer.razon_social ?? "");
      form.setFieldValue("telefonoEnvio", customer.telefono ?? "");
      form.setFieldValue("celularEnvio", customer.telefono ?? "");
      form.setFieldValue("direccionEnvio", customer.direccion_fiscal ?? "");
      form.setFieldValue("coloniaEnvio", customer.colonia ?? "");
      form.setFieldValue("codigoPostalEnvio", customer.codigo_postal ?? "");
      form.setFieldValue("ciudadEnvio", customer.ciudad ?? "");
      form.setFieldValue("estadoEnvio", customer.estado ?? "");
      clearFieldErrors("clienteBusqueda");
    },
    [clearFieldErrors, form, onboardingData?.catalogos.regimenes_fiscales]
  );

  const handleCustomerCreated = (customer?: Customer) => {
    setIsCustomerDialogOpen(false);
    if (!customer) return;
    const satRegimen = satInfo?.regimenes_fiscales.find(
      (item) => item.id_sat_regimen_fiscal === customer.sat_regimen_fiscal
    );
    const regimenCodigo = satRegimen?.codigo ?? "";
    const regimenDescripcion = satRegimen?.descripcion ?? "";
    handleSelectCustomer(
      {
        id: Number(customer.id),
        razon_social: customer.razon_social,
        nombre: customer.nombre,
        rfc: customer.rfc,
        correo: customer.correo,
        telefono: customer.telefono,
        direccion_fiscal: customer.direccion_fiscal,
        colonia: customer.colonia,
        codigo_postal: customer.codigo_postal,
        ciudad: customer.ciudad,
        estado: customer.estado,
        giro_empresarial: customer.giro_empresarial,
        sat_regimen_fiscal_id: Number(customer.sat_regimen_fiscal),
        sat_regimen_fiscal__codigo: regimenCodigo,
        sat_regimen_fiscal__descripcion: regimenDescripcion,
      },
      false
    );
  };

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmittingForm) return;
    setIsSubmittingForm(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Al limpiar se restablece al estado inicial de la cotización cargada (no a valores vacíos)
  const handleReset = () => {
    if (initialFormValues) {
      form.reset(initialFormValues);
      setExtraServices(
        (quoteData?.servicios_extras ?? []).map((s) => ({
          id: String(s.id),
          nombre: s.nombre,
          monto: Number(s.monto) || 0,
          cantidad: s.cantidad,
        }))
      );
      setSelectedCustomerId(quoteData?.cliente || 0);
      setCustomerSelectedFromSearch((quoteData?.cliente ?? 0) > 0);
    }
    setErrorTree({});
    toast.success("Formulario restablecido a los datos originales de la cotización");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleBack = () => {
    router.push("/sales/quotes");
  };

  const isPending = isSubmittingForm || form.state.isSubmitting || isUpdatingQuote || isEditSuccessVisible || isRouteTransitioning;

  const itemErrors = getError("items");
  const tipoPedidoError = getError("tipo_pedido");
  const origenError = getError("origen");

  // Opciones desde onboarding y catálogos
  const tiposPedidoOptions = useMemo(
    () => [
      { value: 0, label: "Seleccionar..." },
      ...(onboardingData?.catalogos.tipos_pedido ?? []),
    ],
    [onboardingData?.catalogos.tipos_pedido]
  );

  const formasPagoOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(onboardingData?.catalogos.formas_pago ?? []),
    ],
    [onboardingData?.catalogos.formas_pago]
  );

  const metodosPagoOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(onboardingData?.catalogos.metodos_pago ?? []),
    ],
    [onboardingData?.catalogos.metodos_pago]
  );

  const regimenFiscalOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(onboardingData?.catalogos.regimenes_fiscales ?? []),
    ],
    [onboardingData?.catalogos.regimenes_fiscales]
  );

  const usoCfdiOptions = useMemo(
    () => onboardingData?.catalogos.usos_cfdi ?? [],
    [onboardingData?.catalogos.usos_cfdi]
  );

  const currencyOptions = useMemo(() => {
    const preferredCodes = ["MXN", "USD", "EUR"];
    const activeCurrencies = (currencies ?? []).filter((item) => item.activo);
    const sortedCurrencies = activeCurrencies.sort((left, right) => {
      const leftIndex = preferredCodes.indexOf(left.codigo_iso);
      const rightIndex = preferredCodes.indexOf(right.codigo_iso);
      const leftPriority = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const rightPriority = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.nombre.localeCompare(right.nombre);
    });
    return [
      { value: 0, label: "Seleccionar..." },
      ...sortedCurrencies.map((item) => ({
        value: item.id,
        label: `${item.codigo_iso} - ${item.nombre}`,
      })),
    ];
  }, [currencies]);

  useEffect(() => {
    if (!values.moneda && currencyOptions.length > 1) {
      form.setFieldValue("moneda", Number(currencyOptions[1].value));
    }
  }, [currencyOptions, form, values.moneda]);

  useEffect(() => {
    if (usoCfdiOptions.length === 0) return;
    const preferredCfdiOption = usoCfdiOptions.find(
      (option) =>
        option.value === DEFAULT_USO_CFDI_VALUE ||
        option.label.trim().toLowerCase() === DEFAULT_USO_CFDI_LABEL.toLowerCase()
    );
    const fallbackCfdiOption = usoCfdiOptions[0];
    const defaultCfdiValue = preferredCfdiOption?.value ?? fallbackCfdiOption.value;
    const isCurrentValueValid = usoCfdiOptions.some((option) => option.value === values.uso_cfdi);
    if (!values.uso_cfdi || !isCurrentValueValid) {
      form.setFieldValue("uso_cfdi", defaultCfdiValue);
    }
  }, [form, usoCfdiOptions, values.uso_cfdi]);

  return {
    form,
    formRef,
    formKey: `quote-edit-${quoteId}`,
    getError,
    clearFieldErrors,
    validateField,
    isPending,
    sellerName,
    userName,
    todayStr,
    tiposPedidoOptions,
    originOptions: ORIGIN_OPTIONS,
    paymentConditionOptions: PAYMENT_CONDITION_OPTIONS,
    ivaOptions: IVA_OPTIONS,
    regimenFiscalOptions,
    usoCfdiOptions,
    currencyOptions,
    formasPagoOptions,
    metodosPagoOptions,
    sizes: onboardingData?.catalogos.tallas ?? [],
    products: onboardingData?.busqueda.productos ?? [],
    isCustomersLoading,
    isCurrenciesLoading,
    isOnboardingLoading: isOnboardingLoading || isQuoteLoading,
    showForm,
    isCreationSuccessVisible: isEditSuccessVisible,
    isRouteTransitioning,
    handleFormSubmit,
    handleReset,
    handleBack,
    fields,
    append,
    remove,
    update,
    watchedItems,
    watchedFecha: values.fecha,
    watchedDocRelacionado,
    watchedEnviarDomicilioFiscal: values.enviarDomicilioFiscal,
    watchedCondicionPago: values.condicionPago,
    hasCustomerSelected: selectedCustomerId !== 0,
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
    itemsError: itemErrors,
    tipoPedidoError,
    origenError,
    isAddProductsOpen,
    setIsAddProductsOpen,
    editIndex,
    setEditIndex,
    clienteSearchTerm,
    setClienteSearchTerm,
    isCustomerDialogOpen,
    setIsCustomerDialogOpen,
    customers,
    handleSelectCustomer,
    handleCustomerCreated,
    customerAddresses,
    handleSelectShippingAddress,
    extraServices,
    setExtraServices,
    embroideryEditIndex,
    isEmbroideryEditOpen,
    openEmbroideryEdit,
    handleEmbroideryEditSave,
    handleEmbroideryEditOpenChange,
    reflectiveEditIndex,
    isReflectiveEditOpen,
    openReflectiveEdit,
    handleReflectiveEditSave,
    handleReflectiveEditOpenChange,
    sizesEditIndex,
    isSizesEditOpen,
    openSizesEdit,
    handleSizesEditSave,
    handleSizesEditOpenChange,
  };
}

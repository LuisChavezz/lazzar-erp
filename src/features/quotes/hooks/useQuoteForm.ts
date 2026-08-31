"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import { AxiosError } from "axios";
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
  QuoteCreate,
  QuoteItem,
  type QuoteMuestraDetail,
  QuoteOnboardingData,
  type QuotePaymentCondition,
} from "../interfaces/quote.interface";
import { deriveTiposServicio } from "../utils/deriveTiposServicio";
import { scrollToFirstValidationError } from "../utils/scrollToFirstValidationError";
import { TIPO_PEDIDO } from "../../orders/constants/pedidoStatus";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCreateQuote, type QuoteValidationIssue } from "./useCreateQuote";
import { useQuoteOnboardingData } from "./useQuoteOnboardingData";
import { useSatInfo } from "../../sat/hooks/useSatInfo";

type QuoteField = keyof QuoteFormValues;
type OnboardingCustomer = QuoteOnboardingData["busqueda"]["clientes"][number];
type ErrorNode = {
  [key: string]: ErrorNode | FormFieldError | ErrorNode[] | undefined;
};

export interface ExtraService {
  id: string;
  nombre: string;
  monto: number;
  cantidad: number;
}

/**
 * Línea de producto de muestra en el formulario. Vive FUERA de TanStack Form,
 * en su propio `useState`, igual que `extraServices` — nunca dentro de `items`.
 * Esa separación es la que hace estructural la exclusividad catálogo/muestra:
 * el arreglo del modo inactivo simplemente está vacío.
 */
export interface MuestraLine {
  id: string;
  nombre: string;
}

/**
 * Aplana la descripción de una muestra a UNA sola línea.
 *
 * El campo se captura en un `<textarea>` porque escribir descripciones largas
 * ahí es más cómodo, pero los saltos de línea son una comodidad de captura, no
 * información: `producto_nombre_externo` se guarda como texto plano. Colapsa
 * cualquier racha de espacios en blanco —saltos, tabulaciones, espacios
 * repetidos— a un solo espacio y recorta los extremos.
 *
 * Se aplica SOLO al armar el payload, nunca en el `onChange`: mientras el
 * usuario escribe tiene que seguir viendo sus saltos de línea en el textarea.
 *
 * Colapsar solo puede acortar el texto, así que el tope de 350 del schema sigue
 * cumpliéndose sin revalidar.
 */
export const flattenMuestraNombre = (nombre: string): string =>
  nombre.replace(/\s+/g, " ").trim();

/** Modo de captura de partidas. Ver `quoteFormSchema.modo`. */
export type QuoteCaptureMode = "catalogo" | "muestra";

/**
 * `tipo_pedido` que corresponde a cada modo de captura. El usuario NO lo elige:
 * el select sigue deshabilitado y el valor lo dicta el toggle, que es la única
 * entrada que decide si la cotización es una venta o una solicitud de muestra.
 *
 * Es la única fuente de esta correspondencia — la usan el estado inicial, el
 * cambio de modo y el armado del payload, para que las tres no puedan divergir.
 */
export const tipoPedidoForMode = (mode: QuoteCaptureMode): number =>
  mode === "muestra" ? TIPO_PEDIDO.MUESTRA : TIPO_PEDIDO.PEDIDO_DE_VENTA;

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

const normalizeItem = (item: QuoteItem): QuoteItem => {
  const cantidad = Number(item.cantidad) || 0;
  const precio = Number(item.precio) || 0;
  const descuento = Number(item.descuento) || 0;
  const amount = cantidad * precio;
  const descuentoAmount = amount * (descuento / 100);
  const importe = Number((amount - descuentoAmount).toFixed(2));
  return {
    ...item,
    cantidad,
    precio,
    descuento,
    importe,
  };
};

// Estado inicial para flujo de creación.
export const createEmptyValues = (todayStr: string, userName: string): QuoteFormValues => ({
  modo: "catalogo",
  clienteBusqueda: "",
  clienteNombre: "",
  razonSocial: "",
  rfc: "",
  regimenFiscal: "",
  direccionFiscal: "",
  coloniaFiscal: "",
  codigoPostalFiscal: "",
  ciudadFiscal: "",
  estadoFiscal: "",
  persona_pagos: "",
  correo_facturas: "",
  telefono_pagos: "",
  oc: "",
  forma_pago: "03",
  metodo_pago: "PUE",
  uso_cfdi: DEFAULT_USO_CFDI_VALUE,
  referenciarOcFactura: false,
  condicionPago: "100_anticipo",
  condicionPagoMonto: 0,
  fecha: todayStr,
  agente: userName,
  // No lo elige el usuario (el select sigue deshabilitado): lo dicta el modo de
  // captura. Arranca en catálogo, así que arranca en "Pedido de venta".
  tipo_pedido: tipoPedidoForMode("catalogo"),
  destinatario: "",
  empresaEnvio: "",
  telefonoEnvio: "",
  celularEnvio: "",
  direccionEnvio: "",
  coloniaEnvio: "",
  codigoPostalEnvio: "",
  ciudadEnvio: "",
  estadoEnvio: "",
  referenciasEnvio: "",
  enviarDomicilioFiscal: false,
  embarcarConOtrosPedidos: false,
  embarque_parcial: false,
  comentarios_parcialidad: "",
  servicioEnvioActivo: false,
  envio: 0,
  programaBordadosActivo: false,
  programa_bordados: 0,
  bordadoPantalonesExtrasActivo: false,
  bordado_pantalones_extras: 0,
  serigrafiaActivo: false,
  serigrafia: 0,
  reflejanteActivo: false,
  reflejante: 0,
  bordado_logotipo: true,
  estatusPedido: "Pendiente",
  docRelacionado: "",
  observaciones: "",
  flete: 0,
  seguros: 0,
  anticipo: 0,
  iva: 16,
  moneda: 0,
  items: [],
});

// Traduce rutas de error de Zod a un árbol de errores consumible por los campos del formulario.
const setErrorByPath = (target: ErrorNode, path: (string | number)[], message: string) => {
  if (path.length === 0) {
    return;
  }

  let current: ErrorNode | ErrorNode[] = target;
  path.forEach((rawSegment, index) => {
    const segment = String(rawSegment);
    const isLast = index === path.length - 1;

    if (Array.isArray(current)) {
      const numeric = Number(segment);
      const safeIndex = Number.isFinite(numeric) ? numeric : 0;
      if (!current[safeIndex]) {
        current[safeIndex] = {};
      }
      if (isLast) {
        (current[safeIndex] as ErrorNode).message = message as unknown as ErrorNode;
        return;
      }
      // Avanza al elemento del array sin agregar una clave extra con el índice.
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

// Obtiene un valor anidado por ruta dinámica (dot notation), usado para extraer errores por campo.
const getPathValue = (source: unknown, path: string) => {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  const tokens = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let current: unknown = source;
  for (const token of tokens) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
};

export function useQuoteForm() {
  // Dependencias de navegación y fuentes de datos del formulario.
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { data: onboardingData, isLoading: isOnboardingLoading } = useQuoteOnboardingData();
  const { data: satInfo } = useSatInfo();
  const { selectedCompany, selectedBranch } = useWorkspaceStore();
  const selectedCompanyId = selectedCompany?.id || 1; // Fallback
  const selectedBranchId = selectedBranch?.id || 1; // Fallback

  const userName = session?.user?.name || "Usuario";
  const sellerName = userName;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement | null>(null);
  const applyServerValidationIssues = useCallback((issues: QuoteValidationIssue[]) => {
    const nextErrors: ErrorNode = {};
    const issuePaths: string[] = [];

    issues.forEach((issue) => {
      const normalizedPath = issue.path.replace(/\[(\d+)\]/g, ".$1");
      const pathSegments = normalizedPath.split(".").filter(Boolean);

      if (pathSegments.length === 0) {
        return;
      }

      setErrorByPath(nextErrors, pathSegments, issue.message);
      issuePaths.push(normalizedPath);
    });

    if (issuePaths.length === 0) {
      return;
    }

    setErrorTree(nextErrors);
    if (formRef.current) {
      requestAnimationFrame(() => {
        if (!formRef.current) {
          return;
        }
        scrollToFirstValidationError(formRef.current, issuePaths);
      });
    }
  }, []);
  const customers = useMemo(() => onboardingData?.busqueda.clientes ?? [], [onboardingData?.busqueda.clientes]);
  const isCustomersLoading = isOnboardingLoading;
  const [errorTree, setErrorTree] = useState<ErrorNode>({});
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isCreationSuccessVisible, setIsCreationSuccessVisible] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);
  // Indica si el cliente fue seleccionado mediante el buscador (no mediante creación).
  const [customerSelectedFromSearch, setCustomerSelectedFromSearch] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  // Partidas de producto de muestra — mismo patrón que `extraServices`.
  const [muestraLines, setMuestraLines] = useState<MuestraLine[]>([]);
  // Estado del diálogo de edición de bordado por partida.
  const [embroideryEditIndex, setEmbroideryEditIndex] = useState<number | null>(null);
  const [isEmbroideryEditOpen, setIsEmbroideryEditOpen] = useState(false);
  // Estado del diálogo de edición de reflejante por partida.
  const [reflectiveEditIndex, setReflectiveEditIndex] = useState<number | null>(null);
  const [isReflectiveEditOpen, setIsReflectiveEditOpen] = useState(false);
  // Estado del diálogo de edición de tallas por partida.
  const [sizesEditIndex, setSizesEditIndex] = useState<number | null>(null);
  const [isSizesEditOpen, setIsSizesEditOpen] = useState(false);

  // Obtiene las direcciones de envío del cliente seleccionado (solo si fue buscado, no creado).
  const { addresses: customerAddresses } = useCustomerAddresses({
    customerId: selectedCustomerId,
    enabled: customerSelectedFromSearch && selectedCustomerId > 0,
  });

  const showForm = true;

  const emptyValues = useMemo(() => createEmptyValues(todayStr, userName), [todayStr, userName]);

  const { mutateAsync: createQuoteMutation, isPending: isCreatingQuote } = useCreateQuote({
    onValidationError: applyServerValidationIssues,
  });

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      const parsed = quoteSubmitSchema.safeParse({
        ...value,
        servicios_extras: extraServices,
        muestras: muestraLines,
      });
      if (!parsed.success) {
        const nextErrors: ErrorNode = {};
        const issuePaths = parsed.error.issues
          .map((issue) => issue.path.map((segment) => String(segment)).join("."))
          .filter(Boolean);
        parsed.error.issues.forEach((issue) => {
          if (issue.path.length === 0) {
            return;
          }
          setErrorByPath(nextErrors, issue.path as (string | number)[], issue.message);
        });
        setErrorTree(nextErrors);
        // Si hay errores, hace scroll al primer campo para acelerar corrección del usuario.
        if (formRef.current) {
          requestAnimationFrame(() => {
            if (!formRef.current) {
              return;
            }
            scrollToFirstValidationError(formRef.current, issuePaths);
          });
        }
        return;
      }

      setErrorTree({});

      /**
       * Una cotización de muestra NO lleva importes de ningún tipo: es una
       * solicitud de alta de producto, no una venta. El cero se fuerza aquí,
       * en el ORIGEN de cada sumando, y no solo sobre `gran_total`: así ningún
       * campo monetario del payload (`flete`, `seguros`, `anticipo`, `envio`,
       * `iva`, …) puede quedar con un valor residual si el usuario capturó
       * cargos en modo catálogo y luego cambió de modo. La UI además oculta
       * esas secciones; esto es la red de seguridad, no el mecanismo principal.
       */
      const isMuestraMode = parsed.data.modo === "muestra";
      const zeroIfMuestra = (amount: number | undefined) =>
        isMuestraMode ? 0 : amount ?? 0;

      const normalizedItems = (parsed.data.items ?? []).map(normalizeItem)
      const subtotal = normalizedItems.reduce((sum, item) => sum + item.importe, 0);
      const descuentoTotal = normalizedItems.reduce((sum, item) => {
        const rawAmount = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
        return sum + (rawAmount - item.importe);
      }, 0);

      const flete = zeroIfMuestra(parsed.data.flete);
      const seguros = zeroIfMuestra(parsed.data.seguros);
      const anticipo = zeroIfMuestra(parsed.data.anticipo);
      // El bloque "Condiciones de pago" vive en Información Comercial, que NO se
      // oculta en modo muestra: sin este cero, elegir "Otra cantidad" mandaba un
      // `monto` real junto a un `gran_total` de 0.00.
      const condicionPagoMonto = zeroIfMuestra(parsed.data.condicionPagoMonto);
      const servicioEnvio = parsed.data.servicioEnvioActivo
        ? zeroIfMuestra(parsed.data.envio)
        : 0;
      const programaBordados = parsed.data.programaBordadosActivo
        ? zeroIfMuestra(parsed.data.programa_bordados)
        : 0;
      const bordadoPantalones = parsed.data.bordadoPantalonesExtrasActivo
        ? zeroIfMuestra(parsed.data.bordado_pantalones_extras)
        : 0;
      const serigrafia = parsed.data.serigrafiaActivo
        ? zeroIfMuestra(parsed.data.serigrafia)
        : 0;
      const reflejante = parsed.data.reflejanteActivo
        ? zeroIfMuestra(parsed.data.reflejante)
        : 0;
      const extraServicesTotal = isMuestraMode
        ? 0
        : parsed.data.servicios_extras.reduce(
          (sum, service) => sum + (service.monto ?? 0) * (service.cantidad ?? 0),
          0
        );
      const extras =
        flete +
        seguros +
        servicioEnvio +
        programaBordados +
        bordadoPantalones +
        serigrafia +
        reflejante +
        extraServicesTotal;
      const ivaRate = isMuestraMode ? 0 : parsed.data.iva ?? 0;
      const ivaRateDecimal = ivaRate / 100;
      const ivaAmount = Number(((subtotal + extras) * ivaRateDecimal).toFixed(2));
      const granTotal = Number((subtotal + extras + ivaAmount).toFixed(2));
      const saldoPendiente = Number((granTotal - anticipo).toFixed(2));

      const totals = {
        subtotal: Number(subtotal.toFixed(2)),
        descuentoTotal: Number(descuentoTotal.toFixed(2)),
        ivaAmount,
        granTotal,
        saldoPendiente,
        flete: Number(flete.toFixed(2)),
        seguro: Number(seguros.toFixed(2)),
        anticipo: Number(anticipo.toFixed(2)),
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

      const detalleCatalogo = (parsed.data.items ?? []).map((item) => {
        const llevaBordado = Boolean(item.bordados?.activo);
        // `ubicaciones` se saca del literal para poder derivar `tipos_servicio`
        // DE LO QUE REALMENTE SE ENVÍA (ver `deriveTiposServicio`), no de otra
        // lectura del formulario. El payload resultante es idéntico al de
        // antes en ambas ramas: sin bordado, arreglo vacío y notas en blanco.
        const ubicaciones =
          llevaBordado
            ? item.bordados?.especificaciones?.map((spec) => ({
              codigo: spec.posicionCodigo,
              descripcion_posicion: spec.posicionPersonalizada?.trim() || null,
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
            })) ?? []
            : [];
        const bordadoConfig = {
          ubicaciones,
          notas: llevaBordado ? item.bordados?.observaciones ?? "" : "",
          tipos_servicio: deriveTiposServicio(ubicaciones),
        };
        const llevaReflejante = Boolean(item.reflejantes?.activo);
        const reflejanteConfig =
          llevaReflejante
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

      /**
       * Las muestras se PLIEGAN dentro de `detalle` — no viajan como un arreglo
       * hermano. Para el backend son partidas normales con `producto = null`;
       * `tallas: []` es obligatorio porque el serializer recorre `tallas` sin
       * comprobar su ausencia.
       *
       * Los dos arreglos son mutuamente excluyentes por construcción (uno de los
       * dos siempre está vacío), así que la concatenación sirve para ambos modos
       * sin ramificar.
       */
      const detalleMuestras: QuoteMuestraDetail[] = parsed.data.muestras.map((linea) => ({
        producto: null,
        producto_nombre_externo: flattenMuestraNombre(linea.nombre),
        tallas: [],
      }));
      const detalle = [...detalleCatalogo, ...detalleMuestras];

      const quoteCreatePayload: QuoteCreate = {
        pedido: {
          empresa: selectedCompanyId || 1, // Fallback safe si no hay empresa en workspace
          sucursal: selectedBranchId || 1, // Fallback safe si no hay sucursal
          cliente: selectedCustomerId > 0 ? selectedCustomerId : null,
          moneda: parsed.data.moneda || 1, // Fallback si no viene moneda
          persona_pagos: parsed.data.persona_pagos ?? "",
          correo_facturas: parsed.data.correo_facturas ?? "",
          telefono_pagos: parsed.data.telefono_pagos ?? "",
          forma_pago: parsed.data.forma_pago ?? "",
          metodo_pago: parsed.data.metodo_pago ?? "",
          uso_cfdi: parsed.data.uso_cfdi ?? "",
          // Se deriva del modo, no se lee del formulario: el select está
          // deshabilitado, así que `modo` es la única entrada real y esto deja
          // el payload correcto aunque el estado del campo quedara desfasado.
          tipo_pedido: tipoPedidoForMode(parsed.data.modo),
          estatus:
            parsed.data.estatusPedido === "Pendiente"
              ? 1
              : parsed.data.estatusPedido === "Parcial"
                ? 2
                : parsed.data.estatusPedido === "Completo"
                  ? 3
                  : 4,
          ...mapCondicionPagoFlags(parsed.data.condicionPago ?? "100_anticipo"),
          oc: parsed.data.oc?.trim() || "",
          monto: condicionPagoMonto ? String(condicionPagoMonto) : "0",
          cliente_razon_social: parsed.data.razonSocial || "",
          cliente_nombre: parsed.data.clienteNombre || "",
          cliente_rfc: parsed.data.rfc || "",
          cliente_regimen_fiscal: parsed.data.regimenFiscal ? Number(parsed.data.regimenFiscal) : 1, // o el default que manejen
          cliente_direccion_fiscal: parsed.data.direccionFiscal || "",
          cliente_colonia: parsed.data.coloniaFiscal || "",
          cliente_codigo_postal: parsed.data.codigoPostalFiscal || "",
          cliente_ciudad: parsed.data.ciudadFiscal || "",
          cliente_estado: parsed.data.estadoFiscal || "",
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
          bordado_pantalones_extras: bordadoPantalones ? String(bordadoPantalones.toFixed(2)) : "0.00",
          serigrafia: serigrafia ? String(serigrafia.toFixed(2)) : "0.00",
          reflejante: reflejante ? String(reflejante.toFixed(2)) : "0.00",
          bordado_logotipo: Boolean(parsed.data.bordado_logotipo),
          flete: flete ? String(flete.toFixed(2)) : "0.00",
          seguros: seguros ? String(seguros.toFixed(2)) : "0.00",
          anticipo: anticipo ? String(anticipo.toFixed(2)) : "0.00",
          subtotal: totals.subtotal ? String(totals.subtotal.toFixed(2)) : "0.00",
          descuento_global: totals.descuentoTotal ? String(totals.descuentoTotal.toFixed(2)) : "0.00",
          ieps: "0.00",
          iva: ivaRate || 0,
          gran_total: totals.granTotal ? String(totals.granTotal.toFixed(2)) : "0.00",
          activo: true,
          cotizacion: { id: 1 },
        },
        detalle,
        // En modo muestra no viaja ningún servicio extra: la sección está
        // oculta y su importe ya se anuló arriba, así que enviarlos dejaría en
        // el backend conceptos con monto que la cotización no refleja.
        servicios_extras: isMuestraMode
          ? []
          : parsed.data.servicios_extras.map((service) => ({
            nombre: service.nombre ?? "",
            monto: String((service.monto ?? 0).toFixed(2)),
            cantidad: service.cantidad ?? 0,
          })),
      };
      try {
        await createQuoteMutation(quoteCreatePayload);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 400) {
          return;
        }

        return;
      }

      setIsCreationSuccessVisible(true);
      setIsRouteTransitioning(true);

      form.reset(emptyValues);
      setExtraServices([]);
      setMuestraLines([]);
      router.push("/sales/quotes");
    },
  });

  // Snapshot reactivo de valores del formulario para derivados y sincronizaciones.
  const values = useStore(form.baseStore, (state) => state.values);
  const wasEnviarDomicilioFiscalRef = useRef(values.enviarDomicilioFiscal);

  // Sincroniza automáticamente los datos de envío cuando se usa domicilio fiscal.
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
    if (values.docRelacionado === watchedDocRelacionado) {
      return;
    }
    form.setFieldValue("docRelacionado", watchedDocRelacionado);
  }, [form, values.docRelacionado, watchedDocRelacionado]);

  const normalizePath = (field: string) => field.replace(/\[(\d+)\]/g, ".$1");

  // Limpia el error de un campo puntual después de una corrección del usuario.
  const clearFieldErrors = useCallback((field: string) => {
    const path = field.replace(/\[(\d+)\]/g, ".$1").split(".");
    setErrorTree((prev) => {
      if (!prev || typeof prev !== "object") {
        return prev;
      }
      const next = structuredClone(prev) as ErrorNode;
      let current: unknown = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        if (!current || typeof current !== "object") {
          return next;
        }
        current = (current as Record<string, unknown>)[key];
      }
      if (current && typeof current === "object") {
        delete (current as Record<string, unknown>)[path[path.length - 1]];
      }
      return next;
    });
  }, []);

  const clienteSearchTerm = values.clienteBusqueda ?? "";

  // Controla el input de búsqueda de cliente, manteniendo sincronía con el estado del form.
  const setClienteSearchTerm = (value: string) => {
    form.setFieldValue("clienteBusqueda", value);
    clearFieldErrors("clienteBusqueda");
  };

  // Valida campo individual en blur para feedback inmediato.
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

  // Expone un error por ruta para componentes que renderizan errores con paths dinámicos.
  const getError = (field: string): FormFieldError | undefined => {
    const value = getPathValue(errorTree, normalizePath(field));
    if (value && typeof value === "object" && "message" in value) {
      return value as FormFieldError;
    }
    return undefined;
  };

  // Derivados de totales para render inmediato en resumen financiero.
  const watchedItems = useMemo(() => values.items ?? [], [values.items]);
  const {
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
  } = useMemo(() => {
    // Réplica en pantalla del cálculo del submit: en modo muestra la
    // cotización no tiene importes, así que el resumen financiero es cero
    // completo. Salida temprana para que ambas rutas no puedan divergir.
    if (values.modo === "muestra") {
      return {
        subtotal: 0,
        descuentoTotal: 0,
        ivaAmount: 0,
        granTotal: 0,
        saldoPendiente: 0,
      };
    }

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
    const programaBordadosTotal = values.programaBordadosActivo ? Number(values.programa_bordados) || 0 : 0;
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
    values.modo,
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

  // API estilo field-array para tabla de productos.
  const append = (itemOrItems: QuoteItem | QuoteItem[]) => {
    const incomingItems = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (incomingItems.length === 0) {
      return;
    }
    const normalizedItems = incomingItems.map((item) => normalizeItem(item));
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

  // ─── Partidas de producto de muestra (API estilo `extraServices`) ───────────

  /**
   * `clearFieldErrors("muestras")` borra TODO el subárbol, incluidos los errores
   * por renglón. Estas dos operaciones solo deben tocar lo suyo:
   *
   * - al agregar, únicamente el mensaje de nivel arreglo ("agrega al menos
   *   uno"), que `setErrorByPath` guarda como objeto en `muestras`;
   * - al eliminar, únicamente la entrada de ese índice, reindexando el resto —
   *   los errores se guardan por índice y las líneas posteriores se recorren.
   *
   * Sin esto, borrar un renglón limpiaba los errores visibles de los demás y el
   * formulario parecía válido hasta el siguiente envío.
   */
  const dropMuestrasArrayError = () => {
    setErrorTree((prev) => {
      if (!prev.muestras || Array.isArray(prev.muestras)) {
        return prev;
      }
      const next = structuredClone(prev) as ErrorNode;
      delete next.muestras;
      return next;
    });
  };

  const dropMuestraLineError = (index: number) => {
    setErrorTree((prev) => {
      if (!prev.muestras) {
        return prev;
      }
      const next = structuredClone(prev) as ErrorNode;
      const node = next.muestras;
      if (Array.isArray(node)) {
        node.splice(index, 1);
        if (node.length === 0) {
          delete next.muestras;
        }
      } else {
        delete next.muestras;
      }
      return next;
    });
  };

  const addMuestraLine = () => {
    setMuestraLines((prev) => [...prev, { id: crypto.randomUUID(), nombre: "" }]);
    dropMuestrasArrayError();
  };

  const updateMuestraLine = (id: string, nombre: string) => {
    setMuestraLines((prev) =>
      prev.map((linea) => (linea.id === id ? { ...linea, nombre } : linea))
    );
  };

  const removeMuestraLine = (id: string) => {
    const index = muestraLines.findIndex((linea) => linea.id === id);
    setMuestraLines((prev) => prev.filter((linea) => linea.id !== id));
    if (index >= 0) {
      dropMuestraLineError(index);
    }
  };

  /**
   * Cambia el modo de captura y VACÍA el arreglo del modo que se abandona.
   *
   * Se limpia en vez de conservarse porque la sección del modo inactivo deja de
   * renderizarse: una partida que sobreviviera ahí sería invisible pero seguiría
   * viajando en el payload y, peor, dispararía el error de exclusividad de
   * `quoteSubmitSchema` sobre un campo que el usuario no puede ver ni corregir.
   * El costo es que volver al modo anterior no restaura lo capturado — a cambio,
   * el invariante "solo un arreglo tiene contenido" se cumple siempre.
   *
   * También mueve `tipo_pedido`, que es un campo del formulario visible en un
   * select (deshabilitado): si solo se derivara al enviar, el usuario vería
   * "Pedido de venta" mientras el payload manda "Muestra". Actualizarlo aquí
   * mantiene honesto lo que se muestra.
   */
  const handleModeChange = (nextMode: QuoteCaptureMode) => {
    if (nextMode === values.modo) {
      return;
    }

    if (nextMode === "muestra") {
      form.setFieldValue("items", []);
      setExtraServices([]);
      clearFieldErrors("items");
      clearFieldErrors("servicios_extras");
    } else {
      setMuestraLines([]);
      clearFieldErrors("muestras");
    }

    form.setFieldValue("modo", nextMode);
    form.setFieldValue("tipo_pedido", tipoPedidoForMode(nextMode));
    clearFieldErrors("tipo_pedido");
  };

  // Abre el diálogo de edición de bordado para la partida en `index`.
  const openEmbroideryEdit = useCallback((index: number) => {
    setEmbroideryEditIndex(index);
    setIsEmbroideryEditOpen(true);
  }, []);

  // Persiste los cambios de bordado y cierra el diálogo.
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

  // Controla la apertura/cierre del diálogo de edición de bordado.
  const handleEmbroideryEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsEmbroideryEditOpen(nextOpen);
    if (!nextOpen) {
      setEmbroideryEditIndex(null);
    }
  }, []);

  // Abre el diálogo de edición de reflejante para la partida en `index`.
  const openReflectiveEdit = useCallback((index: number) => {
    setReflectiveEditIndex(index);
    setIsReflectiveEditOpen(true);
  }, []);

  // Persiste los cambios de reflejante y cierra el diálogo.
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

  // Controla la apertura/cierre del diálogo de edición de reflejante.
  const handleReflectiveEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsReflectiveEditOpen(nextOpen);
    if (!nextOpen) {
      setReflectiveEditIndex(null);
    }
  }, []);

  // Abre el diálogo de edición de tallas para la partida en `index`.
  const openSizesEdit = useCallback((index: number) => {
    setSizesEditIndex(index);
    setIsSizesEditOpen(true);
  }, []);

  // Persiste los cambios de tallas y cierra el diálogo.
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

  // Controla la apertura/cierre del diálogo de edición de tallas.
  const handleSizesEditOpenChange = useCallback((nextOpen: boolean) => {
    setIsSizesEditOpen(nextOpen);
    if (!nextOpen) {
      setSizesEditIndex(null);
    }
  }, []);

  // Autocompleta los campos de envío a partir de una dirección guardada del cliente.
  const handleSelectShippingAddress = useCallback((address: CustomerAddress) => {
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
  }, [form]);

  const handleSelectCustomer = useCallback((customer: OnboardingCustomer, fromSearch = true) => {
    // Hidrata facturación, contacto y envío al seleccionar cliente.
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
  }, [clearFieldErrors, form, onboardingData?.catalogos.regimenes_fiscales, setCustomerSelectedFromSearch]);

  // Callback de alta de cliente desde modal.
  const handleCustomerCreated = (customer?: Customer) => {
    setIsCustomerDialogOpen(false);
    if (!customer) {
      return;
    }
    const satRegimen = satInfo?.regimenes_fiscales.find(
      (item) => item.id_sat_regimen_fiscal === customer.sat_regimen_fiscal
    );
    const regimenCodigo = satRegimen?.codigo ?? "";
    const regimenDescripcion = satRegimen?.descripcion ?? "";
    handleSelectCustomer({
      id: Number(customer.id),
      // fromSearch: false — cliente recién creado, sin direcciones guardadas
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
      sat_regimen_fiscal_id: Number(customer.sat_regimen_fiscal),
      sat_regimen_fiscal__codigo: regimenCodigo,
      sat_regimen_fiscal__descripcion: regimenDescripcion,
    }, false);
  };

  // Submit controlado para evitar dobles envíos y estados pendientes colgados.
  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmittingForm) {
      return;
    }
    setIsSubmittingForm(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleReset = () => {
    form.reset(emptyValues);
    setExtraServices([]);
    setMuestraLines([]);
    setSelectedCustomerId(0);
    setCustomerSelectedFromSearch(false);
    setErrorTree({});
    form.setFieldValue("clienteBusqueda", "");
    toast.success("Formulario restablecido");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Navegación de salida del formulario.
  const handleBack = () => {
    router.push("/sales/quotes");
  };

  const isPending =
    isSubmittingForm ||
    form.state.isSubmitting ||
    isCreatingQuote ||
    isCreationSuccessVisible ||
    isRouteTransitioning;
  const itemErrors = getError("items");
  const tipoPedidoError = getError("tipo_pedido");

  // Opciones desde onboarding y SAT.
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
  const currencyOptions = useMemo(
    () => {
      const preferredCodes = ["MXN", "USD", "EUR"];
      const activeCurrencies = (currencies ?? []).filter((item) => item.activo);
      const sortedCurrencies = activeCurrencies.sort((left, right) => {
        const leftIndex = preferredCodes.indexOf(left.codigo_iso);
        const rightIndex = preferredCodes.indexOf(right.codigo_iso);
        const leftPriority = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const rightPriority = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return left.nombre.localeCompare(right.nombre);
      });
      return [
        { value: 0, label: "Seleccionar..." },
        ...sortedCurrencies.map((item) => ({
          value: item.id,
          label: `${item.codigo_iso} - ${item.nombre}`,
        })),
      ];
    },
    [currencies]
  );

  useEffect(() => {
    if (!values.moneda && currencyOptions.length > 1) {
      form.setFieldValue("moneda", Number(currencyOptions[1].value));
    }
  }, [currencyOptions, form, values.moneda]);

  useEffect(() => {
    if (usoCfdiOptions.length === 0) {
      return;
    }
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

  const formKey = "quote-new";

  return {
    form,
    formRef,
    formKey,
    getError,
    clearFieldErrors,
    validateField,
    isPending,
    sellerName,
    userName,
    todayStr,
    tiposPedidoOptions,
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
    isOnboardingLoading,
    showForm,
    isCreationSuccessVisible,
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
    modo: values.modo,
    // El alta permite elegir modo; la edición no (ver `useQuoteEditForm`).
    canSelectMode: true,
    handleModeChange,
    muestraLines,
    addMuestraLine,
    updateMuestraLine,
    removeMuestraLine,
    muestrasError: getError("muestras"),
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

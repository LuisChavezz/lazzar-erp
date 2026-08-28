"use client";

import { useForm, useStore } from "@tanstack/react-form";
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
  requestFormSchema,
  requestSubmitSchema,
  type RequestFormValues,
} from "../schemas/request.schema";
import type {
  RequestExtraService,
  RequestItem,
  RequestPaymentCondition,
} from "../interfaces/request.interface";
import { TIPO_PEDIDO, getTipoPedidoConfig } from "../../orders/constants/pedidoStatus";
// ── Queries reutilizadas de `quotes` (NO clonadas) ──────────────────────────
// Son temporales: alimentan el formulario mientras solicitudes no tenga sus
// propios endpoints. Cuando existan, se cambian aquí y la capa de tipos
// (schemas/interfaces de este módulo) no se toca.
import type { QuoteOnboardingData } from "../../quotes/interfaces/quote.interface";
import { useQuoteOnboardingData } from "../../quotes/hooks/useQuoteOnboardingData";
import { useSatInfo } from "../../sat/hooks/useSatInfo";

type RequestField = keyof RequestFormValues;
type OnboardingCustomer = QuoteOnboardingData["busqueda"]["clientes"][number];
type ErrorNode = {
  [key: string]: ErrorNode | FormFieldError | ErrorNode[] | undefined;
};

export type ExtraService = RequestExtraService;

const PAYMENT_CONDITION_OPTIONS: { value: RequestPaymentCondition; label: string }[] = [
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

/**
 * Mensaje del submit inerte. No hay endpoint ni tabla de solicitudes todavía:
 * el formulario valida igual que el de cotizaciones y se detiene ahí.
 */
const SUBMIT_UNAVAILABLE_MESSAGE =
  "El registro de solicitudes no está disponible aún.";

/**
 * Respaldo del catálogo de tipos de pedido.
 *
 * `useQuoteOnboardingData` no tiene rama de error: si la petición falla,
 * `isLoading` baja a false con `data` undefined y el formulario se renderiza
 * igual. Sin este respaldo el select de "Tipo de Pedido" quedaría sin ninguna
 * `<option>` mientras el estado vale MUESTRA (cotizaciones no lo sufre porque
 * antepone su placeholder "Seleccionar...", que aquí se quitó a propósito).
 *
 * `TIPO_PEDIDO_CONFIG` se mantiene completo contra el enum del backend, así que
 * es la fuente correcta para el respaldo.
 */
const TIPOS_PEDIDO_FALLBACK: { value: number; label: string }[] = Object.values(
  TIPO_PEDIDO
).map((value) => ({ value, label: getTipoPedidoConfig(value).label }));

const normalizeItem = (item: RequestItem): RequestItem => {
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
export const createEmptyValues = (todayStr: string, userName: string): RequestFormValues => ({
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
  // DIFERENCIA respecto a cotizaciones, que arranca en PEDIDO_DE_VENTA con el
  // select bloqueado en el JSX. Aquí el valor inicial es MUESTRA y el select
  // está habilitado (ver `RequestFormContent`): el usuario puede elegir
  // cualquier tipo del catálogo `catalogos.tipos_pedido`.
  tipo_pedido: TIPO_PEDIDO.MUESTRA,
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

// Busca el primer campo inválido en orden visual y mueve el viewport al lugar correcto.
const scrollToFirstValidationError = (formElement: HTMLFormElement, issuePaths: string[]) => {
  if (issuePaths.length === 0) {
    return;
  }

  const normalizedIssuePaths = issuePaths.filter(Boolean);
  const controls = Array.from(formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))
    .filter((element) => Boolean(element.name) && !element.disabled && !(element instanceof HTMLInputElement && element.type === "hidden"));

  const firstInvalidControl = controls.find((control) =>
    normalizedIssuePaths.some((path) => path === control.name || path.startsWith(`${control.name}.`) || control.name.startsWith(`${path}.`))
  );

  if (firstInvalidControl) {
    firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidControl.focus({ preventScroll: true });
    return;
  }

  const hasItemsError = normalizedIssuePaths.some((path) => path === "items" || path.startsWith("items."));
  const hasCustomerError = normalizedIssuePaths.some((path) => path === "clienteBusqueda" || path.startsWith("clienteBusqueda."));
  const hasExtraServicesError = normalizedIssuePaths.some((path) => path === "servicios_extras" || path.startsWith("servicios_extras."));

  if (hasCustomerError) {
    const customerAnchor = formElement.querySelector<HTMLElement>('[data-error-anchor="clienteBusqueda"]');
    customerAnchor?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (hasExtraServicesError) {
    const extraServicesAnchor = formElement.querySelector<HTMLElement>('[data-error-anchor="servicios_extras"]');
    extraServicesAnchor?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (hasItemsError) {
    const itemsAnchor = formElement.querySelector<HTMLElement>('[data-error-anchor="items"]');
    itemsAnchor?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

/**
 * Hook del formulario de alta de solicitud.
 *
 * Réplica de `useQuoteForm` con una diferencia deliberada: el `onSubmit` valida
 * con `requestSubmitSchema` y, si pasa, muestra un toast de "no disponible aún".
 * NO arma payload ni llama a ninguna mutación — no existe endpoint de
 * solicitudes. Por eso este módulo no tiene `services/`.
 */
export function useRequestForm() {
  // Dependencias de navegación y fuentes de datos del formulario.
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { data: onboardingData, isLoading: isOnboardingLoading } = useQuoteOnboardingData();
  const { data: satInfo } = useSatInfo();

  const userName = session?.user?.name || "Usuario";
  const sellerName = userName;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement | null>(null);
  const customers = useMemo(() => onboardingData?.busqueda.clientes ?? [], [onboardingData?.busqueda.clientes]);
  const isCustomersLoading = isOnboardingLoading;
  const [errorTree, setErrorTree] = useState<ErrorNode>({});
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);
  // Indica si el cliente fue seleccionado mediante el buscador (no mediante creación).
  const [customerSelectedFromSearch, setCustomerSelectedFromSearch] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
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
  // Nunca se crea nada, así que la transición de salida que sí tiene
  // cotizaciones queda permanentemente apagada. (La pantalla de éxito ni
  // siquiera existe aquí: se eliminó junto con su rama en `RequestFormContent`.)
  const isRouteTransitioning: boolean = false;

  const emptyValues = useMemo(() => createEmptyValues(todayStr, userName), [todayStr, userName]);

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      const parsed = requestSubmitSchema.safeParse({
        ...value,
        servicios_extras: extraServices,
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
      // Aquí termina el flujo: sin endpoint no hay nada que enviar. El
      // formulario conserva los valores capturados para que el usuario no
      // pierda el trabajo cuando el alta se habilite.
      toast(SUBMIT_UNAVAILABLE_MESSAGE, { icon: "🚧" });
    },
  });

  // Snapshot reactivo de valores del formulario para derivados y sincronizaciones.
  const values = useStore(form.baseStore, (state) => state.values);

  // Sincroniza automáticamente los datos de envío cuando se usa domicilio fiscal.
  useEffect(() => {
    if (!values.enviarDomicilioFiscal) {
      return;
    }
    form.setFieldValue("destinatario", values.clienteNombre || "");
    form.setFieldValue("empresaEnvio", values.razonSocial || "");
    form.setFieldValue("telefonoEnvio", values.telefono_pagos || "");
    form.setFieldValue("celularEnvio", values.telefono_pagos || "");
    form.setFieldValue("direccionEnvio", values.direccionFiscal || "");
    form.setFieldValue("coloniaEnvio", values.coloniaFiscal || "");
    form.setFieldValue("codigoPostalEnvio", values.codigoPostalFiscal || "");
    form.setFieldValue("ciudadEnvio", values.ciudadFiscal || "");
    form.setFieldValue("estadoEnvio", values.estadoFiscal || "");
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
    () => `solicitud-oc${(values.oc ?? "").trim()}`,
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
  const validateField = (field: RequestField, value: RequestFormValues[RequestField]) => {
    const fieldSchema = requestFormSchema.shape[field];
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
    const nextSubtotal = watchedItems.reduce(
      (sum: number, item: RequestItem) => sum + (Number(item.importe) || 0),
      0
    );
    const nextDescuentoTotal = watchedItems.reduce((sum: number, item: RequestItem) => {
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
      watchedItems.map((item: RequestItem, index: number) => ({
        id: `${item.productoId || "item"}-${index}`,
      })),
    [watchedItems]
  );

  // API estilo field-array para tabla de productos.
  const append = (itemOrItems: RequestItem | RequestItem[]) => {
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
      watchedItems.filter((_: RequestItem, itemIndex: number) => itemIndex !== index)
    );
  };

  const update = (index: number, item: RequestItem) => {
    const normalized = normalizeItem(item);
    form.setFieldValue(
      "items",
      watchedItems.map((current: RequestItem, itemIndex: number) =>
        itemIndex === index ? normalized : current
      )
    );
    clearFieldErrors(`items.${index}`);
  };

  // Abre el diálogo de edición de bordado para la partida en `index`.
  const openEmbroideryEdit = useCallback((index: number) => {
    setEmbroideryEditIndex(index);
    setIsEmbroideryEditOpen(true);
  }, []);

  // Persiste los cambios de bordado y cierra el diálogo.
  const handleEmbroideryEditSave = useCallback(
    (updatedItem: RequestItem) => {
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
    (updatedItem: RequestItem) => {
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
    (updatedItem: RequestItem) => {
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
    router.push("/sales/crm-requests");
  };

  const isPending = isSubmittingForm || form.state.isSubmitting;
  const itemErrors = getError("items");
  const tipoPedidoError = getError("tipo_pedido");

  // Opciones desde onboarding y SAT.
  // Sin opción "Seleccionar...": el select arranca en MUESTRA y solo ofrece los
  // tipos reales del catálogo, de modo que `tipo_pedido` no puede quedar en 0.
  // Cotizaciones sí antepone el placeholder; esa rama no se toca.
  // Si el onboarding falla o no trae el catálogo, cae al respaldo local para no
  // renderizar un `<select>` sin opciones.
  const tiposPedidoOptions = useMemo<{ value: number; label: string }[]>(() => {
    const catalogo = onboardingData?.catalogos.tipos_pedido ?? [];
    return catalogo.length > 0 ? catalogo : TIPOS_PEDIDO_FALLBACK;
  }, [onboardingData?.catalogos.tipos_pedido]);
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
  // Monedas activas ordenadas por preferencia. Se memoiza aparte de
  // `currencyOptions` para que la moneda por defecto salga de la LISTA, no de
  // un índice dentro del arreglo de opciones: si algún día se quita el
  // placeholder "Seleccionar..." —como ya se hizo en el select de tipo de
  // pedido—, los índices se recorren y el default cambiaría en silencio.
  const sortedCurrencies = useMemo(() => {
    const preferredCodes = ["MXN", "USD", "EUR"];
    const activeCurrencies = (currencies ?? []).filter((item) => item.activo);
    return [...activeCurrencies].sort((left, right) => {
      const leftIndex = preferredCodes.indexOf(left.codigo_iso);
      const rightIndex = preferredCodes.indexOf(right.codigo_iso);
      const leftPriority = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const rightPriority = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.nombre.localeCompare(right.nombre);
    });
  }, [currencies]);

  const currencyOptions = useMemo(
    () => [
      { value: 0, label: "Seleccionar..." },
      ...sortedCurrencies.map((item) => ({
        value: item.id,
        label: `${item.codigo_iso} - ${item.nombre}`,
      })),
    ],
    [sortedCurrencies]
  );

  useEffect(() => {
    const defaultCurrency = sortedCurrencies[0];
    if (!values.moneda && defaultCurrency) {
      form.setFieldValue("moneda", Number(defaultCurrency.id));
    }
  }, [sortedCurrencies, form, values.moneda]);

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

  const formKey = "request-new";

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

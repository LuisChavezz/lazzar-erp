"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import toast from "react-hot-toast";
import { Customer } from "../../customers/interfaces/customer.interface";
import { useCustomers } from "../../customers/hooks/useCustomers";
import { useSatInfo } from "../../sat/hooks/useSatInfo";
import { useCurrencies } from "../../currency/hooks/useCurrencies";
import { useProducts } from "../../products/hooks/useProducts";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import type { FormFieldError } from "../../../utils/getFieldError";
import { orderFormSchema, type OrderFormValues } from "../schema/order.schema";
import { Order, OrderCreate, OrderItem, type OrderPaymentCondition } from "../interfaces/order.interface";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCreateOrder } from "./useCreateOrder";
import { useOrders } from "./useOrders";
import { useUpdateOrder } from "./useUpdateOrder";
import { useCreateOrderProductDetail } from "./useCreateOrderProductDetail";
import { useOrderProductDetails } from "./useOrderProductDetails";

interface UseOrderFormParams {
  orderId?: string;
}

type OrderField = keyof OrderFormValues;
type ErrorNode = {
  [key: string]: ErrorNode | FormFieldError | ErrorNode[] | undefined;
};

// Catálogos estáticos usados para renderizar selects y normalizar valores de entrada.
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

const DOCUMENT_TYPE_VALUES = ["Pedido de Venta", "Muestra"] as const;

const DOCUMENT_TYPE_OPTIONS = [
  { value: "Pedido de Venta", label: "Pedido de Venta" },
  { value: "Muestra", label: "Muestra" },
];

const PAYMENT_CONDITION_OPTIONS: { value: OrderPaymentCondition; label: string }[] = [
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

const PAYMENT_FORM_VALUES = ["01", "03", "04"] as const;
const PAYMENT_METHOD_VALUES = ["PUE", "PPD", "NA"] as const;

// Guards de dominio para asegurar que los valores persistidos siempre coincidan con el esquema actual.
const getValidPaymentForm = (value: string): (typeof PAYMENT_FORM_VALUES)[number] =>
  PAYMENT_FORM_VALUES.find((item) => item === value) ?? "03";

const getValidPaymentMethod = (value: string): (typeof PAYMENT_METHOD_VALUES)[number] =>
  PAYMENT_METHOD_VALUES.find((item) => item === value) ?? "PUE";

const getValidDocumentType = (value: string): (typeof DOCUMENT_TYPE_VALUES)[number] => {
  if (value === "Pedido") {
    return "Pedido de Venta";
  }
  return DOCUMENT_TYPE_VALUES.find((item) => item === value) ?? "Pedido de Venta";
};

const getUsoCfdiCode = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  return normalized.split(" - ")[0].trim();
};

const getOrderUsoCfdiCode = (order?: Order | null) =>
  getUsoCfdiCode(order?.uso_cfdi ?? order?.usoCfdi ?? "");

const toNumber = (value: unknown) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const mapOrigenFlags = (origen: string) => {
  const selectedField = ORIGIN_FIELD_MAP.find((item) => item.label === origen)?.field;
  return ORIGIN_FIELD_MAP.reduce(
    (accumulator, item) => ({
      ...accumulator,
      [item.field]: item.field === selectedField,
    }),
    {} as Record<OriginFlagKey, boolean>
  );
};

const getOrderOrigin = (order: Order) => {
  const selectedOrigin = ORIGIN_FIELD_MAP.find((item) => Boolean(order[item.field]));
  if (selectedOrigin) {
    return selectedOrigin.label;
  }
  return ORIGIN_OPTIONS.includes(order.origen ?? "") ? (order.origen ?? "") : "";
};

const toInputDate = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedValue)) {
    const [day, month, year] = normalizedValue.split("/");
    return `${year}-${month}-${day}`;
  }
  const normalizedIsoValue = normalizedValue.includes(" ")
    ? normalizedValue.replace(" ", "T")
    : normalizedValue;
  const normalizedTimezoneValue = /[+-]\d{2}$/.test(normalizedIsoValue)
    ? `${normalizedIsoValue}:00`
    : normalizedIsoValue;
  const parsedDate = new Date(normalizedTimezoneValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Normaliza renglones de productos para mantener consistencia numérica antes de calcular totales.
const normalizeItem = (item: OrderItem): OrderItem => {
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

// Convierte una orden persistida al shape exacto del formulario.
const normalizeOrderValues = (order: Order, fallbackUserName: string): OrderFormValues => {
  const envioAmount = toNumber(order.servicioEnvioMonto ?? order.envio);
  const programaBordadosAmount = toNumber(order.programaBordadosMonto ?? order.programa_bordados);
  const bordadoPantalonesAmount = toNumber(
    order.bordadoPantalonesExtrasMonto ?? order.bordado_pantalones_extras
  );

  return {
  clienteBusqueda: order.clienteBusqueda ?? order.clienteNombre ?? "",
  clienteNombre: order.clienteNombre ?? "",
  razonSocial: order.razonSocial ?? "",
  rfc: order.rfc ?? "",
  regimenFiscal: order.regimenFiscal ?? "",
  direccionFiscal: order.direccionFiscal ?? "",
  coloniaFiscal: order.coloniaFiscal ?? "",
  codigoPostalFiscal: order.codigoPostalFiscal ?? "",
  ciudadFiscal: order.ciudadFiscal ?? "",
  estadoFiscal: order.estadoFiscal ?? "",
  giroEmpresa: order.giroEmpresa ?? "",
  persona_pagos: order.persona_pagos ?? order.personaPagos ?? "",
  correo_facturas: order.correo_facturas ?? order.correoFacturas ?? "",
  telefono_pagos: order.telefono_pagos ?? order.telefonoPagos ?? "",
  oc: order.oc ?? order.ordenCompra ?? "",
  forma_pago: getValidPaymentForm(order.forma_pago ?? order.formaPago ?? ""),
  metodo_pago: getValidPaymentMethod(order.metodo_pago ?? order.metodoPago ?? ""),
  tipoDocumento: getValidDocumentType(order.tipoDocumento ?? ""),
  uso_cfdi: getUsoCfdiCode(order.uso_cfdi ?? order.usoCfdi ?? ""),
  referenciarOcFactura: Boolean(order.referenciarOcFactura),
  condicionPago: order.condicionPago ?? "100_anticipo",
  condicionPagoMonto: Number(order.condicionPagoMonto) || 0,
  fecha: toInputDate(order.fecha) || toInputDate(order.created_at),
  agente: order.agente ?? fallbackUserName,
  origen: getOrderOrigin(order),
  destinatario: order.destinatario ?? "",
  empresaEnvio: order.empresaEnvio ?? "",
  telefonoEnvio: order.telefonoEnvio ?? "",
  celularEnvio: order.celularEnvio ?? "",
  direccionEnvio: order.direccionEnvio ?? "",
  coloniaEnvio: order.coloniaEnvio ?? "",
  codigoPostalEnvio: order.codigoPostalEnvio ?? "",
  ciudadEnvio: order.ciudadEnvio ?? "",
  estadoEnvio: order.estadoEnvio ?? "",
  referenciasEnvio: order.referenciasEnvio ?? "",
  enviarDomicilioFiscal: Boolean(order.enviarDomicilioFiscal),
  embarcarConOtrosPedidos: Boolean(order.embarcarConOtrosPedidos),
  empaque_ecologico: Boolean(order.empaque_ecologico ?? order.empaqueEcologico),
  embarque_parcial: Boolean(order.embarque_parcial ?? order.embarqueParcial),
  comentarios_parcialidad: order.comentarios_parcialidad ?? order.comentariosParcialidad ?? "",
  servicioEnvioActivo: Boolean(order.servicioEnvioActivo) || envioAmount > 0,
  envio: envioAmount,
  programaBordadosActivo: Boolean(order.programaBordadosActivo) || programaBordadosAmount > 0,
  programa_bordados: programaBordadosAmount,
  bordadoPantalonesExtrasActivo:
    Boolean(order.bordadoPantalonesExtrasActivo) || bordadoPantalonesAmount > 0,
  bordado_pantalones_extras: bordadoPantalonesAmount,
  bordado_logotipo: Boolean(
    order.bordado_logotipo ?? order.bordadoLogotipoIncluido ?? true
  ),
  estatusPedido: order.estatusPedido ?? "Pendiente",
  docRelacionado: order.docRelacionado ?? "",
  observaciones: order.observaciones ?? "",
  flete: Number(order.flete ?? order.totals?.flete ?? 0),
  seguros: Number(order.seguros ?? order.totals?.seguro ?? 0),
  anticipo: Number(order.anticipo ?? order.totals?.anticipo ?? 0),
  iva: Number(order.iva ?? order.totals?.ivaRate ?? 0) <= 1
    ? Number((Number(order.iva ?? order.totals?.ivaRate ?? 0) * 100).toFixed(2))
    : Number(order.iva ?? order.totals?.ivaRate ?? 16),
  moneda: Number(order.moneda ?? 0),
  items: (order.items ?? []).map(normalizeItem),
  };
};

// Estado inicial para flujo de creación.
const createEmptyValues = (todayStr: string, userName: string): OrderFormValues => ({
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
  giroEmpresa: "",
  persona_pagos: "",
  correo_facturas: "",
  telefono_pagos: "",
  oc: "",
  forma_pago: "03",
  metodo_pago: "PUE",
  uso_cfdi: "",
  referenciarOcFactura: false,
  condicionPago: "100_anticipo",
  condicionPagoMonto: 0,
  fecha: todayStr,
  agente: userName,
  tipoDocumento: "Pedido de Venta",
  origen: "",
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
  empaque_ecologico: false,
  embarque_parcial: false,
  comentarios_parcialidad: "",
  servicioEnvioActivo: false,
  envio: 0,
  programaBordadosActivo: false,
  programa_bordados: 0,
  bordadoPantalonesExtrasActivo: false,
  bordado_pantalones_extras: 0,
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
        (current[safeIndex] as ErrorNode)[segment] = { message };
        return;
      }
      const nextSegment = String(path[index + 1]);
      const nextIsIndex = Number.isFinite(Number(nextSegment));
      const nextValue = (current[safeIndex] as ErrorNode)[segment];
      if (!nextValue || typeof nextValue !== "object") {
        (current[safeIndex] as ErrorNode)[segment] = nextIsIndex ? [] : {};
      }
      current = (current[safeIndex] as ErrorNode)[segment] as ErrorNode | ErrorNode[];
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

  if (hasCustomerError) {
    const customerAnchor = formElement.querySelector<HTMLElement>('[data-error-anchor="clienteBusqueda"]');
    customerAnchor?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (hasItemsError) {
    const itemsAnchor = formElement.querySelector<HTMLElement>('[data-error-anchor="items"]');
    itemsAnchor?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

export function useOrderForm({ orderId }: UseOrderFormParams) {
  // Dependencias de navegación y fuentes de datos del formulario.
  const router = useRouter();
  const { data: session } = useSession();
  const { customers, isLoading: isCustomersLoading } = useCustomers();
  const { data: satInfo, isLoading: isSatInfoLoading } = useSatInfo();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const selectedBranchId = useWorkspaceStore((state) => state.selectedBranch?.id ?? 0);
  const { mutateAsync: createOrderMutation, isPending: isCreatingOrder } = useCreateOrder();
  const { mutateAsync: updateOrderMutation, isPending: isUpdatingOrder } = useUpdateOrder();
  const { mutateAsync: createOrderProductDetailMutation, isPending: isCreatingDetails } = useCreateOrderProductDetail();

  const orderIdNumber = orderId ? parseInt(orderId, 10) : undefined;
  const isEditMode = Boolean(orderIdNumber && !isNaN(orderIdNumber));
  const { orderProductDetails, isOrderProductDetailsLoading } = useOrderProductDetails(orderIdNumber, isEditMode);

  const { products } = useProducts();
  const { units } = useUnitsOfMeasure();

  const userName = session?.user?.name || "Usuario";
  const sellerName = userName;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errorTree, setErrorTree] = useState<ErrorNode>({});
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);
  const [hasPopulatedItems, setHasPopulatedItems] = useState(false);

  // Contexto de modo edición/creación y valores base.
  const orderToEdit = useMemo(
    () => orders.find((order) => String(order.id) === orderId) ?? null,
    [orderId, orders]
  );
  const isEditing = Boolean(orderToEdit?.id);
  const editingCustomerId = Number(orderToEdit?.cliente ?? 0);
  const showForm = !orderId || (!isOrdersLoading && Boolean(orderToEdit));

  const emptyValues = useMemo(() => createEmptyValues(todayStr, userName), [todayStr, userName]);
  const editValues = useMemo(
    () => (orderToEdit ? normalizeOrderValues(orderToEdit, userName) : emptyValues),
    [emptyValues, orderToEdit, userName]
  );
  const normalizedEditValues = useMemo(
    () =>
      ORIGIN_OPTIONS.includes(editValues.origen)
        ? editValues
        : {
            ...editValues,
            origen: "",
          },
    [editValues]
  );

  // Configuración de TanStack Form: valores por defecto y pipeline de submit.
  const form = useForm({
    defaultValues: isEditing ? normalizedEditValues : emptyValues,
    // Flujo principal de submit: validar, construir payload y persistir creación/edición.
    onSubmit: async ({ value }) => {
      const parsed = orderFormSchema.safeParse(value);
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
      const normalizedItems = parsed.data.items.map(normalizeItem);
      const subtotal = normalizedItems.reduce((sum, item) => sum + item.importe, 0);
      const descuentoTotal = normalizedItems.reduce((sum, item) => {
        const rawAmount = (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
        return sum + (rawAmount - item.importe);
      }, 0);

      const servicioEnvio = parsed.data.servicioEnvioActivo ? parsed.data.envio : 0;
      const programaBordados = parsed.data.programaBordadosActivo
        ? parsed.data.programa_bordados
        : 0;
      const bordadoPantalones = parsed.data.bordadoPantalonesExtrasActivo
        ? parsed.data.bordado_pantalones_extras
        : 0;
      const extras = parsed.data.flete + parsed.data.seguros + servicioEnvio + programaBordados + bordadoPantalones;
      const ivaRateDecimal = parsed.data.iva / 100;
      const ivaAmount = Number(((subtotal + extras) * ivaRateDecimal).toFixed(2));
      const granTotal = Number((subtotal + extras + ivaAmount).toFixed(2));
      const saldoPendiente = Number((granTotal - parsed.data.anticipo).toFixed(2));

      const totals = {
        subtotal: Number(subtotal.toFixed(2)),
        descuentoTotal: Number(descuentoTotal.toFixed(2)),
        ivaAmount,
        granTotal,
        saldoPendiente,
        flete: Number(parsed.data.flete.toFixed(2)),
        seguro: Number(parsed.data.seguros.toFixed(2)),
        anticipo: Number(parsed.data.anticipo.toFixed(2)),
        ivaRate: ivaRateDecimal,
      };

      const mapCondicionPagoFlags = (condicion: OrderPaymentCondition) => ({
        anticipo_total: condicion === "100_anticipo",
        anticipo_parcial: condicion === "50_anticipo",
        vendedor_autoriza: condicion === "vendedor_autoriza",
        pago_antes_embarque: condicion === "pago_antes_embarque",
        por_confirmar: condicion === "por_confirmar",
        otra_cantidad: condicion === "otra_cantidad",
      });

      const orderCreatePayload: OrderCreate = {
        tipo_pedido: parsed.data.tipoDocumento === "Pedido de Venta" ? 1 : 2,
        estatus: parsed.data.estatusPedido === "Pendiente" ? 1 : parsed.data.estatusPedido === "Parcial" ? 2 : parsed.data.estatusPedido === "Completo" ? 3 : 4,
        ...mapOrigenFlags(parsed.data.origen),
        ...mapCondicionPagoFlags(parsed.data.condicionPago),
        persona_pagos: parsed.data.persona_pagos,
        correo_facturas: parsed.data.correo_facturas,
        telefono_pagos: parsed.data.telefono_pagos,
        oc: parsed.data.oc,
        forma_pago: parsed.data.forma_pago,
        metodo_pago: parsed.data.metodo_pago,
        uso_cfdi: parsed.data.uso_cfdi,
        monto: String(parsed.data.condicionPagoMonto ?? 0),
        empaque_ecologico: parsed.data.empaque_ecologico,
        embarque_parcial: parsed.data.embarque_parcial,
        comentarios_parcialidad: parsed.data.embarque_parcial
          ? parsed.data.comentarios_parcialidad || ""
          : "",
        envio: String(servicioEnvio.toFixed(2)),
        programa_bordados: String(programaBordados.toFixed(2)),
        bordado_pantalones_extras: String(bordadoPantalones.toFixed(2)),
        bordado_logotipo: parsed.data.bordado_logotipo,
        observaciones: parsed.data.observaciones || "",
        flete: String(parsed.data.flete.toFixed(2)),
        seguros: String(parsed.data.seguros.toFixed(2)),
        anticipo: String(parsed.data.anticipo.toFixed(2)),
        subtotal: String(totals.subtotal.toFixed(2)),
        descuento_global: String(totals.descuentoTotal.toFixed(2)),
        ieps: "0.00",
        iva: parsed.data.iva,
        gran_total: String(totals.granTotal.toFixed(2)),
        activo: true,
        sucursal: selectedBranchId,
        cliente: selectedCustomerId || editingCustomerId,
        moneda: parsed.data.moneda,
      };

      let orderId: number;

      if (isEditing && orderToEdit) {
        const updatePayload: Order = {
          ...orderToEdit,
          ...orderCreatePayload,
          id: orderToEdit.id,
          empresa: orderToEdit.empresa,
          cotizacion: orderToEdit.cotizacion,
          created_at: orderToEdit.created_at,
          updated_at: orderToEdit.updated_at,
          fecha_confirmacion: orderToEdit.fecha_confirmacion,
        };
        const updatedOrder = await updateOrderMutation(updatePayload);
        orderId = updatedOrder.id;
      } else {
        const createdOrder = await createOrderMutation(orderCreatePayload);
        orderId = createdOrder.id;
      }

      if (orderId && parsed.data.items.length > 0) {
        const detailPromises = parsed.data.items.map((item) => {
          return createOrderProductDetailMutation({
            pedido: orderId,
            producto: item.productoId,
            precio_unitario: String(item.precio.toFixed(2)),
            costo_unitario: "0.00",
            subtotal_linea: String(item.importe.toFixed(2)),
          });
        });
        await Promise.allSettled(detailPromises);
      }

      form.reset(emptyValues);
      router.push("/sales/orders");
    },
  });

  // Rehidrata el formulario cuando llega la orden en modo edición.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(normalizedEditValues);
  }, [form, isEditing, normalizedEditValues]);

  // Effect to populate items from orderProductDetails when in edit mode
  useEffect(() => {
    if (isEditing && orderProductDetails.length > 0 && products.length > 0 && units.length > 0 && !hasPopulatedItems) {
      const unitsById = new Map(units.map((u) => [u.id, u]));
      
      const itemsFromDetails: OrderItem[] = orderProductDetails.map((detail) => {
        const product = products.find((p) => p.id === detail.producto);
        const unit = product ? unitsById.get(product.unidad_medida) : null;
        
        const precio = Number(detail.precio_unitario) || 0;
        const cantidad = 0; // Por defecto a 0 como se solicitó
        const importe = 0; // Importe es 0 porque cantidad es 0
        return {
          productoId: detail.producto,
          descripcion: product?.nombre || "Producto no encontrado",
          unidad: unit?.clave || "PZA",
          cantidad,
          precio,
          descuento: 0,
          importe,
        };
      });
      form.setFieldValue("items", itemsFromDetails);
      setHasPopulatedItems(true);
    }
  }, [isEditing, orderProductDetails, products, units, form, hasPopulatedItems]);

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
  const validateField = (field: OrderField, value: OrderFormValues[OrderField]) => {
    const fieldSchema = orderFormSchema.shape[field];
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
  const watchedItems = values.items ?? [];
  const subtotal = watchedItems.reduce((sum: number, item: OrderItem) => sum + (Number(item.importe) || 0), 0);
  const descuentoTotal = watchedItems.reduce((sum: number, item: OrderItem) => {
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
  const extras = (Number(values.flete) || 0) + (Number(values.seguros) || 0) + servicioEnvioTotal + programaBordadosTotal + bordadoPantalonesTotal;
  const ivaRate = Number(values.iva) || 0;
  const ivaAmount = Number(((subtotal + extras) * (ivaRate / 100)).toFixed(2));
  const granTotal = Number((subtotal + extras + ivaAmount).toFixed(2));
  const saldoPendiente = Number((granTotal - (Number(values.anticipo) || 0)).toFixed(2));

  const fields = watchedItems.map((item: OrderItem, index: number) => ({
    id: `${item.productoId || "item"}-${index}`,
  }));

  // API estilo field-array para tabla de productos.
  const append = (item: OrderItem) => {
    const normalized = normalizeItem(item);
    form.setFieldValue("items", [...watchedItems, normalized]);
    clearFieldErrors("items");
  };

  const remove = (index: number) => {
    form.setFieldValue(
      "items",
      watchedItems.filter((_: OrderItem, itemIndex: number) => itemIndex !== index)
    );
  };

  const update = (index: number, item: OrderItem) => {
    const normalized = normalizeItem(item);
    form.setFieldValue(
      "items",
      watchedItems.map((current: OrderItem, itemIndex: number) =>
        itemIndex === index ? normalized : current
      )
    );
    clearFieldErrors(`items.${index}`);
  };

  // Hidrata todos los campos dependientes al seleccionar cliente.
  const handleSelectCustomer = useCallback((customer: Customer, usoCfdiOverride?: string) => {
    // Hidrata facturación, contacto y envío al seleccionar cliente.
    const selectedRegimen = satInfo?.regimenes_fiscales.find(
      (item) => item.id_sat_regimen_fiscal === customer.sat_regimen_fiscal
    );
    const selectedUsoCfdi = satInfo?.usos_cfdi.find(
      (item) => item.id_sat_uso_cfdi === customer.sat_uso_cfdi
    );
    const regimenLabel = selectedRegimen
      ? `${selectedRegimen.codigo} - ${selectedRegimen.descripcion}`
      : "";
    const usoCfdiCode = selectedUsoCfdi?.codigo ?? "";
    const normalizedUsoCfdiOverride = usoCfdiOverride?.trim();
    const resolvedUsoCfdi = normalizedUsoCfdiOverride || usoCfdiCode;

    form.setFieldValue("clienteBusqueda", customer.razon_social ?? customer.nombre ?? "");
    form.setFieldValue("clienteNombre", customer.nombre ?? "");
    form.setFieldValue("razonSocial", customer.razon_social ?? "");
    form.setFieldValue("rfc", customer.rfc ?? "");
    form.setFieldValue("regimenFiscal", regimenLabel);
    form.setFieldValue("direccionFiscal", customer.direccion_fiscal ?? "");
    form.setFieldValue("coloniaFiscal", customer.colonia ?? "");
    form.setFieldValue("codigoPostalFiscal", customer.codigo_postal ?? "");
    form.setFieldValue("ciudadFiscal", customer.ciudad ?? "");
    form.setFieldValue("estadoFiscal", customer.estado ?? "");
    form.setFieldValue("giroEmpresa", customer.giro_empresarial ?? "");
    setSelectedCustomerId(Number(customer.id) || 0);
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
    if (resolvedUsoCfdi) {
      form.setFieldValue("uso_cfdi", resolvedUsoCfdi);
    }
    clearFieldErrors("clienteBusqueda");
  }, [clearFieldErrors, form, satInfo?.regimenes_fiscales, satInfo?.usos_cfdi]);

  const autoSelectedOrderIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isEditing || !orderToEdit || editingCustomerId <= 0 || customers.length === 0) {
      autoSelectedOrderIdRef.current = null;
      return;
    }
    if (autoSelectedOrderIdRef.current === orderToEdit.id) {
      return;
    }
    const matchedCustomer = customers.find((customer) => Number(customer.id) === editingCustomerId);
    if (!matchedCustomer) {
      return;
    }
    handleSelectCustomer(matchedCustomer, getOrderUsoCfdiCode(orderToEdit));
    autoSelectedOrderIdRef.current = orderToEdit.id;
  }, [customers, editingCustomerId, handleSelectCustomer, isEditing, orderToEdit]);

  // Callback de alta de cliente desde modal.
  const handleCustomerCreated = (customer?: Customer) => {
    setIsCustomerDialogOpen(false);
    if (!customer) {
      return;
    }
    handleSelectCustomer(customer);
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

  // Restablece valores por modo (edición/creación), limpia errores y reposiciona el scroll.
  const handleReset = () => {
    const nextValues = isEditing ? normalizedEditValues : emptyValues;
    form.reset(nextValues);
    let resetCustomerLabel = nextValues.clienteBusqueda || nextValues.clienteNombre;
    if (isEditing && editingCustomerId > 0) {
      const matchedCustomer = customers.find((customer) => Number(customer.id) === editingCustomerId);
      if (matchedCustomer) {
        handleSelectCustomer(matchedCustomer, getOrderUsoCfdiCode(orderToEdit));
        resetCustomerLabel =
          matchedCustomer.razon_social ?? matchedCustomer.nombre ?? resetCustomerLabel;
      } else {
        setSelectedCustomerId(editingCustomerId);
      }
    } else {
      setSelectedCustomerId(0);
    }
    setErrorTree({});
    form.setFieldValue("clienteBusqueda", resetCustomerLabel);
    toast.success("Formulario restablecido");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Navegación de salida del formulario.
  const handleBack = () => {
    router.push("/sales/orders");
  };

  const isPending = isSubmittingForm || form.state.isSubmitting || isCreatingOrder || isUpdatingOrder || isCreatingDetails;
  const itemErrors = getError("items");
  const docRelacionadoError = getError("docRelacionado");
  const tipoDocumentoError = getError("tipoDocumento");
  const origenError = getError("origen");

  // Opciones SAT transformadas a formato label/value para selects.
  const regimenFiscalOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(satInfo?.regimenes_fiscales ?? []).map((item) => ({
        value: `${item.codigo} - ${item.descripcion}`,
        label: `${item.codigo} - ${item.descripcion}`,
      })),
    ],
    [satInfo?.regimenes_fiscales]
  );

  const usoCfdiOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar..." },
      ...(satInfo?.usos_cfdi ?? []).map((item) => ({
        value: item.codigo,
        label: `${item.codigo} - ${item.descripcion}`,
      })),
    ],
    [satInfo?.usos_cfdi]
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

  // Clave única para forzar remount en transición entre creación y edición.
  const formKey = isEditing ? `order-edit-${orderToEdit?.id ?? "ready"}` : "order-new";

  // Contrato público del hook consumido por OrderForm.tsx.
  return {
    form,
    formRef,
    formKey,
    getError,
    clearFieldErrors,
    validateField,
    isPending,
    isEditing,
    sellerName,
    userName,
    todayStr,
    documentTypeOptions: DOCUMENT_TYPE_OPTIONS,
    originOptions: ORIGIN_OPTIONS,
    paymentConditionOptions: PAYMENT_CONDITION_OPTIONS,
    ivaOptions: IVA_OPTIONS,
    regimenFiscalOptions,
    usoCfdiOptions,
    currencyOptions,
    isCustomersLoading,
    isSatInfoLoading,
    isCurrenciesLoading,
    isOrderProductDetailsLoading,
    showForm,
    handleFormSubmit,
    handleReset,
    handleBack,
    fields,
    append,
    remove,
    update,
    watchedItems,
    watchedFecha: values.fecha,
    watchedEnviarDomicilioFiscal: values.enviarDomicilioFiscal,
    watchedCondicionPago: values.condicionPago,
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
    itemsError: itemErrors,
    docRelacionadoError,
    tipoDocumentoError,
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
    orderToEdit,
  };
}

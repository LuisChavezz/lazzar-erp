"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import toast from "react-hot-toast";
import { Customer } from "../../customers/interfaces/customer.interface";
import { useCustomers } from "../../customers/hooks/useCustomers";
import { useSatInfo } from "../../sat/hooks/useSatInfo";
import type { FormFieldError } from "../../../utils/getFieldError";
import { orderFormSchema, type OrderFormValues } from "../schema/order.schema";
import { Order, OrderItem, type OrderPaymentCondition } from "../interfaces/order.interface";
import { useOrderStore } from "../stores/order.store";

interface UseOrderFormParams {
  orderId?: string;
}

type OrderField = keyof OrderFormValues;
type ErrorNode = {
  [key: string]: ErrorNode | FormFieldError | ErrorNode[] | undefined;
};

// Catálogos estáticos usados para renderizar selects y normalizar valores de entrada.
const ORIGIN_OPTIONS = [
  "Recompra",
  "Chat Online",
  "Pedido Online",
  "Prospección",
  "Recomendación",
  "Amazon",
  "Google",
  "Publicidad",
  "Mercado Libre",
  "Redes Sociales",
  "Otro",
  "Mailing",
];

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
  { value: 0.16, label: "16%" },
  { value: 0.08, label: "8%" },
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
const normalizeOrderValues = (order: Order, fallbackUserName: string): OrderFormValues => ({
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
  personaPagos: order.personaPagos ?? "",
  correoFacturas: order.correoFacturas ?? "",
  telefonoPagos: order.telefonoPagos ?? "",
  ordenCompra: order.ordenCompra ?? "",
  formaPago: getValidPaymentForm(order.formaPago),
  metodoPago: getValidPaymentMethod(order.metodoPago),
  tipoDocumento: getValidDocumentType(order.tipoDocumento),
  usoCfdi: order.usoCfdi ?? "",
  referenciarOcFactura: Boolean(order.referenciarOcFactura),
  condicionPago: order.condicionPago ?? "100_anticipo",
  condicionPagoMonto: Number(order.condicionPagoMonto) || 0,
  fecha: order.fecha ?? "",
  agente: order.agente ?? fallbackUserName,
  origen: order.origen ?? "",
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
  empaqueEcologico: Boolean(order.empaqueEcologico),
  embarqueParcial: Boolean(order.embarqueParcial),
  comentariosParcialidad: order.comentariosParcialidad ?? "",
  servicioEnvioActivo: Boolean(order.servicioEnvioActivo),
  servicioEnvioMonto: Number(order.servicioEnvioMonto) || 0,
  programaBordadosActivo: Boolean(order.programaBordadosActivo),
  programaBordadosMonto: Number(order.programaBordadosMonto) || 0,
  bordadoPantalonesExtrasActivo: Boolean(order.bordadoPantalonesExtrasActivo),
  bordadoPantalonesExtrasMonto: Number(order.bordadoPantalonesExtrasMonto) || 0,
  bordadoLogotipoIncluido: Boolean(order.bordadoLogotipoIncluido),
  estatusPedido: order.estatusPedido ?? "Pendiente",
  docRelacionado: order.docRelacionado ?? "",
  observaciones: order.observaciones ?? "",
  flete: Number(order.totals?.flete ?? 0),
  seguro: Number(order.totals?.seguro ?? 0),
  anticipo: Number(order.totals?.anticipo ?? 0),
  iva: Number(order.totals?.ivaRate ?? 0.16),
  items: (order.items ?? []).map(normalizeItem),
});

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
  personaPagos: "",
  correoFacturas: "",
  telefonoPagos: "",
  ordenCompra: "",
  formaPago: "03",
  metodoPago: "PUE",
  usoCfdi: "",
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
  empaqueEcologico: false,
  embarqueParcial: false,
  comentariosParcialidad: "",
  servicioEnvioActivo: false,
  servicioEnvioMonto: 0,
  programaBordadosActivo: false,
  programaBordadosMonto: 0,
  bordadoPantalonesExtrasActivo: false,
  bordadoPantalonesExtrasMonto: 0,
  bordadoLogotipoIncluido: true,
  estatusPedido: "Pendiente",
  docRelacionado: "",
  observaciones: "",
  flete: 0,
  seguro: 0,
  anticipo: 0,
  iva: 0.16,
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
  const orders = useOrderStore((state) => state.orders);
  const hasHydrated = useOrderStore((state) => state.hasHydrated);
  const addOrder = useOrderStore((state) => state.addOrder);
  const updateOrder = useOrderStore((state) => state.updateOrder);

  const userName = session?.user?.name || "Usuario";
  const sellerName = userName;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errorTree, setErrorTree] = useState<ErrorNode>({});
  const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Contexto de modo edición/creación y valores base.
  const orderToEdit = useMemo(
    () => orders.find((order) => order.id === orderId) ?? null,
    [orderId, orders]
  );
  const isEditing = Boolean(orderToEdit?.id);
  const showForm = !orderId || (hasHydrated && Boolean(orderToEdit));

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

      const servicioEnvio = parsed.data.servicioEnvioActivo ? parsed.data.servicioEnvioMonto : 0;
      const programaBordados = parsed.data.programaBordadosActivo
        ? parsed.data.programaBordadosMonto
        : 0;
      const bordadoPantalones = parsed.data.bordadoPantalonesExtrasActivo
        ? parsed.data.bordadoPantalonesExtrasMonto
        : 0;
      const extras = parsed.data.flete + parsed.data.seguro + servicioEnvio + programaBordados + bordadoPantalones;
      const ivaAmount = Number(((subtotal + extras) * parsed.data.iva).toFixed(2));
      const granTotal = Number((subtotal + extras + ivaAmount).toFixed(2));
      const saldoPendiente = Number((granTotal - parsed.data.anticipo).toFixed(2));

      const totals = {
        subtotal: Number(subtotal.toFixed(2)),
        descuentoTotal: Number(descuentoTotal.toFixed(2)),
        ivaAmount,
        granTotal,
        saldoPendiente,
        flete: Number(parsed.data.flete.toFixed(2)),
        seguro: Number(parsed.data.seguro.toFixed(2)),
        anticipo: Number(parsed.data.anticipo.toFixed(2)),
        ivaRate: parsed.data.iva,
      };

      const payloadBase = {
        ...parsed.data,
        ordenCompra: parsed.data.ordenCompra ?? "",
        items: normalizedItems,
        totals,
      };

      // En edición, conserva metadatos y actualiza la orden existente.
      if (isEditing && orderToEdit) {
        const nextOrder: Order = {
          ...orderToEdit,
          ...payloadBase,
          clienteBusqueda: parsed.data.clienteBusqueda,
          capturadoPor: orderToEdit.capturadoPor || userName,
        };
        updateOrder(nextOrder);
        toast.success("Pedido actualizado correctamente");
        router.push("/sales/orders");
        return;
      }

      // En creación, calcula folio/id consecutivos y persiste una nueva orden.
      const maxSequence = orders.reduce((max, order) => {
        const numericPart = Number((order.folio || "").replace(/[^\d]/g, ""));
        if (!Number.isFinite(numericPart)) {
          return max;
        }
        return Math.max(max, numericPart);
      }, 0);
      const nextSequence = maxSequence + 1;
      const nextFolio = `PED-${String(nextSequence).padStart(4, "0")}`;
      const id = `order-${String(nextSequence).padStart(6, "0")}`;

      const nextOrder: Order = {
        id,
        folio: nextFolio,
        ...payloadBase,
        clienteBusqueda: parsed.data.clienteBusqueda,
        capturadoPor: userName,
      };

      addOrder(nextOrder);
      toast.success("Pedido registrado correctamente");
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

  // Snapshot reactivo de valores del formulario para derivados y sincronizaciones.
  const values = useStore(form.baseStore, (state) => state.values);

  // Sincroniza automáticamente los datos de envío cuando se usa domicilio fiscal.
  useEffect(() => {
    if (!values.enviarDomicilioFiscal) {
      return;
    }
    form.setFieldValue("destinatario", values.clienteNombre || "");
    form.setFieldValue("empresaEnvio", values.razonSocial || "");
    form.setFieldValue("telefonoEnvio", values.telefonoPagos || "");
    form.setFieldValue("celularEnvio", values.telefonoPagos || "");
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
    values.telefonoPagos,
  ]);

  const normalizePath = (field: string) => field.replace(/\[(\d+)\]/g, ".$1");

  // Limpia el error de un campo puntual después de una corrección del usuario.
  const clearFieldErrors = (field: string) => {
    const path = normalizePath(field).split(".");
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
  };

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
  const servicioEnvioTotal = values.servicioEnvioActivo ? Number(values.servicioEnvioMonto) || 0 : 0;
  const programaBordadosTotal = values.programaBordadosActivo ? Number(values.programaBordadosMonto) || 0 : 0;
  const bordadoPantalonesTotal = values.bordadoPantalonesExtrasActivo
    ? Number(values.bordadoPantalonesExtrasMonto) || 0
    : 0;
  const extras = (Number(values.flete) || 0) + (Number(values.seguro) || 0) + servicioEnvioTotal + programaBordadosTotal + bordadoPantalonesTotal;
  const ivaRate = Number(values.iva) || 0;
  const ivaAmount = Number(((subtotal + extras) * ivaRate).toFixed(2));
  const granTotal = Number((subtotal + extras + ivaAmount).toFixed(2));
  const saldoPendiente = Number((granTotal - (Number(values.anticipo) || 0)).toFixed(2));

  const fields = watchedItems.map((item: OrderItem, index: number) => ({
    id: `${item.sku || "item"}-${index}`,
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
  const handleSelectCustomer = (customer: Customer) => {
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
    const usoCfdiLabel = selectedUsoCfdi ? `${selectedUsoCfdi.codigo} - ${selectedUsoCfdi.descripcion}` : "";

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
    form.setFieldValue("telefonoPagos", customer.telefono ?? "");
    form.setFieldValue("correoFacturas", customer.correo ?? "");
    form.setFieldValue("enviarDomicilioFiscal", true);
    if (usoCfdiLabel) {
      form.setFieldValue("usoCfdi", usoCfdiLabel);
    }
    clearFieldErrors("clienteBusqueda");
  };

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
    setErrorTree({});
    form.setFieldValue("clienteBusqueda", nextValues.clienteBusqueda || nextValues.clienteNombre);
    toast.success("Formulario restablecido");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Navegación de salida del formulario.
  const handleBack = () => {
    router.push("/sales/orders");
  };

  const isPending = isSubmittingForm || form.state.isSubmitting;
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
        value: `${item.codigo} - ${item.descripcion}`,
        label: `${item.codigo} - ${item.descripcion}`,
      })),
    ],
    [satInfo?.usos_cfdi]
  );

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
    isCustomersLoading,
    isSatInfoLoading,
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

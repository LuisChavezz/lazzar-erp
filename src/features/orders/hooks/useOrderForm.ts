"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEventHandler } from "react";
import toast from "react-hot-toast";
import type { Customer } from "../../customers/interfaces/customer.interface";
import { useCurrencies } from "../../currency/hooks/useCurrencies";
import type { FormFieldError } from "../../../utils/getFieldError";
import { orderFormSchema, type OrderFormValues } from "../schema/order.schema";
import {
  OrderCreate,
  OrderItem,
  OrderOnboardingData,
  type OrderPaymentCondition,
} from "../interfaces/order.interface";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCreateOrder } from "./useCreateOrder";
import { useOrderOnboardingData } from "./useOrderOnboardingData";

type OrderField = keyof OrderFormValues;
type OnboardingCustomer = OrderOnboardingData["busqueda"]["clientes"][number];
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
const ORDER_CREATION_EXTRA_DELAY_MS = 1800;
const ROUTE_SLIDE_TRANSITION_MS = 320;

// Guards de dominio para asegurar que los valores persistidos siempre coincidan con el esquema actual.
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
  tipo_pedido: 0,
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

export function useOrderForm() {
  // Dependencias de navegación y fuentes de datos del formulario.
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();
  const { data: onboardingData, isLoading: isOnboardingLoading } = useOrderOnboardingData();
  const { selectedCompany, selectedBranch } = useWorkspaceStore();
  const selectedCompanyId = selectedCompany?.id || 1; // Fallback
  const selectedBranchId = selectedBranch?.id || 1; // Fallback
  const { mutateAsync: createOrderMutation, isPending: isCreatingOrder } = useCreateOrder();

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
  const [isCreationSuccessVisible, setIsCreationSuccessVisible] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(0);

  const showForm = true;

  const emptyValues = useMemo(() => createEmptyValues(todayStr, userName), [todayStr, userName]);

  const form = useForm({
    defaultValues: emptyValues,
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

      const detalle = parsed.data.items.map((item) => {
        const llevaBordado = Boolean(item.bordados?.activo);
        const bordadoConfig =
          llevaBordado
            ? {
                ubicaciones:
                  item.bordados?.especificaciones?.map((spec) => ({
                    codigo: spec.posicionCodigo,
                    ancho_cm: Math.max(0, Number(spec.ancho) || 0),
                    alto_cm: Math.max(0, Number(spec.alto) || 0),
                    color_hilo: spec.colorHilo ?? null,
                  })) ?? [],
                notas: item.bordados?.observaciones ?? "",
              }
            : {
                ubicaciones: [],
                notas: "",
              };
        return {
          producto: item.productoId,
          tallas:
            item.tallas?.map((t) => ({
              talla: t.tallaId,
              cantidad: Math.max(0, Number(t.cantidad) || 0),
              lleva_bordado: llevaBordado,
              bordado_config: bordadoConfig,
            })) ?? [],
        };
      });

      const orderCreatePayload: OrderCreate = {
        pedido: {
          empresa: selectedCompanyId || 1, // Fallback safe si no hay empresa en workspace
          sucursal: selectedBranchId || 1, // Fallback safe si no hay sucursal
          cliente: selectedCustomerId || 1, // Fallback
          moneda: parsed.data.moneda || 1, // Fallback si no viene moneda
          persona_pagos: parsed.data.persona_pagos,
          correo_facturas: parsed.data.correo_facturas,
          telefono_pagos: parsed.data.telefono_pagos,
          forma_pago: parsed.data.forma_pago,
          metodo_pago: parsed.data.metodo_pago,
          uso_cfdi: parsed.data.uso_cfdi,
          tipo_pedido: parsed.data.tipo_pedido,
          estatus:
            parsed.data.estatusPedido === "Pendiente"
              ? 1
              : parsed.data.estatusPedido === "Parcial"
              ? 2
              : parsed.data.estatusPedido === "Completo"
              ? 3
              : 4,
          ...mapOrigenFlags(parsed.data.origen),
          ...mapCondicionPagoFlags(parsed.data.condicionPago),
          oc: parsed.data.oc?.trim() || "",
          monto: parsed.data.condicionPagoMonto ? String(parsed.data.condicionPagoMonto) : "0",
          empaque_ecologico: Boolean(parsed.data.empaque_ecologico),
          cliente_razon_social: parsed.data.razonSocial || "",
          cliente_nombre: parsed.data.clienteNombre || "",
          cliente_rfc: parsed.data.rfc || "",
          cliente_regimen_fiscal: parsed.data.regimenFiscal ? Number(parsed.data.regimenFiscal) : 1, // o el default que manejen
          cliente_direccion_fiscal: parsed.data.direccionFiscal || "",
          cliente_colonia: parsed.data.coloniaFiscal || "",
          cliente_codigo_postal: parsed.data.codigoPostalFiscal || "",
          cliente_ciudad: parsed.data.ciudadFiscal || "",
          cliente_estado: parsed.data.estadoFiscal || "",
          cliente_giro_empresarial: parsed.data.giroEmpresa || "",
          embarque_parcial: Boolean(parsed.data.embarque_parcial),
          comentarios_parcialidad: parsed.data.embarque_parcial
            ? parsed.data.comentarios_parcialidad || ""
            : "",
          observaciones: parsed.data.observaciones || "",
          envio: servicioEnvio ? String(servicioEnvio.toFixed(2)) : "0.00",
          programa_bordados: programaBordados ? String(programaBordados.toFixed(2)) : "0.00",
          bordado_pantalones_extras: bordadoPantalones ? String(bordadoPantalones.toFixed(2)) : "0.00",
          bordado_logotipo: Boolean(parsed.data.bordado_logotipo),
          flete: parsed.data.flete ? String(parsed.data.flete.toFixed(2)) : "0.00",
          seguros: parsed.data.seguros ? String(parsed.data.seguros.toFixed(2)) : "0.00",
          anticipo: parsed.data.anticipo ? String(parsed.data.anticipo.toFixed(2)) : "0.00",
          subtotal: totals.subtotal ? String(totals.subtotal.toFixed(2)) : "0.00",
          descuento_global: totals.descuentoTotal ? String(totals.descuentoTotal.toFixed(2)) : "0.00",
          ieps: "0.00",
          iva: parsed.data.iva || 0,
          gran_total: totals.granTotal ? String(totals.granTotal.toFixed(2)) : "0.00",
          activo: true,
          cotización: { id: 1 },
        },
        detalle,
      };
      await createOrderMutation(orderCreatePayload);
      setIsCreationSuccessVisible(true);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, ORDER_CREATION_EXTRA_DELAY_MS);
      });
      setIsRouteTransitioning(true);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, ROUTE_SLIDE_TRANSITION_MS);
      });

      form.reset(emptyValues);
      router.push("/sales/orders");
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

    if (wasEnviarDomicilioFiscalRef.current) {
      form.setFieldValue("destinatario", "");
      form.setFieldValue("empresaEnvio", "");
      form.setFieldValue("telefonoEnvio", "");
      form.setFieldValue("celularEnvio", "");
      form.setFieldValue("direccionEnvio", "");
      form.setFieldValue("coloniaEnvio", "");
      form.setFieldValue("codigoPostalEnvio", "");
      form.setFieldValue("ciudadEnvio", "");
      form.setFieldValue("estadoEnvio", "");
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
  const watchedItems = useMemo(() => values.items ?? [], [values.items]);
  const {
    subtotal,
    descuentoTotal,
    ivaAmount,
    granTotal,
    saldoPendiente,
  } = useMemo(() => {
    const nextSubtotal = watchedItems.reduce(
      (sum: number, item: OrderItem) => sum + (Number(item.importe) || 0),
      0
    );
    const nextDescuentoTotal = watchedItems.reduce((sum: number, item: OrderItem) => {
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
    const extras =
      (Number(values.flete) || 0) +
      (Number(values.seguros) || 0) +
      servicioEnvioTotal +
      programaBordadosTotal +
      bordadoPantalonesTotal;
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
    values.seguros,
    values.servicioEnvioActivo,
  ]);

  const fields = useMemo(
    () =>
      watchedItems.map((item: OrderItem, index: number) => ({
        id: `${item.productoId || "item"}-${index}`,
      })),
    [watchedItems]
  );

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

  const handleSelectCustomer = useCallback((customer: OnboardingCustomer) => {
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
    clearFieldErrors("clienteBusqueda");
  }, [clearFieldErrors, form, onboardingData?.catalogos.regimenes_fiscales]);

  // Callback de alta de cliente desde modal.
  const handleCustomerCreated = (customer?: Customer) => {
    setIsCustomerDialogOpen(false);
    if (!customer) {
      return;
    }
    const selectedRegimen = onboardingData?.catalogos.regimenes_fiscales.find(
      (item) => item.value === String(customer.sat_regimen_fiscal)
    );
    const [regimenCodigo = "", regimenDescripcion = ""] = (selectedRegimen?.label ?? "")
      .split(" - ")
      .map((item) => item.trim());
    handleSelectCustomer({
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
    });
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
    setSelectedCustomerId(0);
    setErrorTree({});
    form.setFieldValue("clienteBusqueda", "");
    toast.success("Formulario restablecido");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Navegación de salida del formulario.
  const handleBack = () => {
    router.push("/sales/orders");
  };

  const isPending =
    isSubmittingForm ||
    form.state.isSubmitting ||
    isCreatingOrder ||
    isCreationSuccessVisible ||
    isRouteTransitioning;
  const itemErrors = getError("items");
  const tipoPedidoError = getError("tipo_pedido");
  const origenError = getError("origen");

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
    () => [
      { value: "", label: "Seleccionar..." },
      ...(onboardingData?.catalogos.usos_cfdi ?? []),
    ],
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

  const formKey = "order-new";

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
  };
}

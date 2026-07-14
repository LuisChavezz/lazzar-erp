"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import type { Order } from "@/src/features/orders/interfaces/order.interface";
import {
  RegisterPendingInvoiceSchema,
  type RegisterPendingInvoiceFormValues,
} from "../schemas/register-pending-invoice.schema";
import type { RegisterPendingInvoiceBody } from "../interfaces/register-pending-invoice.interface";
import {
  useRegisterPendingInvoice,
  type RegisterPendingInvoiceField,
} from "./useRegisterPendingInvoice";

type SelectOption = { value: number; label: string };

const DEFAULT_VALUES: RegisterPendingInvoiceFormValues = {
  cliente: 0,
  moneda: 0,
  pedido: 0,
  folio: "",
  fecha_vencimiento: "",
  subtotal: "",
  descuento: "0.00",
  impuestos: "0.00",
  total: "",
  referencia: "",
  observaciones: "",
};

/**
 * useRegisterPendingInvoiceForm
 *
 * Lógica de TanStack Form para registrar una factura pendiente por cobrar.
 * Sigue el patrón de `useStockMovementForm`: estado local de `errors` con
 * `getError`/`clearFieldError`, validación Zod vía `safeParse` en el submit y un
 * `ref` anti doble-envío. Los errores de campo del `400` los mapea la mutación
 * al mismo estado `errors` a través de `setHookError`.
 */
export function useRegisterPendingInvoiceForm({
  onSuccess,
}: { onSuccess?: () => void } = {}) {
  // ─── Catálogos (reutilizados tal cual de sus módulos) ────────────────────
  const {
    customers,
    isLoading: isLoadingCustomers,
    isError: isErrorCustomers,
  } = useCustomers();
  const {
    data: currencies = [],
    isLoading: isLoadingCurrencies,
    isError: isErrorCurrencies,
  } = useCurrencies();
  const { orders, isLoading: isLoadingOrders, isError: isErrorOrders } = useOrders();

  const isLoadingCatalogs =
    isLoadingCustomers || isLoadingCurrencies || isLoadingOrders;
  // Si cualquier catálogo falla, el formulario no puede armarse con selects
  // válidos: se expone para que el diálogo muestre un estado de error en vez de
  // renderizar el formulario con dropdowns vacíos (que se confundirían con
  // catálogos legítimamente vacíos).
  const isErrorCatalogs =
    isErrorCustomers || isErrorCurrencies || isErrorOrders;

  // ─── Opciones derivadas ──────────────────────────────────────────────────
  const customerOptions = useMemo<SelectOption[]>(
    () =>
      customers
        .filter((c) => c.activo)
        .map((c) => ({
          value: Number(c.id),
          label: c.razon_social?.trim() || c.nombre,
        })),
    [customers],
  );

  const currencyOptions = useMemo<SelectOption[]>(
    () =>
      currencies
        .filter((c) => c.activo)
        .map((c) => ({ value: c.id, label: `${c.codigo_iso} — ${c.nombre}` })),
    [currencies],
  );

  /**
   * Un pedido es seleccionable si está activo (mismo criterio de "no eliminado"
   * que aplican `customerOptions`/`currencyOptions` con su bandera `activo`).
   * `Order.estatus` es un código numérico sin significado decodificado en el
   * frontend —no hay enum que lo mapee—, así que el guard correcto y no
   * especulativo es la bandera booleana `activo`, no un valor mágico de estatus.
   */
  const isSelectableOrder = (o: Order): boolean => o.activo;

  /**
   * Devuelve los pedidos seleccionables que coinciden con el cliente y la moneda
   * elegidos. El `Order` incluye ambas FK (`cliente`, `moneda`), por lo que el
   * filtro es cliente-side y no requiere un endpoint nuevo. Sin cliente+moneda no
   * se ofrece ningún pedido.
   */
  const getPedidoOptions = (cliente: number, moneda: number): SelectOption[] => {
    if (cliente < 1 || moneda < 1) return [];
    return orders
      .filter(
        (o: Order) =>
          isSelectableOrder(o) && o.cliente === cliente && o.moneda === moneda,
      )
      .map((o) => ({ value: o.id, label: `${o.folio} · ${o.cliente_nombre}` }));
  };

  /**
   * Devuelve el pedido completo (para auto-llenar los montos al seleccionarlo).
   * Aplica el mismo guard `isSelectableOrder` que `getPedidoOptions`, de modo que
   * un id obsoleto de un pedido inactivo nunca auto-llena el formulario.
   */
  const findPedido = (pedido: number): Order | undefined =>
    orders.find((o: Order) => o.id === pedido && isSelectableOrder(o));

  // ─── Estado de errores ───────────────────────────────────────────────────
  const [errors, setErrors] = useState<
    Partial<Record<RegisterPendingInvoiceField, string>>
  >({});

  const getError = (
    field: RegisterPendingInvoiceField,
  ): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  const clearFieldError = (field: RegisterPendingInvoiceField) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setHookError = (
    field: RegisterPendingInvoiceField,
    error: { message?: string },
  ) => {
    if (!error?.message) return;
    setErrors((prev) => ({ ...prev, [field]: error.message }));
  };

  const { mutateAsync: registerInvoice, isPending: isRegistering } =
    useRegisterPendingInvoice(setHookError);

  // ─── Validación ──────────────────────────────────────────────────────────
  const validateForm = (values: RegisterPendingInvoiceFormValues) => {
    const parsed = RegisterPendingInvoiceSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }

    const nextErrors: Partial<Record<RegisterPendingInvoiceField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as RegisterPendingInvoiceField;
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });
    setErrors(nextErrors);
    return null;
  };

  // ─── Formulario ──────────────────────────────────────────────────────────
  const submitInFlight = useRef(false);

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      // `parsed` trae los montos normalizados (p. ej. descuento "" → "0.00").
      const parsed = validateForm(value);
      if (!parsed) return;

      if (submitInFlight.current) return;
      submitInFlight.current = true;

      try {
        const folio = parsed.folio.trim();
        const fechaVencimiento = parsed.fecha_vencimiento.trim();
        const referencia = parsed.referencia.trim();
        const observaciones = parsed.observaciones.trim();

        const body: RegisterPendingInvoiceBody = {
          cliente: parsed.cliente,
          moneda: parsed.moneda,
          pedido: parsed.pedido > 0 ? parsed.pedido : null,
          subtotal: parsed.subtotal,
          descuento: parsed.descuento,
          impuestos: parsed.impuestos,
          total: parsed.total,
          // Solo se incluyen cuando tienen valor: `folio` vacío deja que el
          // backend lo autogenere; los demás son opcionales.
          ...(folio ? { folio } : {}),
          ...(fechaVencimiento ? { fecha_vencimiento: fechaVencimiento } : {}),
          ...(referencia ? { referencia } : {}),
          ...(observaciones ? { observaciones } : {}),
        };

        await registerInvoice(body);

        form.reset(DEFAULT_VALUES);
        setErrors({});
        onSuccess?.();
      } catch {
        // Los errores de campo/toast ya se manejaron en `onError` de la mutación.
      } finally {
        submitInFlight.current = false;
      }
    },
  });

  const isPending = isRegistering;

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleReset = () => {
    form.reset(DEFAULT_VALUES);
    setErrors({});
  };

  return {
    form,
    isPending,
    isLoadingCatalogs,
    isErrorCatalogs,
    customerOptions,
    currencyOptions,
    getPedidoOptions,
    findPedido,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleReset,
  };
}

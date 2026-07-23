"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import {
  PickingFormSchema,
  createEmptyPickingFormValues,
  type PickingFormValues,
} from "../schemas/picking.schema";
import type { CreatePickingPayload } from "../interfaces/picking.interface";
import { useCreatePicking, type ParsedPickingError } from "./useCreatePicking";

type PickingFormField = keyof PickingFormValues;

/**
 * Arma el cuerpo de `POST /wms/pickings/` a partir de los valores validados
 * del formulario más el `operador`, resuelto aparte (usuario autenticado) —
 * nunca capturado en el formulario.
 */
function buildPickingPayload(
  values: PickingFormValues,
  operador: number,
): CreatePickingPayload {
  const payload: CreatePickingPayload = {
    pedido: values.pedido,
    operador,
    almacen: values.almacen,
    prioridad: values.prioridad,
    tipo: values.tipo,
  };

  const observaciones = values.observaciones.trim();
  if (observaciones.length > 0) {
    payload.observaciones = observaciones;
  }

  return payload;
}

/**
 * Hook del formulario de captura de picking.
 *
 * `operador` se deriva del `id` de la sesión de NextAuth (string —
 * `session.user.id`, copia serializada del id numérico del usuario en el
 * backend, ver `src/lib/auth.ts`) convertido a número. No es un campo del
 * formulario: no se valida con `PickingFormSchema` ni se muestra en la UI, se
 * adjunta al payload justo antes de enviarlo (`buildPickingPayload`).
 */
export function usePickingForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ─── Sesión → operador ────────────────────────────────────────────────────
  const { data: session, status: sessionStatus } = useSession();
  const operadorId = useMemo(() => {
    const raw = session?.user?.id;
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [session?.user?.id]);
  const isSessionReady = sessionStatus !== "loading";

  // ─── Catálogos (se cargan bajo demanda al abrir el diálogo) ───────────────
  // `useOrders()` ya defaultea `orders` a `[]` internamente — no hace falta
  // repetir el default aquí.
  const { orders, isLoading: isLoadingOrders, isError: isErrorOrders } = useOrders();
  const {
    data: warehouses = [],
    isLoading: isLoadingWarehouses,
    isError: isErrorWarehouses,
  } = useWarehouses();

  const isLoadingFormData = !isSessionReady || isLoadingOrders || isLoadingWarehouses;
  // Si CUALQUIER catálogo falla, no se puede armar el formulario con selects
  // válidos: se expone para que el diálogo muestre un estado de error
  // explícito. Mismo patrón que `useStockTransferForm`.
  const isErrorFormData = isErrorOrders || isErrorWarehouses;

  // ─── Opciones derivadas ─────────────────────────────────────────────────
  const orderOptions = useMemo(
    () => orders.filter((o) => o.activo).map((o) => ({ value: o.id, label: o.folio })),
    [orders],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses
        .filter((w) => w.estatus === "ACTIVO")
        .map((w) => ({ value: w.id_almacen, label: `${w.codigo} - ${w.nombre}` })),
    [warehouses],
  );

  // ─── Prerrequisitos ───────────────────────────────────────────────────────
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (orderOptions.length === 0) items.push("Al menos un pedido activo");
    if (warehouseOptions.length === 0) items.push("Al menos un almacén activo");
    return items;
  }, [orderOptions.length, warehouseOptions.length]);

  // ─── Estado de UI ─────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Partial<Record<PickingFormField, string>>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  const getError = (field: PickingFormField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  const clearError = (field: PickingFormField) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ─── Reparto del error del backend ────────────────────────────────────────
  const handleServerError = (parsed: ParsedPickingError) => {
    const next: Partial<Record<PickingFormField, string>> = {};
    (Object.keys(parsed.fieldErrors) as (keyof typeof parsed.fieldErrors)[]).forEach(
      (field) => {
        const message = parsed.fieldErrors[field];
        if (message) next[field] = message;
      },
    );
    setErrors((prev) => ({ ...prev, ...next }));

    const hasFieldErrors = Object.keys(parsed.fieldErrors).length > 0;
    const detail =
      parsed.formError ?? (hasFieldErrors ? "Revisa los campos marcados." : "Intenta de nuevo.");
    setServerBanner(detail);
  };

  const { mutateAsync: createPicking, isPending: isCreating } =
    useCreatePicking(handleServerError);

  // ─── Formulario ─────────────────────────────────────────────────────────
  const defaultValues = useMemo<PickingFormValues>(() => createEmptyPickingFormValues(), []);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      const parsed = PickingFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<PickingFormField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path[0] as PickingFormField;
          if (key && !nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }

      if (operadorId === null) {
        setServerBanner(
          "No se pudo determinar el usuario de la sesión actual. Vuelve a iniciar sesión e intenta de nuevo.",
        );
        return;
      }

      setErrors({});

      if (submitInFlight.current) return;
      submitInFlight.current = true;
      setIsSubmitting(true);

      try {
        await createPicking(buildPickingPayload(parsed.data, operadorId));
        form.reset(defaultValues);
        setErrors({});
        setServerBanner(null);
        onSuccess?.();
      } catch {
        // El error del backend ya se repartió en `handleServerError` (banner +
        // errores por campo) y se mostró el toast desde la mutación.
      } finally {
        setIsSubmitting(false);
        submitInFlight.current = false;
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ─── Submit / reset ───────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleReset = () => {
    form.reset(defaultValues);
    setErrors({});
    setServerBanner(null);
  };

  return {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    // Lista cruda de pedidos (la misma que alimenta `orderOptions`): el
    // formulario la usa para resolver el `Order` completo del pedido
    // seleccionado — el diálogo apilado "Ver detalle" necesita el `id` para su
    // fetch y `folio`/cliente para el título, no solo el par value/label.
    orders,
    orderOptions,
    warehouseOptions,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    handleFormSubmit,
    handleReset,
  };
}

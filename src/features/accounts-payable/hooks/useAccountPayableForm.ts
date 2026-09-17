"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useSuppliers } from "@/src/features/suppliers/hooks/useSuppliers";
import {
  CuentaPorPagarFormSchema,
  createEmptyCuentaPorPagarForm,
  valuesFromFacturaProveedor,
} from "../schemas/accounts-payable.schema";
import { buildCuentaPorPagarPayload } from "../utils/buildCuentaPorPagarPayload";
import {
  CXP_CONFLICT_FALLBACK_MESSAGE,
  type ParsedCuentaPorPagarError,
} from "../utils/parseCuentaPorPagarError";
import { useCreateCuentaPorPagar } from "./useCreateCuentaPorPagar";
import type { FacturaProveedor } from "../interfaces/factura-proveedor.interface";

/**
 * Aviso del backend para el banner del formulario. `canRetry` distingue un 409
 * —otra operación tenía la factura bloqueada: la MISMA petición puede funcionar
 * al reintentarla— de un rechazo que exige corregir algo antes de reenviar.
 */
export interface AccountPayableServerError {
  message: string;
  canRetry: boolean;
}

/** Errores que dependen de la factura elegida y dejan de aplicar al cambiarla. */
const FACTURA_DERIVED_ERROR_KEYS = [
  "factura_proveedor",
  "proveedor",
  "total",
  "fecha_vencimiento",
] as const;

export function useAccountPayableForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ── Catálogo de proveedores ──────────────────────────────────────────────
  const {
    suppliers,
    isLoading: isLoadingSuppliers,
    isError: isErrorSuppliers,
  } = useSuppliers();

  const isLoadingFormData = isLoadingSuppliers;
  // Un refetch fallido CON proveedores en caché no debe tirar el formulario.
  // `useSuppliers` no expone `hasLoaded`: mismo equivalente que `usePaymentForm`
  // (si hay proveedores en mano, la carga inicial ya ocurrió).
  const isErrorFormData = isErrorSuppliers && suppliers.length === 0;

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.nombre }));
  const missingItems = supplierOptions.length === 0 ? ["Proveedores registrados"] : [];

  // ── Estado de UI ─────────────────────────────────────────────────────────
  // Ref al `<form>` para llevar la vista al primer campo inválido tras una
  // validación local fallida (mismo cableado que `usePolizaForm`).
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<AccountPayableServerError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearErrors = (...paths: string[]) => {
    setErrors((prev) => {
      if (!paths.some((path) => path in prev)) return prev;
      const next = { ...prev };
      paths.forEach((path) => delete next[path]);
      return next;
    });
  };

  // ── Reparto del error del backend ────────────────────────────────────────
  const handleServerError = (parsed: ParsedCuentaPorPagarError) => {
    const next: Record<string, string> = {};
    Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
      if (message) next[field] = message;
    });
    setErrors((prev) => ({ ...prev, ...next }));

    // El alta es atómica: se dice explícitamente que NADA quedó registrado, para
    // que nadie busque una cuenta a medias antes de reintentar.
    if (parsed.kind === "conflict") {
      setServerError({
        message: `No se registró la cuenta por pagar. ${
          parsed.formError ?? CXP_CONFLICT_FALLBACK_MESSAGE
        }`,
        canRetry: true,
      });
      return;
    }

    const hasFieldErrors = Object.keys(next).length > 0;
    const detail =
      parsed.formError ??
      (hasFieldErrors ? "Revisa los campos marcados." : "Intenta de nuevo.");
    setServerError({
      message: `No se registró la cuenta por pagar. ${detail}`,
      canRetry: false,
    });
  };

  const { mutateAsync: createCuentaMutation, isPending: isCreating } =
    useCreateCuentaPorPagar(handleServerError);

  // ── Formulario ───────────────────────────────────────────────────────────
  // `useState` con inicializador: una sola instancia estable de los valores
  // iniciales, sin memoización manual (el React Compiler está activo).
  const [defaultValues] = useState(createEmptyCuentaPorPagarForm);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerError(null);

      const parsed = CuentaPorPagarFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        // Los campos son todos de primer nivel, así que la ruta del issue ya es
        // el `name` del control.
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }
      setErrors({});

      // El reenvío concurrente ya lo impide `form.handleSubmit()`, que no
      // reentra mientras hay un envío en vuelo.
      setIsSubmitting(true);

      try {
        await createCuentaMutation(buildCuentaPorPagarPayload(parsed.data));
        form.reset(createEmptyCuentaPorPagarForm());
        setErrors({});
        setServerError(null);
        onSuccess?.();
      } catch {
        // El error ya se repartió en `handleServerError` y el toast salió desde
        // la mutación. Se captura para que el rechazo de `mutateAsync` no escape
        // por el `void form.handleSubmit()` como unhandled rejection.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ── Proveedor y factura ──────────────────────────────────────────────────
  /**
   * Cambiar de proveedor DESCARTA la factura elegida y todo lo que salió de ella:
   * la factura de otro proveedor no puede originar una CxP de este (el backend
   * lo rechaza con 400 en `proveedor`).
   */
  const handleProveedorChange = (proveedorId: number) => {
    const empty = createEmptyCuentaPorPagarForm();
    form.setFieldValue("proveedor", proveedorId);
    form.setFieldValue("factura_proveedor", empty.factura_proveedor);
    form.setFieldValue("total", empty.total);
    form.setFieldValue("factura_proveedor_folio", empty.factura_proveedor_folio);
    form.setFieldValue("proveedor_nombre", empty.proveedor_nombre);
    form.setFieldValue("moneda_codigo", empty.moneda_codigo);
    form.setFieldValue("fecha_vencimiento", empty.fecha_vencimiento);
    clearErrors(...FACTURA_DERIVED_ERROR_KEYS);
    setServerError(null);
  };

  /**
   * Siembra el formulario desde la factura elegida con
   * `valuesFromFacturaProveedor`, la definición única de la derivación: así
   * `proveedor` y `total` nunca discrepan del cruce del backend. El vencimiento
   * se PRECARGA y queda editable; `observaciones` no se toca.
   */
  const handleFacturaChange = (factura: FacturaProveedor) => {
    // Re-confirmar la MISMA factura no cambia nada: el selector único siembra su
    // selección tentativa con la actual, así que "Confirmar selección" está
    // habilitado desde que se abre y un clic de más revertiría el vencimiento
    // que el usuario hubiera ajustado a mano al de la factura.
    if (factura.id === form.state.values.factura_proveedor) return;
    const values = valuesFromFacturaProveedor(factura);
    form.setFieldValue("factura_proveedor", values.factura_proveedor);
    form.setFieldValue("proveedor", values.proveedor);
    form.setFieldValue("total", values.total);
    form.setFieldValue("factura_proveedor_folio", values.factura_proveedor_folio);
    form.setFieldValue("proveedor_nombre", values.proveedor_nombre);
    form.setFieldValue("moneda_codigo", values.moneda_codigo);
    form.setFieldValue("fecha_vencimiento", values.fecha_vencimiento);
    clearErrors(...FACTURA_DERIVED_ERROR_KEYS);
    // Un aviso previo (p. ej. factura duplicada) hablaba de la factura anterior.
    setServerError(null);
  };

  // ── Submit / reset ───────────────────────────────────────────────────────
  /** Reintento tras un 409: reenvía exactamente los mismos valores. */
  const retrySubmit = () => {
    void form.handleSubmit();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleReset = () => {
    form.reset(createEmptyCuentaPorPagarForm());
    setErrors({});
    setServerError(null);
  };

  return {
    form,
    formRef,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    supplierOptions,
    serverError,
    dismissServerError: () => setServerError(null),
    retrySubmit,
    getError,
    clearErrors,
    handleProveedorChange,
    handleFacturaChange,
    handleFormSubmit,
    handleReset,
  };
}

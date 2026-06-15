"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState, type FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import {
  PurchaseOrderEncabezadosSchema,
  type PurchaseOrderEncabezadosFormValues,
} from "../schemas/purchase-order-onboarding.schema";
import { usePostPurchaseOrder } from "./usePostPurchaseOrder";

interface UsePurchaseOrderStep1FormParams {
  onboardingData: PurchaseOrderOnboardingData;
}

/**
 * Dot-separated path for each leaf field inside `orden_compra`.
 * Used for error lookup and form.Field `name` prop.
 */
export type Step1FieldPath =
  | "orden_compra.sucursal"
  | "orden_compra.proveedor"
  | "orden_compra.moneda"
  | "orden_compra.fecha_oc"
  | "orden_compra.referencia"
  | "orden_compra.observaciones";

type Step1ErrorMap = Partial<Record<Step1FieldPath, string>>;

export function usePurchaseOrderStep1Form({
  onboardingData,
}: UsePurchaseOrderStep1FormParams) {
  const { mutateAsync: postEncabezados, isPending } =
    usePostPurchaseOrder();

  const [clientErrors, setClientErrors] = useState<Step1ErrorMap>({});
  const [serverErrors, setServerErrors] = useState<Step1ErrorMap>({});

  // ── Default values ──────────────────────────────────────────────────────
  const defaultValues = useMemo<PurchaseOrderEncabezadosFormValues>(
    () => ({
      orden_compra: {
        sucursal: 0,
        proveedor: 0,
        moneda: 0,
        fecha_oc: new Date().toISOString().slice(0, 10),
        referencia: "",
        observaciones: "",
      },
    }),
    [],
  );

  // ── Selector options derived from onboarding data ───────────────────────
  const sucursalOptions = useMemo(
    () => [
      { value: 0, label: "Seleccionar sucursal…" },
      ...onboardingData.catalogos.sucursales.map((s) => ({
        value: s.id_sucursal,
        label: `${s.codigo} — ${s.nombre}`,
      })),
    ],
    [onboardingData],
  );

  const proveedorOptions = useMemo(
    () => [
      { value: 0, label: "Seleccionar proveedor…" },
      ...onboardingData.busqueda.proveedores.map((p) => ({
        value: p.id,
        label: `${p.codigo} — ${p.nombre}`,
      })),
    ],
    [onboardingData],
  );

  const monedaOptions = useMemo(
    () => [
      { value: 0, label: "Seleccionar moneda…" },
      ...onboardingData.catalogos.monedas.map((m) => ({
        value: m.id,
        label: `${m.codigo_iso} — ${m.nombre}`,
      })),
    ],
    [onboardingData],
  );

  // ── Error helpers ───────────────────────────────────────────────────────

  const getError = (path: Step1FieldPath): FormFieldError | undefined => {
    const message = serverErrors[path] ?? clientErrors[path];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  const clearFieldErrors = (path: Step1FieldPath) => {
    setClientErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setServerErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  /** Coerces a select/input string to number for numeric fields. */
  const coerceNumeric = (
    path: Step1FieldPath,
    raw: string,
  ): string | number => {
    const numericPaths: Step1FieldPath[] = [
      "orden_compra.sucursal",
      "orden_compra.proveedor",
      "orden_compra.moneda",
    ];
    if (numericPaths.includes(path)) {
      const n = Number(raw);
      return Number.isNaN(n) ? 0 : n;
    }
    return raw;
  };

  // ── Field-level validation on blur ─────────────────────────────────────

  const validateField = (path: Step1FieldPath) => {
    const fullValues = form.state.values;
    const parsed = PurchaseOrderEncabezadosSchema.safeParse(fullValues);

    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      });
      return true;
    }

    const matchingIssue = parsed.error.issues.find(
      (issue) => issue.path.join(".") === path,
    );

    if (matchingIssue) {
      setClientErrors((prev) => ({ ...prev, [path]: matchingIssue.message }));
      return false;
    }

    // No error for this field — clear it.
    setClientErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    return true;
  };

  // ── Form definition ────────────────────────────────────────────────────

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const parsed = PurchaseOrderEncabezadosSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Step1ErrorMap = {};
        parsed.error.issues.forEach((issue) => {
          const path = issue.path.join(".") as Step1FieldPath;
          if (!nextErrors[path]) {
            nextErrors[path] = issue.message;
          }
        });
        setClientErrors(nextErrors);
        return;
      }

      try {
        await postEncabezados(parsed.data);
        // On success: toast is handled by the mutation hook.
        // Do NOT close dialog, advance step, or reset form.
      } catch {
        // Error toast is handled by the mutation hook.
        return;
      }
    },
  });

  // ── Form submit handler ────────────────────────────────────────────────

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    isPending,
    handleFormSubmit,
    sucursalOptions,
    proveedorOptions,
    monedaOptions,
    getError,
    clearFieldErrors,
    validateField,
    coerceNumeric,
  };
}

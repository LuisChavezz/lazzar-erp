"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { ReceiptFormSchema, type ReceiptFormValues } from "../schemas/receipt.schema";
import { useReceiptOnboardingData } from "./useReceiptOnboardingData";
import { useCreateReceipt } from "./useCreateReceipt";
import type {
  ReceiptOrderCandidate,
  ReceiptCreatePayload,
  ReceiptCreatePurchaseOrderDetalle,
  ReceiptCreateProductionOrderDetalle,
} from "../interfaces/receipt-onboarding.interface";

interface UseReceiptFormParams {
  onSuccess: () => void;
  candidate: ReceiptOrderCandidate;
}

type ReceiptFormField = keyof ReceiptFormValues;

// Busca el primer campo inválido y mueve el viewport hasta él.
const scrollToFirstValidationError = (
  formElement: HTMLFormElement,
  issuePaths: string[],
) => {
  if (issuePaths.length === 0) return;

  const controls = Array.from(
    formElement.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea"),
  ).filter(
    (el) =>
      Boolean(el.name) &&
      !el.disabled &&
      !(el instanceof HTMLInputElement && el.type === "hidden"),
  );

  const firstInvalid = controls.find((control) =>
    issuePaths.some(
      (path) =>
        control.name === path ||
        path.startsWith(`${control.name}.`) ||
        control.name.startsWith(`${path}.`),
    ),
  );

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalid.focus({ preventScroll: true });
  }
};

export function useReceiptForm({ onSuccess, candidate }: UseReceiptFormParams) {
  // ── Catálogos desde onboarding ────────────────────────────────────────
  const { onboardingData } = useReceiptOnboardingData();
  const warehouses = onboardingData?.catalogos.almacenes ?? [];

  // ── Mutación ──────────────────────────────────────────────────────────
  const createReceiptMutation = useCreateReceipt();

  // ── Referencia del formulario ─────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);

  // ── Errores de validación ─────────────────────────────────────────────
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ReceiptFormField, string>>
  >({});

  // ── Valores por defecto ───────────────────────────────────────────────
  const defaultValues = useMemo<ReceiptFormValues>(
    () => ({
      almacen: 0,
      serie_codigo: "",
      remision: "",
      factura_referencia: "",
      observaciones: "",
      cantidades: {},
    }),
    [],
  );

  // ── Limpia error de un campo ──────────────────────────────────────────
  const clearFieldErrors = (field: ReceiptFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ── Valida campo en onBlur ────────────────────────────────────────────
  const validateField = (
    field: ReceiptFormField,
    value: ReceiptFormValues[ReceiptFormField],
  ) => {
    const fieldSchema = ReceiptFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }

    const message = parsed.error.issues[0]?.message ?? "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // ── Valida formulario completo ────────────────────────────────────────
  const validateForm = (values: ReceiptFormValues) => {
    const parsed = ReceiptFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ReceiptFormField, string>> = {};
    const issuePaths: string[] = [];

    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ReceiptFormField;
      issuePaths.push(String(field));
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);

    if (formRef.current) {
      setTimeout(() => {
        scrollToFirstValidationError(formRef.current!, issuePaths);
      }, 0);
    }

    return false;
  };

  // ── Obtiene error de campo en formato FormFieldError ──────────────────
  const getError = (field: ReceiptFormField) => {
    const message = clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // ── Formulario TanStack ───────────────────────────────────────────────
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) return;

      // Guard: keep only detail rows with a positive received quantity.
      const hasQuantity = (id: number) => {
        const cantidad = value.cantidades[String(id)];
        return !(
          cantidad === undefined ||
          cantidad.trim() === "" ||
          Number(cantidad) <= 0
        );
      };
      const cantidadFor = (id: number) => value.cantidades[String(id)];

      // Shared header fields (identical for both order types).
      const recepcionBase = {
        almacen: value.almacen,
        serie_codigo: value.serie_codigo,
        fecha_recepcion: new Date().toISOString(),
        remision: value.remision,
        factura_referencia: value.factura_referencia,
        observaciones: value.observaciones,
        transportista: null,
      };

      let payload: ReceiptCreatePayload;

      if (candidate.type === "compra") {
        const detalle = candidate.order.detalle.reduce<
          ReceiptCreatePurchaseOrderDetalle[]
        >((acc, d) => {
          if (!hasQuantity(d.id)) return acc;
          acc.push({
            orden_compra_detalle: d.id,
            cantidad_recibida: cantidadFor(d.id),
          });
          return acc;
        }, []);

        payload = {
          recepcion: {
            orden_compra: candidate.order.id,
            ...recepcionBase,
          },
          detalle,
        };
      } else {
        const detalle = candidate.order.detalle.reduce<
          ReceiptCreateProductionOrderDetalle[]
        >((acc, d) => {
          if (!hasQuantity(d.id)) return acc;
          acc.push({
            orden_produccion_detalle: d.id,
            cantidad_recibida: cantidadFor(d.id),
            producto_variante: d.producto_variante_id ?? null,
          });
          return acc;
        }, []);

        payload = {
          recepcion: {
            orden_produccion: candidate.order.id,
            ...recepcionBase,
          },
          detalle,
        };
      }

      createReceiptMutation.mutate(payload, {
        onSuccess: () => {
          form.reset(defaultValues);
          onSuccess();
        },
      });
    },
  });

  // ── Reset manual ──────────────────────────────────────────────────────
  const handleReset = () => {
    form.reset(defaultValues);
    setClientErrors({});
  };

  // ── Submit del DOM ────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // ── ID único para key del formulario ──────────────────────────────────
  const formKey = `receipt-${candidate.type}-${candidate.order.id}`;

  return {
    form,
    formRef,
    formKey,
    isPending: createReceiptMutation.isPending,
    warehouses,
    candidate,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}

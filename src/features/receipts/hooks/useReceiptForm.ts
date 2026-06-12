"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { ReceiptFormSchema, type ReceiptFormValues } from "../schemas/receipt.schema";
import { useSuppliers } from "../../suppliers/hooks/useSuppliers";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import type { PurchaseOrder } from "../../purchase-orders/interfaces/purchase-order.interface";

interface UseReceiptFormParams {
  onSuccess: () => void;
  purchaseOrder: PurchaseOrder;
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

export function useReceiptForm({ onSuccess, purchaseOrder }: UseReceiptFormParams) {
  // ── Catálogos ─────────────────────────────────────────────────────────
  const { suppliers } = useSuppliers();
  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data ?? [];

  // ── Workspace y sesión ────────────────────────────────────────────────
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);
  const { data: session } = useSession();

  // ── Referencia del formulario ─────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);

  // ── Errores de validación ─────────────────────────────────────────────
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ReceiptFormField, string>>
  >({});

  // ── Valores por defecto ───────────────────────────────────────────────
  const defaultValues = useMemo<ReceiptFormValues>(
    () => ({
      remision: "",
      factura_referencia: "",
      transportista: "",
      proveedor: purchaseOrder.proveedor,
      almacen: 0,
      observaciones: "",
    }),
    [purchaseOrder.proveedor],
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

      const payload = {
        // Campos del formulario
        remision: value.remision,
        factura_referencia: value.factura_referencia,
        transportista: value.transportista,
        observaciones: value.observaciones,
        // Selectores dinámicos
        proveedor: value.proveedor,
        almacen: value.almacen,
        // Automáticos
        estatus: 1,
        activo: true,
        fecha_recepcion: new Date().toISOString(),
        orden_compra: purchaseOrder.id,
        empresa: selectedCompany.id!,
        sucursal: selectedBranch?.id,
        usuario: Number(session?.user?.id) ?? 0,
        // Detail por defecto
        detail: [
          {
            orden_compra_detalle: 1,
            producto: 1,
            ubicacion: 1,
          },
        ],
      };

      console.log("[ReceiptForm] Payload:", payload);

      form.reset(defaultValues);
      onSuccess();
    },
  });

  // ── Sincroniza reset ante cambios de valores por defecto ──────────────
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  // ── Estado de submit ──────────────────────────────────────────────────
  const isPending = false; // Sin API calls aún

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
  const formKey = `receipt-po-${purchaseOrder.id}`;

  return {
    form,
    formRef,
    formKey,
    isPending,
    suppliers,
    warehouses,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}

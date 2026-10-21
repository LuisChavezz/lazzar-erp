"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useLineItemsFormErrors } from "@/src/hooks/useLineItemsFormErrors";
import { useSuppliers } from "@/src/features/suppliers/hooks/useSuppliers";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import {
  PagoFormSchema,
  createEmptyPagoForm,
  type PagoFormValues,
  type PagoLineFormValues,
} from "../schemas/payment.schema";
import { buildPagoPayload } from "../utils/buildPagoPayload";
import { useCreatePago } from "./useCreatePago";
import type { CuentaPorPagar } from "@/src/features/accounts-payable/interfaces/accounts-payable.interface";

/** Siembra una línea a partir de la CxP elegida en el selector. */
const lineFromCuentaPorPagar = (cuenta: CuentaPorPagar): PagoLineFormValues => ({
  cxp: cuenta.id,
  saldo: cuenta.saldo,
  moneda_codigo: cuenta.moneda_codigo,
  factura_folio: cuenta.factura_proveedor_folio ?? `CxP #${cuenta.id}`,
  // El importe arranca en el SALDO COMPLETO: aplicar la factura entera es el
  // caso normal, y dejarlo vacío obligaría a teclear el mismo número que ya se
  // muestra al lado. Es editable para permitir el abono parcial.
  importe_aplicado: cuenta.saldo,
  observaciones: "",
});

export function usePaymentForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ── Catálogos de cabecera ────────────────────────────────────────────────
  const {
    suppliers,
    isLoading: isLoadingSuppliers,
    isInitialError: isErrorSuppliers,
  } = useSuppliers();
  const {
    bankAccounts,
    hasLoaded: hasLoadedBankAccounts,
    isLoading: isLoadingBankAccounts,
    isError: isErrorBankAccounts,
  } = useBankAccounts();

  const isLoadingFormData = isLoadingSuppliers || isLoadingBankAccounts;
  // Si un catálogo falla LA PRIMERA VEZ no se puede armar el formulario con
  // selects válidos: una lista vacía por error de red se confundiría con un
  // catálogo legítimamente vacío.
  //
  // Pero un refetch fallido CON datos en caché no debe tirar el formulario: el
  // usuario puede llevar varias líneas capturadas y `PaymentForm` sustituye toda
  // la pantalla por la tarjeta de error, perdiéndolas sin vuelta atrás. Basta con
  // que cualquier mutación vecina invalide `["bank-accounts"]` y el refetch falle.
  // Mismo criterio `isError && !hasLoaded` que usa el resto de finanzas.
  // Proveedores ya llega filtrado: `useSuppliers` expone `isInitialError`.
  const isErrorFormData =
    isErrorSuppliers || (isErrorBankAccounts && !hasLoadedBankAccounts);

  // ── Estado de UI ─────────────────────────────────────────────────────────
  // Errores de cabecera y de línea, y el banner de "todo o nada" (helper
  // compartido con el alta de cobros).
  const {
    getError,
    clearError,
    resetLineErrors,
    applyValidationIssues,
    applyServerError,
    clearErrors,
    serverBanner,
    setServerBanner,
  } = useLineItemsFormErrors({
    linesKey: "pago_detalles",
    totalField: "total_pagado",
    bannerPrefix: "No se registró ningún pago.",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Claves estables por línea, para que borrar una línea intermedia no reutilice
  // el estado local de otra. Arranca vacío: las líneas las siembra el selector.
  const lineKeyCounter = useRef(0);
  const [lineKeys, setLineKeys] = useState<number[]>([]);

  // ── Opciones derivadas ───────────────────────────────────────────────────
  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.nombre })),
    [suppliers],
  );

  // Solo cuentas ACTIVAS: pagar desde una cuenta dada de baja no tiene sentido.
  const bankAccountOptions = useMemo(
    () =>
      bankAccounts
        .filter((c) => c.activo)
        .map((c) => ({
          value: c.id,
          label: [c.alias, c.banco_nombre, c.moneda_codigo]
            .filter(Boolean)
            .join(" · "),
        })),
    [bankAccounts],
  );

  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (supplierOptions.length === 0) items.push("Proveedores registrados");
    if (bankAccountOptions.length === 0) items.push("Cuentas bancarias activas");
    return items;
  }, [supplierOptions.length, bankAccountOptions.length]);

  const { mutateAsync: createPagoMutation, isPending: isCreating } =
    useCreatePago(applyServerError);

  // ── Formulario ───────────────────────────────────────────────────────────
  const defaultValues = useMemo<PagoFormValues>(() => createEmptyPagoForm(), []);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      const parsed = PagoFormSchema.safeParse(value);
      if (!parsed.success) {
        applyValidationIssues(parsed.error.issues);
        return;
      }
      clearErrors();

      // El reenvío concurrente ya lo impide `form.handleSubmit()`, que se niega a
      // reentrar mientras hay un envío en vuelo; no hace falta un candado propio.
      setIsSubmitting(true);

      try {
        await createPagoMutation(buildPagoPayload(parsed.data));
        // Valores frescos en cada limpieza: reusar un objeto memoizado haría que
        // una sola instancia de `pago_detalles` respaldara el montaje inicial y
        // todos los `reset`, y bastaría una escritura en sitio del arreglo para
        // que el siguiente alta arrancara con las líneas del pago anterior.
        form.reset(createEmptyPagoForm());
        setLineKeys([]);
        clearErrors();
        setServerBanner(null);
        onSuccess?.();
      } catch {
        // El error ya se repartió en `handleServerError` (banner + errores por
        // campo/línea) y el toast salió desde la mutación. Se captura aquí a
        // propósito: sin este `catch`, el rechazo de `mutateAsync` escaparía por
        // el `void form.handleSubmit()` como unhandled rejection.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ── Líneas ───────────────────────────────────────────────────────────────
  /** Agrega de golpe las CxP que el selector devolvió. */
  const addLines = (cuentas: CuentaPorPagar[]) => {
    if (cuentas.length === 0) return;
    const newKeys: number[] = [];
    cuentas.forEach((cuenta) => {
      form.pushFieldValue("pago_detalles", lineFromCuentaPorPagar(cuenta));
      newKeys.push(lineKeyCounter.current++);
    });
    setLineKeys((prev) => [...prev, ...newKeys]);
    // Agregar al FINAL no recorre los índices existentes, así que sus errores
    // siguen siendo válidos y se conservan a propósito. Solo se limpia el error
    // del arreglo ("agrega al menos una cuenta"), que acaba de dejar de aplicar.
    clearError("pago_detalles");
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("pago_detalles", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  /**
   * Cambiar de proveedor VACÍA las líneas: las CxP del proveedor anterior no
   * pueden aplicarse a un pago del nuevo (el backend valida que cada `cxp`
   * pertenezca a la empresa, y aplicar la factura de otro proveedor sería un
   * error de negocio aunque pasara). También suelta el candado de moneda, que se
   * vuelve a fijar con la primera CxP que se elija.
   */
  const handleProveedorChange = (proveedorId: number) => {
    form.setFieldValue("proveedor", proveedorId);
    form.setFieldValue("pago_detalles", []);
    setLineKeys([]);
    resetLineErrors();
    clearError("proveedor");
  };

  // ── Submit / reset ───────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleReset = () => {
    form.reset(createEmptyPagoForm());
    setLineKeys([]);
    clearErrors();
    setServerBanner(null);
  };

  return {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    supplierOptions,
    bankAccountOptions,
    lineKeys,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    addLines,
    removeLine,
    handleProveedorChange,
    handleFormSubmit,
    handleReset,
  };
}

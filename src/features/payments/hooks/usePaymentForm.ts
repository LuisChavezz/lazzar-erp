"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useSuppliers } from "@/src/features/suppliers/hooks/useSuppliers";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import {
  PagoFormSchema,
  createEmptyPagoForm,
  type PagoFormValues,
  type PagoLineFormValues,
} from "../schemas/payment.schema";
import { buildPagoPayload } from "../utils/buildPagoPayload";
import { useCreatePago, type ParsedPagoError } from "./useCreatePago";
import type { CuentaPorPagar } from "../interfaces/cuenta-por-pagar.interface";

const LINE_ERROR_PREFIX = "pago_detalles";

/**
 * Detecta la ruta de un CAMPO de una línea (`pago_detalles.<i>.<campo>`) y
 * captura su índice (grupo 1) y el nombre del campo (grupo 2), para derivar la
 * clave del error a nivel de línea (`pago_detalles.<i>._form`) de esa misma
 * línea. Mismo mecanismo que `useStockTransferForm`.
 */
const LINE_FIELD_PATH_RE = new RegExp(`^${LINE_ERROR_PREFIX}\\.(\\d+)\\.(.+)$`);

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
    isError: isErrorSuppliers,
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
  //
  // `useSuppliers` no expone `hasLoaded`, y ensancharlo tocaría un hook de otro
  // módulo: se usa como equivalente que la lista traiga elementos — si hay
  // proveedores en mano, la carga inicial ya ocurrió; si viene vacía, el error es
  // de carga inicial (y una lista legítimamente vacía cae en `missingItems`).
  const isErrorFormData =
    (isErrorSuppliers && suppliers.length === 0) ||
    (isErrorBankAccounts && !hasLoadedBankAccounts);

  // ── Estado de UI ─────────────────────────────────────────────────────────
  // Errores indexados por ruta ("total_pagado", "pago_detalles.0.importe_aplicado").
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
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

  // ── Helpers de errores ───────────────────────────────────────────────────
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      // Al limpiar el error de un CAMPO de una línea se limpia también el de
      // LÍNEA (`_form`): si el usuario edita la línea la está corrigiendo, así
      // que el aviso del backend deja de ser vigente.
      const match = LINE_FIELD_PATH_RE.exec(path);
      const lineFormKey =
        match && match[2] !== "_form"
          ? `${LINE_ERROR_PREFIX}.${match[1]}._form`
          : null;
      // ...y también el del TOTAL. El cuadre del backend llega en la llave
      // `total_pagado`, que es un valor DERIVADO y por tanto no tiene input
      // propio cuyo `onChange` pudiera limpiarlo: sin esto, el usuario corregía
      // los importes, veía el total recalcularse y el mensaje "no cuadra" se
      // quedaba pegado hasta el siguiente envío. Cualquier edición de línea
      // cambia la suma, así que invalida el aviso.
      const totalKey = match ? "total_pagado" : null;
      const keys = [path, lineFormKey, totalKey].filter(
        (key): key is string => key !== null,
      );
      if (!keys.some((key) => key in prev)) {
        return prev;
      }
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  /** Descarta TODOS los errores de línea (y el banner). Se usa al quitar o
   *  reemplazar líneas, porque ambas operaciones recorren los índices. */
  const resetLineErrors = () => {
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(LINE_ERROR_PREFIX)) next[key] = value;
      }
      return next;
    });
    setServerBanner(null);
  };

  // ── Reparto del error del backend ────────────────────────────────────────
  const handleServerError = (parsed: ParsedPagoError) => {
    const next: Record<string, string> = {};

    (Object.keys(parsed.fieldErrors) as (keyof typeof parsed.fieldErrors)[]).forEach(
      (field) => {
        const message = parsed.fieldErrors[field];
        if (message) next[field] = message;
      },
    );

    Object.entries(parsed.lineErrors).forEach(([index, fields]) => {
      Object.entries(fields).forEach(([field, message]) => {
        next[`${LINE_ERROR_PREFIX}.${index}.${field}`] = message;
      });
    });

    setErrors((prev) => ({ ...prev, ...next }));

    const hasFieldOrLine =
      Object.keys(parsed.fieldErrors).length > 0 ||
      Object.keys(parsed.lineErrors).length > 0;
    const detail =
      parsed.formError ??
      (hasFieldOrLine ? "Revisa los campos marcados." : "Intenta de nuevo.");
    // El alta es atómica: se le dice al usuario explícitamente que NADA quedó
    // registrado, para que no busque un pago a medias ni reintente creyendo que
    // duplicará algo.
    setServerBanner(`No se registró ningún pago. ${detail}`);
  };

  const { mutateAsync: createPagoMutation, isPending: isCreating } =
    useCreatePago(handleServerError);

  // ── Formulario ───────────────────────────────────────────────────────────
  const defaultValues = useMemo<PagoFormValues>(() => createEmptyPagoForm(), []);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      const parsed = PagoFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }
      setErrors({});

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
        setErrors({});
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
    setErrors({});
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

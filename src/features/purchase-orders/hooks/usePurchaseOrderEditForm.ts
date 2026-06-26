"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState, type FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import {
  PurchaseOrderEditSchema,
  type PurchaseOrderEditFormValues,
} from "../schemas/purchase-order-edit.schema";

interface UsePurchaseOrderEditFormParams {
  /** Orden existente que se está editando. Sus campos pre-pueblan el formulario. */
  initialData: PurchaseOrder;
  /**
   * Encabezado ya capturado en una visita previa al Step 1 (p. ej. tras pulsar
   * "Volver" desde la revisión). Cuando existe, tiene prioridad sobre
   * `initialData` para sembrar los valores por defecto, de modo que los cambios
   * del usuario sobreviven el viaje de ida y vuelta entre pasos.
   */
  initialHeader?: PurchaseOrderEditFormValues;
  onboardingData: PurchaseOrderOnboardingData;
  /** Llamado cuando el formulario es válido. Recibe los campos del encabezado. */
  onSuccess: (header: PurchaseOrderEditFormValues) => void;
}

/**
 * Rutas de campo (planas) del formulario de edición.
 * A diferencia del Step 1 de creación, no se anidan bajo `orden_compra`.
 */
export type EditFieldPath =
  | "sucursal"
  | "proveedor"
  | "moneda"
  | "fecha_oc"
  | "referencia"
  | "observaciones";

type EditErrorMap = Partial<Record<EditFieldPath, string>>;

/** Normaliza una fecha del API (ISO o `YYYY-MM-DD`) al formato de `<input type="date">`. */
const toDateInputValue = (value: string | null | undefined): string =>
  value ? value.slice(0, 10) : "";

export function usePurchaseOrderEditForm({
  initialData,
  initialHeader,
  onboardingData,
  onSuccess,
}: UsePurchaseOrderEditFormParams) {
  const [clientErrors, setClientErrors] = useState<EditErrorMap>({});
  const [serverErrors, setServerErrors] = useState<EditErrorMap>({});

  // ── Default values ──────────────────────────────────────────────────────
  // Si ya hay un encabezado capturado (regreso desde la revisión), se siembra
  // desde él para no perder los cambios; en la primera visita, desde la orden.
  const defaultValues = useMemo<PurchaseOrderEditFormValues>(() => {
    if (initialHeader) {
      return initialHeader;
    }
    return {
      sucursal: initialData.sucursal,
      proveedor: initialData.proveedor,
      moneda: initialData.moneda,
      fecha_oc: toDateInputValue(initialData.fecha_oc),
      referencia: initialData.referencia ?? "",
      observaciones: initialData.observaciones ?? "",
    };
  }, [initialData, initialHeader]);

  // ── Opciones de selectores derivadas de los datos de onboarding ─────────
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

  const proveedorOptions = useMemo(() => {
    const options = [
      { value: 0, label: "Seleccionar proveedor…" },
      ...onboardingData.busqueda.proveedores.map((p) => ({
        value: p.id,
        label: `${p.codigo} — ${p.nombre}`,
      })),
    ];
    // La lista de proveedores proviene del bucket de búsqueda (no del catálogo
    // completo), por lo que puede no incluir al proveedor actual de la orden.
    // Se inyecta una opción de respaldo con el nombre ya disponible en la orden
    // para que el select muestre el valor real en lugar del placeholder.
    const hasCurrent = onboardingData.busqueda.proveedores.some(
      (p) => p.id === initialData.proveedor,
    );
    if (!hasCurrent && initialData.proveedor) {
      options.push({
        value: initialData.proveedor,
        label: initialData.proveedor_nombre,
      });
    }
    return options;
  }, [onboardingData, initialData]);

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

  // ── Helpers de error ────────────────────────────────────────────────────

  const getError = (path: EditFieldPath): FormFieldError | undefined => {
    const message = serverErrors[path] ?? clientErrors[path];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  const clearFieldErrors = (path: EditFieldPath) => {
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

  /** Coacciona el valor de un select/input a número para los campos numéricos. */
  const coerceNumeric = (path: EditFieldPath, raw: string): string | number => {
    const numericPaths: EditFieldPath[] = ["sucursal", "proveedor", "moneda"];
    if (numericPaths.includes(path)) {
      const n = Number(raw);
      return Number.isNaN(n) ? 0 : n;
    }
    return raw;
  };

  // ── Validación a nivel de campo (on blur) ───────────────────────────────

  const validateField = (path: EditFieldPath) => {
    const fullValues = form.state.values;
    const parsed = PurchaseOrderEditSchema.safeParse(fullValues);

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

    setClientErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    return true;
  };

  // ── Definición del formulario ───────────────────────────────────────────

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const parsed = PurchaseOrderEditSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: EditErrorMap = {};
        parsed.error.issues.forEach((issue) => {
          const path = issue.path.join(".") as EditFieldPath;
          if (!nextErrors[path]) {
            nextErrors[path] = issue.message;
          }
        });
        setClientErrors(nextErrors);
        return;
      }

      // El output validado son los campos del encabezado; los detalles se
      // agregan en el Step 3 al armar el body completo del PUT.
      onSuccess(parsed.data);
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
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

"use client";

/**
 * Hook de formulario para la creación y edición de proveedores.
 *
 * Arquitectura:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  useSupplierForm                                                │
 * │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
 * │  │ useSatInfo  │  │ useCurrencies│  │ useWorkspaceStore    │   │
 * │  │ (catálogos) │  │ (monedas)    │  │ (empresa activa)     │   │
 * │  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘   │
 * │         │                │                       │               │
 * │         ▼                ▼                       ▼               │
 * │  ┌─────────────────────────────────────────────────────────┐    │
 * │  │              TanStack Form (useForm)                     │    │
 * │  │  - defaultValues: emptyValues / editValues              │    │
 * │  │  - onSubmit: valida → create o update según modo        │    │
 * │  └─────────────────────────────────────────────────────────┘    │
 * │                                                                  │
 * │  Expone al componente:                                          │
 * │  - form (instancia TanStack Form para form.Field)               │
 * │  - getError / clearFieldErrors / validateField                  │
 * │  - regimenesFiscales / formasPago / metodosPago / currencies    │
 * │  - isLoadingCatalogs / isPending / isEditing                    │
 * │  - formKey para forzar remount al cambiar modo                  │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { SupplierFormSchema, SupplierFormValues } from "../schemas/supplier.schema";
import { Supplier } from "../interfaces/supplier.interface";
import { useSatInfo } from "../../sat/hooks/useSatInfo";
import { useCurrencies } from "../../currency/hooks/useCurrencies";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCreateSupplier } from "./useCreateSupplier";
import { useUpdateSupplier } from "./useUpdateSupplier";

interface UseSupplierFormParams {
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
  isRfcVerified?: boolean;
}

/** Clave del formulario que asigna cada campo del esquema Zod. */
type SupplierField = keyof SupplierFormValues;

const scrollToFirstValidationError = (formElement: HTMLFormElement, issuePaths: string[]) => {
  if (issuePaths.length === 0) {
    return;
  }

  const normalizedIssuePaths = issuePaths.filter(Boolean);
  const controls = Array.from(
    formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea"
    )
  ).filter(
    (element) =>
      Boolean(element.name) &&
      !element.disabled &&
      !(element instanceof HTMLInputElement && element.type === "hidden")
  );

  const firstInvalidControl = controls.find((control) =>
    normalizedIssuePaths.some(
      (path) =>
        path === control.name ||
        path.startsWith(`${control.name}.`) ||
        control.name.startsWith(`${path}.`)
    )
  );

  if (!firstInvalidControl) {
    return;
  }

  firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  firstInvalidControl.focus({ preventScroll: true });
};

export function useSupplierForm({ onSuccess, supplierToEdit, isRfcVerified = false }: UseSupplierFormParams) {
  // ── Referencia del formulario (scroll, reset) ──────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);

  // ── Estado de errores ───────────────────────────────────────────────────
  // Dos capas:
  //   clientErrors → validación Zod local (onBlur / onSubmit)
  //   serverErrors → errores devueltos por el backend (futuro)
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<SupplierField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<SupplierField, string>>
  >({});

  // ── Contexto de empresa activa ──────────────────────────────────────────
  // Sigue el mismo patrón que useProductForm y useCustomerForm.
  // selectedCompany.id se usa como "empresa" en el payload de creación.
  const selectedCompany = useWorkspaceStore(
    (state) => state.selectedCompany
  );

  // ── Modo edición ─────────────────────────────────────────────────────────
  const isEditing = Boolean(supplierToEdit?.id);

  // ── Catálogos externos ──────────────────────────────────────────────────
  //   useSatInfo → regimenes fiscales, formas de pago, métodos de pago
  //   useCurrencies → monedas disponibles
  const { data: satInfo, isLoading: isSatInfoLoading } = useSatInfo();
  const { data: currencies, isLoading: isCurrenciesLoading } = useCurrencies();

  // Memoriza cada catálogo para evitar re-renders innecesarios.
  // Los selectores del formulario consumen estos arreglos.
  const regimenesFiscales = useMemo(
    () => satInfo?.regimenes_fiscales ?? [],
    [satInfo]
  );
  const formasPago = useMemo(
    () => satInfo?.formas_pago ?? [],
    [satInfo]
  );
  const metodosPago = useMemo(
    () => satInfo?.metodos_pago ?? [],
    [satInfo]
  );
  const availableCurrencies = useMemo(() => currencies ?? [], [currencies]);

  // Indicador de carga combinado para mostrar skeletons si es necesario.
  const isLoadingCatalogs = isSatInfoLoading || isCurrenciesLoading;

  // ── Valores por defecto (modo creación) ─────────────────────────────────
  const emptyValues = useMemo<SupplierFormValues>(
    () => ({
      codigo: "",
      nombre: "",
      razon_social: "",
      rfc: "",
      email: "",
      telefono: "",
      contacto_principal: "",
      dias_credito: 0,
      limite_credito: "0.00",
      sat_regimen_fiscal: 1,
      sat_forma_pago: 1,
      sat_metodo_pago: 1,
      moneda: 1,
      fax: "",
    }),
    []
  );

  // ── Valores de edición (modo edición) ───────────────────────────────────
  // Se derivan del proveedor recibido por props y se normalizan los
  // catálogos SAT para evitar seleccionar IDs inexistentes.
  const editValues = useMemo<SupplierFormValues>(() => {
    if (!supplierToEdit) {
      return emptyValues;
    }

    const hasRegimen = regimenesFiscales.some(
      (item) => item.id_sat_regimen_fiscal === supplierToEdit.sat_regimen_fiscal
    );
    const hasFormaPago = formasPago.some(
      (item) => item.id_sat_forma_pago === supplierToEdit.sat_forma_pago
    );
    const hasMetodoPago = metodosPago.some(
      (item) => item.id_sat_metodo_pago === supplierToEdit.sat_metodo_pago
    );
    const hasCurrency = availableCurrencies.some(
      (item) => item.id === supplierToEdit.moneda
    );

    return {
      codigo: supplierToEdit.codigo,
      nombre: supplierToEdit.nombre,
      razon_social: supplierToEdit.razon_social,
      rfc: supplierToEdit.rfc,
      email: supplierToEdit.email,
      telefono: supplierToEdit.telefono,
      contacto_principal: supplierToEdit.contacto_principal,
      dias_credito: supplierToEdit.dias_credito,
      limite_credito: supplierToEdit.limite_credito,
      sat_regimen_fiscal: hasRegimen
        ? supplierToEdit.sat_regimen_fiscal
        : 1,
      sat_forma_pago: hasFormaPago
        ? supplierToEdit.sat_forma_pago
        : 1,
      sat_metodo_pago: hasMetodoPago
        ? supplierToEdit.sat_metodo_pago
        : 1,
      moneda: hasCurrency ? supplierToEdit.moneda : 1,
      fax: supplierToEdit.fax,
    };
  }, [supplierToEdit, regimenesFiscales, formasPago, metodosPago, availableCurrencies, emptyValues]);

  // ── Limpieza de errores por campo ───────────────────────────────────────
  // Se invoca en onChange del input para borrar el error tan pronto como
  // el usuario empieza a corregir el valor (UX instantánea).
  const clearFieldErrors = (field: SupplierField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ── Validación por campo (onBlur) ───────────────────────────────────────
  // Usa Zod safeParse sobre la regla individual del campo (shape[field]).
  // Si falla, asigna el mensaje de error al estado local.
  const validateField = (
    field: SupplierField,
    value: SupplierFormValues[SupplierField]
  ) => {
    const fieldSchema = SupplierFormSchema.shape[field];
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

    const message =
      parsed.error.issues[0]?.message ?? "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // ── Validación completa del formulario (onSubmit) ───────────────────────
  // Itera todos los issues de Zod y construye un mapa field → mensaje.
  // Retorna { success, issuePaths } para scroll al primer error.
  const validateForm = (values: SupplierFormValues) => {
    const parsed = SupplierFormSchema.safeParse(values);
    const nextErrors: Partial<Record<SupplierField, string>> = {};
    const issuePaths: string[] = [];

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.map((segment) => String(segment)).join(".");
        if (path) {
          issuePaths.push(path);
        }
        const field = issue.path[0] as SupplierField;
        if (!field || nextErrors[field]) return;
        nextErrors[field] = issue.message;
      });
    }

    if (!isRfcVerified) {
      nextErrors.rfc = "Debes verificar el RFC antes de continuar";
      issuePaths.push("rfc");
    }

    if (Object.keys(nextErrors).length === 0) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] as string[] };
    }

    setClientErrors(nextErrors);
    return { success: false as const, issuePaths };
  };

  // ── Adaptador de errores del backend hacia estado local ────────────────
  const setHookError = ((field: SupplierField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  }) as never;

  const { mutateAsync: createSupplier, isPending: isCreating } = useCreateSupplier({
    setError: setHookError,
  });
  const { mutateAsync: updateSupplier, isPending: isUpdating } = useUpdateSupplier(setHookError);

  // ── Obtención de error para un campo ────────────────────────────────────
  // Server errors tienen prioridad sobre client errors (el backend
  // puede devolver validaciones adicionales que deben mostrarse).
  const getError = (
    field: SupplierField
  ): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // ── Núcleo del formulario TanStack Form ─────────────────────────────────
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      // 1. Limpia errores del servidor de envíos anteriores.
      setServerErrors({});

      // 2. Valida todo el formulario contra el esquema Zod.
      const validationResult = validateForm(value);
      if (!validationResult.success) {
        if (formRef.current) {
          requestAnimationFrame(() => {
            if (!formRef.current) {
              return;
            }
            scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
          });
        }
        return;
      }

      // 3. Construye el payload base con tipado explícito.
      //    "empresa" se obtiene del contexto en lugar del formulario.
      const payload = {
        codigo: value.codigo,
        nombre: value.nombre,
        razon_social: value.razon_social,
        rfc: value.rfc,
        email: value.email,
        telefono: value.telefono,
        contacto_principal: value.contacto_principal,
        dias_credito: value.dias_credito,
        limite_credito: value.limite_credito,
        sat_regimen_fiscal: value.sat_regimen_fiscal,
        sat_forma_pago: value.sat_forma_pago,
        sat_metodo_pago: value.sat_metodo_pago,
        moneda: value.moneda,
        fax: value.fax,
        empresa: selectedCompany.id!,
      };

      // 4. Decide entre actualización o creación según el modo.
      if (isEditing && supplierToEdit) {
        const updatedSupplier = await updateSupplier({
          id: Number(supplierToEdit.id),
          ...payload,
        });

        // 5. Si la mutación falló, se detiene aquí.
        if (!updatedSupplier) {
          return;
        }

        // 6. En edición NO se resetea el formulario; se notifica al padre.
        onSuccess();
        return;
      }

      // 7. Ejecuta la mutación de creación.
      const createdSupplier = await createSupplier(payload);

      // 8. Si la mutación falló, se detiene aquí.
      if (!createdSupplier) {
        return;
      }

      // 9. Resetea el formulario a valores iniciales (solo en creación).
      form.reset(emptyValues);
      setClientErrors({});
      setServerErrors({});

      // 10. Notifica al componente padre (cierra el modal).
      onSuccess();
    },
  });

  // ── Estado de carga del submit ──────────────────────────────────────────
  const isPending = isCreating || isUpdating;

  // ── Reset manual ────────────────────────────────────────────────────────
  // Limpia errores, resetea valores y hace scroll suave al inicio del form.
  // - creación: vuelve a emptyValues
  // - edición: vuelve a los valores cargados del proveedor (editValues)
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  // ── Submit handler del DOM ──────────────────────────────────────────────
  // Previene el comportamiento nativo y delega en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // ── Clave para forzar remount al cambiar entre creación/edición ─────────
  const formKey = isEditing
    ? `supplier-edit-${supplierToEdit?.id ?? "ready"}`
    : "supplier-new";

  return {
    // Instancia de TanStack Form (para usar <form.Field> en el JSX)
    form,
    formRef,
    formKey,

    // Modo del formulario
    isEditing,
    supplierToEdit,

    // Utilidades de errores y validación
    getError,
    clearFieldErrors,
    validateField,

    // Catálogos externos para los selectores
    regimenesFiscales,
    formasPago,
    metodosPago,
    availableCurrencies,
    isLoadingCatalogs,

    // Estado del formulario
    isPending,

    // Handlers
    handleFormSubmit,
    handleReset,
  };
}

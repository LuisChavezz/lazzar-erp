"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import type {
  PurchaseOrder,
  PurchaseOrderReceipt,
} from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import {
  SupplierInvoiceFormSchema,
  createEmptySupplierInvoiceForm,
  type SupplierInvoiceFormValues,
} from "../schemas/supplier-invoice.schema";
import { buildSupplierInvoicePayload } from "../utils/buildSupplierInvoicePayload";
import type { ParsedSupplierInvoiceError } from "../utils/parseSupplierInvoiceError";
import {
  lineFromReceptionOption,
  type ReceptionLineOption,
} from "../utils/receptionLineOptions";
import { useCreateSupplierInvoice } from "./useCreateSupplierInvoice";

const LINE_ERROR_PREFIX = "factura_proveedor_detalles";

/**
 * Ruta de un CAMPO de un renglón (`factura_proveedor_detalles.<i>.<campo>`):
 * captura índice y campo para limpiar también el `_form` de ese renglón. Mismo
 * mecanismo que `usePolizaForm`.
 */
const LINE_FIELD_PATH_RE = new RegExp(`^${LINE_ERROR_PREFIX}\\.(\\d+)\\.(.+)$`);

/**
 * Ruta de un issue de Zod → `name` del control en el DOM
 * (`["factura_proveedor_detalles", 0, "cantidad"]` →
 * `factura_proveedor_detalles[0].cantidad`), para `scrollToFirstValidationError`.
 * Copia exacta de la de `usePolizaForm`.
 */
const fieldNameFromIssuePath = (path: readonly PropertyKey[]): string =>
  path.reduce<string>(
    (name, segment) =>
      typeof segment === "number"
        ? `${name}[${segment}]`
        : name
          ? `${name}.${String(segment)}`
          : String(segment),
    "",
  );

export function useSupplierInvoiceForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ── Estado de UI ─────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  // Cambia en CADA rechazo, para que la vista se desplace al banner aunque el
  // texto sea idéntico al anterior. Mismo recurso que `usePolizaForm`.
  const [bannerErrorTick, setBannerErrorTick] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Claves estables por renglón. Arranca vacío: los siembra el selector.
  const lineKeyCounter = useRef(0);
  const [lineKeys, setLineKeys] = useState<number[]>([]);

  // ── Helpers de errores ───────────────────────────────────────────────────
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      const match = LINE_FIELD_PATH_RE.exec(path);
      const lineFormKey =
        match && match[2] !== "_form" ? `${LINE_ERROR_PREFIX}.${match[1]}._form` : null;
      const keys = [path, lineFormKey].filter((key): key is string => key !== null);
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  /** Descarta los errores de renglón (y el banner): quitar o reemplazar renglones recorre los índices. */
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
  const handleServerError = (parsed: ParsedSupplierInvoiceError) => {
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
    // El alta es atómica: NADA quedó guardado —ni la factura, ni sus partidas, ni
    // una cuenta por pagar si se iba a registrar—.
    setServerBanner(`No se guardó la factura. ${detail}`);
    setBannerErrorTick((tick) => tick + 1);
  };

  const { mutateAsync: createMutation, isPending: isCreating } =
    useCreateSupplierInvoice(handleServerError);

  // ── Formulario ───────────────────────────────────────────────────────────
  // Memoizado porque `useForm` recibe `defaultValues` en cada `update` (mismo
  // motivo que en `usePolizaForm`).
  const defaultValues = useMemo<SupplierInvoiceFormValues>(
    () => createEmptySupplierInvoiceForm(),
    [],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      const parsed = SupplierInvoiceFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        scrollToFirstValidationError(
          formRef.current,
          parsed.error.issues.map((issue) => fieldNameFromIssuePath(issue.path)),
        );
        return;
      }
      setErrors({});
      setIsSubmitting(true);

      try {
        await createMutation(buildSupplierInvoicePayload(parsed.data));
        // Valores frescos en cada limpieza (ver `usePolizaForm`).
        form.reset(createEmptySupplierInvoiceForm());
        setLineKeys([]);
        setErrors({});
        setServerBanner(null);
        onSuccess?.();
      } catch {
        // El error ya se repartió en `handleServerError` y el toast salió de la
        // mutación. Se captura para que el rechazo de `mutateAsync` no escape por
        // `void form.handleSubmit()` como unhandled rejection.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ── Orden de compra y recepción ──────────────────────────────────────────
  /**
   * Fija la OC y DERIVA de ella proveedor, moneda y sucursal.
   *
   * No se capturan: la factura es del proveedor de la orden, en su moneda, y la
   * CxP que nazca al registrar llevará ese proveedor. Dejarlos editables permitiría
   * facturar una OC a nombre de otro proveedor, algo que el backend no valida.
   *
   * La tasa de IVA se siembra con el `porcentaje_iva` de la OC SOLO si llega Y es
   * mayor a cero. Si no llega es porque el backend elimina los financieros para
   * roles sin visibilidad. Si llega en `0.00` no se puede distinguir una compra
   * exenta de una OC que nunca capturó la tasa (`porcentaje_iva` tiene
   * `default=0.00` en el modelo, y en datos reales las OC lo traen así): sembrar
   * ese cero facturaría sin impuesto sin que nadie lo decidiera. En ambos casos
   * queda vacía y el usuario captura la tasa —incluido un 0 explícito—.
   *
   * Cambiar de OC VACÍA la recepción y los renglones: pertenecen a la anterior y
   * el backend rechazaría el alta completa.
   */
  const handleOcChange = (oc: PurchaseOrder) => {
    form.setFieldValue("oc", oc.id);
    form.setFieldValue("oc_folio", oc.folio ?? `OC #${oc.id}`);
    // `proveedor` es `SET_NULL` en la OC aunque el tipo lo declare `number`.
    form.setFieldValue("proveedor", oc.proveedor || 0);
    form.setFieldValue("proveedor_nombre", oc.proveedor_nombre ?? "");
    form.setFieldValue("moneda", oc.moneda || 0);
    form.setFieldValue("moneda_codigo", oc.moneda_codigo ?? "");
    form.setFieldValue("sucursal", oc.sucursal || 0);
    const tasaOc = oc.porcentaje_iva !== undefined ? Number(oc.porcentaje_iva) : NaN;
    const siembraTasa = Number.isFinite(tasaOc) && tasaOc > 0;
    form.setFieldValue("tasa_iva", siembraTasa ? tasaOc.toFixed(2) : "");
    form.setFieldValue("recepcion", 0);
    form.setFieldValue("recepcion_folio", "");
    form.setFieldValue("factura_proveedor_detalles", []);
    setLineKeys([]);
    resetLineErrors();
    ["oc", "recepcion", "proveedor", "moneda", "sucursal", "factura_proveedor_detalles"].forEach(
      clearError,
    );
    if (siembraTasa) clearError("tasa_iva");
  };

  /** Fija la recepción. Cambiarla VACÍA los renglones (son de la anterior). */
  const handleRecepcionChange = (recepcion: PurchaseOrderReceipt) => {
    form.setFieldValue("recepcion", recepcion.id);
    form.setFieldValue("recepcion_folio", recepcion.folio);
    form.setFieldValue("factura_proveedor_detalles", []);
    setLineKeys([]);
    resetLineErrors();
    clearError("recepcion");
  };

  // ── Renglones ────────────────────────────────────────────────────────────
  /** Agrega de golpe las partidas que devolvió el selector. */
  const addLines = (options: ReceptionLineOption[]) => {
    if (options.length === 0) return;
    const newKeys: number[] = [];
    options.forEach((option) => {
      form.pushFieldValue("factura_proveedor_detalles", lineFromReceptionOption(option));
      newKeys.push(lineKeyCounter.current++);
    });
    setLineKeys((prev) => [...prev, ...newKeys]);
    clearError("factura_proveedor_detalles");
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("factura_proveedor_detalles", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  // ── Submit / reset ───────────────────────────────────────────────────────
  /**
   * Envía fijando primero la INTENCIÓN. Vive en los valores del formulario
   * porque el `superRefine` exige `fecha_vencimiento` solo al registrar.
   * `setFieldValue` escribe de forma síncrona, así que `handleSubmit` ya lee el
   * valor nuevo. Mismo mecanismo que `submitAs` en pólizas.
   */
  const submitAs = (objetivo: SupplierInvoiceFormValues["estatus_objetivo"]) => {
    form.setFieldValue("estatus_objetivo", objetivo);
    void form.handleSubmit();
  };

  /**
   * Enter dentro de un campo guarda como BORRADOR: registrar genera una cuenta
   * por pagar y congela los importes, y no debe ocurrir por un Enter accidental.
   */
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    submitAs("Borrador");
  };

  const handleReset = () => {
    form.reset(createEmptySupplierInvoiceForm());
    setLineKeys([]);
    setErrors({});
    setServerBanner(null);
  };

  return {
    form,
    formRef,
    isPending,
    lineKeys,
    serverBanner,
    bannerErrorTick,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    handleOcChange,
    handleRecepcionChange,
    addLines,
    removeLine,
    submitAs,
    handleFormSubmit,
    handleReset,
  };
}

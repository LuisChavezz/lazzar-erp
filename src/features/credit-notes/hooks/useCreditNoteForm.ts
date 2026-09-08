"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import type { InvoiceDetail } from "@/src/features/invoicing/interfaces/invoice.interface";
import {
  NotaCreditoFormSchema,
  createEmptyNotaCreditoForm,
  type NotaCreditoFormValues,
  type NotaCreditoLineFormValues,
} from "../schemas/credit-note.schema";
import { buildNotaCreditoPayload } from "../utils/buildNotaCreditoPayload";
import {
  useCreateNotaCredito,
  type ParsedNotaCreditoError,
} from "./useCreateNotaCredito";

const LINE_ERROR_PREFIX = "nota_credito_detalles";

/**
 * Detecta la ruta de un CAMPO de una línea (`nota_credito_detalles.<i>.<campo>`)
 * y captura su índice (grupo 1) y el nombre del campo (grupo 2), para derivar la
 * clave del error a nivel de línea (`nota_credito_detalles.<i>._form`) de esa
 * misma línea. Mismo mecanismo que `usePaymentForm`/`useStockTransferForm`.
 */
const LINE_FIELD_PATH_RE = new RegExp(`^${LINE_ERROR_PREFIX}\\.(\\d+)\\.(.+)$`);

/**
 * Siembra una línea a partir del concepto de la factura elegido en el selector.
 *
 * Los importes arrancan con los de la factura: acreditar el concepto COMPLETO es
 * el caso normal, y dejarlos vacíos obligaría a teclear números que ya están a
 * la vista. Todos son editables, porque acreditar parcialmente un concepto es
 * igual de legítimo.
 *
 * `cantidad_facturada`/`total_facturado` conservan los valores ORIGINALES aunque
 * el usuario edite los de la nota, para que el renglón siga mostrando contra qué
 * se está acreditando.
 */
const lineFromInvoiceDetail = (
  detalle: InvoiceDetail,
): NotaCreditoLineFormValues => ({
  factura_detalle: detalle.id,
  producto_nombre: detalle.producto_nombre,
  cantidad_facturada: detalle.cantidad,
  total_facturado: detalle.total,
  cantidad: detalle.cantidad,
  precio_unitario: detalle.precio_unitario,
  impuesto: detalle.impuesto,
  subtotal: detalle.subtotal,
  total: detalle.total,
});

export function useCreditNoteForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ── Estado de UI ─────────────────────────────────────────────────────────
  // Errores indexados por ruta ("total", "nota_credito_detalles.0.cantidad").
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Claves estables por línea, para que borrar una línea intermedia no reutilice
  // el estado local de otra. Arranca vacío: las líneas las siembra el selector.
  const lineKeyCounter = useRef(0);
  const [lineKeys, setLineKeys] = useState<number[]>([]);

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
      const keys = [path, lineFormKey].filter(
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
  const handleServerError = (parsed: ParsedNotaCreditoError) => {
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
    // registrado, para que no busque una nota a medias ni reintente creyendo que
    // duplicará algo. Cuando la nota iba a emitirse, eso incluye el saldo de la
    // cuenta por cobrar, que tampoco se movió.
    setServerBanner(`No se registró ninguna nota de crédito. ${detail}`);
  };

  const { mutateAsync: createNotaMutation, isPending: isCreating } =
    useCreateNotaCredito(handleServerError);

  // ── Formulario ───────────────────────────────────────────────────────────
  const defaultValues = useMemo<NotaCreditoFormValues>(
    () => createEmptyNotaCreditoForm(),
    [],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      const parsed = NotaCreditoFormSchema.safeParse(value);
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
        await createNotaMutation(buildNotaCreditoPayload(parsed.data));
        // Valores frescos en cada limpieza: reusar un objeto memoizado haría que
        // una sola instancia de `nota_credito_detalles` respaldara el montaje
        // inicial y todos los `reset`, y bastaría una escritura en sitio del
        // arreglo para que la siguiente alta arrancara con las líneas de la nota
        // anterior.
        form.reset(createEmptyNotaCreditoForm());
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

  // ── Factura ──────────────────────────────────────────────────────────────
  /**
   * Fija la factura a acreditar a partir de la CUENTA POR COBRAR elegida.
   *
   * El selector trabaja sobre CxC y no sobre facturas porque el renglón de CxC
   * trae de una sola consulta todo lo que la nota necesita: el id y el folio de
   * la factura, el cliente (que el backend exige que coincida con el de la
   * factura), la moneda para formatear y el `saldo`, que es el techo de `total`.
   *
   * Cambiar de factura VACÍA las líneas: los `factura_detalle` de la factura
   * anterior no pertenecen a la nueva, y el backend rechaza el alta completa si
   * alguno no corresponde.
   */
  const handleFacturaChange = (cuenta: CuentaPorCobrar) => {
    form.setFieldValue("factura", cuenta.factura_id);
    form.setFieldValue("cliente", cuenta.cliente);
    form.setFieldValue("factura_folio", cuenta.factura_folio);
    form.setFieldValue("moneda_codigo", cuenta.moneda_codigo);
    form.setFieldValue("cxc_saldo", cuenta.saldo);
    form.setFieldValue("nota_credito_detalles", []);
    setLineKeys([]);
    resetLineErrors();
    clearError("factura");
    clearError("cliente");
    // El techo depende del saldo de la CxC recién elegida, así que un error de
    // "supera el saldo" de la factura anterior ya no aplica.
    clearError("total");
  };

  // ── Líneas ───────────────────────────────────────────────────────────────
  /** Agrega de golpe los conceptos de factura que el selector devolvió. */
  const addLines = (detalles: InvoiceDetail[]) => {
    if (detalles.length === 0) return;
    const newKeys: number[] = [];
    detalles.forEach((detalle) => {
      form.pushFieldValue(
        "nota_credito_detalles",
        lineFromInvoiceDetail(detalle),
      );
      newKeys.push(lineKeyCounter.current++);
    });
    setLineKeys((prev) => [...prev, ...newKeys]);
    // Agregar al FINAL no recorre los índices existentes, así que sus errores
    // siguen siendo válidos y se conservan a propósito. Solo se limpia el error
    // del arreglo (conceptos repetidos), que acaba de recalcularse.
    clearError("nota_credito_detalles");
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("nota_credito_detalles", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  // ── Submit / reset ───────────────────────────────────────────────────────
  /**
   * Envía el formulario fijando primero el `estatus` con el que se va a crear.
   *
   * El estatus vive en los VALORES del formulario (no como argumento del envío)
   * porque el `superRefine` del esquema aplica reglas distintas según cuál sea:
   * a un borrador no se le exige todavía un total mayor a 0 ni caber en el saldo
   * de la cuenta por cobrar. `setFieldValue` escribe en el store de forma
   * síncrona, así que el `handleSubmit` de la línea siguiente ya lee el valor
   * nuevo.
   */
  const submitAs = (estatus: NotaCreditoFormValues["estatus"]) => {
    form.setFieldValue("estatus", estatus);
    void form.handleSubmit();
  };

  /**
   * `onSubmit` nativo del `<form>`: se dispara al pulsar Enter dentro de un
   * campo. Guarda como BORRADOR, la opción inocua — emitir mueve el saldo de una
   * cuenta por cobrar y no debe poder ocurrir por un Enter accidental; para eso
   * está su botón explícito.
   */
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    submitAs("Borrador");
  };

  const handleReset = () => {
    form.reset(createEmptyNotaCreditoForm());
    setLineKeys([]);
    setErrors({});
    setServerBanner(null);
  };

  return {
    form,
    isPending,
    lineKeys,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    handleFacturaChange,
    addLines,
    removeLine,
    submitAs,
    handleFormSubmit,
    handleReset,
  };
}

"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import {
  SupplierInvoiceEditFormSchema,
  motivoBloqueoRegistro,
  toastIdBloqueoRegistro,
  type SupplierInvoiceEditFormValues,
} from "../schemas/supplier-invoice.schema";
import { buildSupplierInvoiceUpdatePayload } from "../utils/buildSupplierInvoicePayload";
import type { ParsedSupplierInvoiceError } from "../utils/parseSupplierInvoiceError";
import { useUpdateSupplierInvoice } from "./useUpdateSupplierInvoice";

const valuesFromFactura = (factura: FacturaProveedor): SupplierInvoiceEditFormValues => ({
  folio: factura.folio ?? "",
  fecha_vencimiento: factura.fecha_vencimiento ?? "",
  observaciones: factura.observaciones ?? "",
  estatus_objetivo: "Borrador",
});

/**
 * Edición de CABECERA de una factura de proveedor en `Borrador`.
 *
 * Solo `folio`, `fecha_vencimiento` y `observaciones`, más la intención
 * (guardar o registrar). Los renglones son de escritura solo en el alta, y con
 * ellos quedan fijos los importes, la OC, la recepción, el proveedor y la moneda:
 * no se ofrecen porque ningún PATCH podría cambiarlos con coherencia.
 *
 * Registrar desde aquí es un `PATCH { ..., estatus: "Registrada" }`: el backend
 * genera la CxP en `perform_update`. La misma regla de `fecha_vencimiento` que el
 * alta sale del mismo `registrarRefine` del esquema.
 */
export function useSupplierInvoiceEditForm({
  factura,
  onSuccess,
}: {
  factura: FacturaProveedor;
  onSuccess?: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const handleServerError = (parsed: ParsedSupplierInvoiceError) => {
    const next: Record<string, string> = {};
    (Object.keys(parsed.fieldErrors) as (keyof typeof parsed.fieldErrors)[]).forEach(
      (field) => {
        const message = parsed.fieldErrors[field];
        if (message) next[field] = message;
      },
    );
    setErrors((prev) => ({ ...prev, ...next }));
    // Sin renglones en el PATCH, pero un error de un campo que este formulario no
    // pinta (proveedor, moneda...) debe verse igual: se manda al banner.
    const sinCampo = Object.keys(parsed.fieldErrors).filter(
      (field) => !["folio", "fecha_vencimiento", "observaciones"].includes(field),
    );
    const detail =
      parsed.formError ??
      (sinCampo.length > 0
        ? parsed.fieldErrors[sinCampo[0] as keyof typeof parsed.fieldErrors]
        : undefined) ??
      (Object.keys(next).length > 0 ? "Revisa los campos marcados." : "Intenta de nuevo.");
    setServerBanner(`No se guardaron los cambios. ${detail}`);
  };

  const { mutateAsync: updateMutation, isPending: isUpdating } =
    useUpdateSupplierInvoice(handleServerError);

  const defaultValues = useMemo(() => valuesFromFactura(factura), [factura]);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      // ── Guarda de REGISTRO: la misma que la acción de fila ─────────────────
      // Solo con la intención "Registrada"; guardar como borrador sigue
      // permitiendo un documento incompleto. `motivoBloqueoRegistro` es la única
      // definición: partidas y total salen de la factura guardada (no se editan
      // aquí) y folio/vencimiento/observaciones de lo CAPTURADO en pantalla, para
      // que escribir la fecha aquí mismo desbloquee el registro.
      if (value.estatus_objetivo === "Registrada") {
        const bloqueo = motivoBloqueoRegistro({
          total: factura.total,
          factura_proveedor_detalles: factura.factura_proveedor_detalles,
          folio: value.folio,
          fecha_vencimiento: value.fecha_vencimiento,
          observaciones: value.observaciones,
        });
        if (bloqueo) {
          // Mismo toast (mismo id por factura) que la fila, con el `motivo` sin la
          // instrucción de "abre Editar", que aquí no aplica.
          toast.error(bloqueo.motivo, {
            id: toastIdBloqueoRegistro(factura.id),
            duration: 9000,
          });
          // Sin partidas o con total ≤ 0 no hay nada que corregir en este
          // formulario: se corta aquí, sin PATCH. La falta de vencimiento o una
          // cabecera inválida SÍ se corrigen en pantalla, así que siguen al
          // esquema de abajo, que marca el campo y lleva el foco a él (y también
          // corta antes del PATCH).
          if (bloqueo.tipo === "sin_partidas" || bloqueo.tipo === "total_no_positivo") return;
        } else {
          // La guarda ya pasa (p. ej. se acaba de capturar la fecha): un aviso de
          // bloqueo de un intento anterior contradiría al registro en curso.
          toast.dismiss(toastIdBloqueoRegistro(factura.id));
        }
      }

      const parsed = SupplierInvoiceEditFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        scrollToFirstValidationError(
          formRef.current,
          parsed.error.issues.map((issue) => issue.path.join(".")),
        );
        return;
      }
      setErrors({});
      setIsSubmitting(true);
      try {
        await updateMutation({
          id: factura.id,
          payload: buildSupplierInvoiceUpdatePayload(parsed.data),
        });
        onSuccess?.();
      } catch {
        // Repartido en `handleServerError`; se captura para evitar un unhandled
        // rejection por `void form.handleSubmit()`.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const submitAs = (objetivo: SupplierInvoiceEditFormValues["estatus_objetivo"]) => {
    form.setFieldValue("estatus_objetivo", objetivo);
    void form.handleSubmit();
  };

  /** Enter guarda como borrador — registrar nunca por accidente. */
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    submitAs("Borrador");
  };

  return {
    form,
    formRef,
    isPending: isSubmitting || isUpdating,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    submitAs,
    handleFormSubmit,
  };
}

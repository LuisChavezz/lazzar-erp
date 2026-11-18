"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { buildReceiptFormSchema, type ReceiptFormValues } from "../schemas/receipt.schema";
import { useReceiptOnboardingData } from "./useReceiptOnboardingData";
import { useCreateReceipt } from "./useCreateReceipt";
import type {
  ReceiptOrderCandidate,
  ReceiptCreatePayload,
  ReceiptCreatePurchaseOrderDetalle,
  ReceiptCreateProductionOrderDetalle,
} from "../interfaces/receipt-onboarding.interface";
import {
  almacenesDeSucursal,
  almacenPreseleccionado,
} from "@/src/features/purchase-orders/utils/purchaseOrderDelivery";
import { tieneCantidadRecibida } from "../utils/receiptQuantities";
import {
  candidateHasLines,
  candidateKey,
  candidateSucursalId,
} from "../utils/receiptCandidates";

interface UseReceiptFormParams {
  onSuccess: () => void;
  candidate: ReceiptOrderCandidate;
}

type ReceiptFormField = keyof ReceiptFormValues;

// Busca el primer campo inválido y mueve el viewport hasta él. Los inputs de
// cantidad no llevan `name` (`QuantitySelector`), así que un error en
// `cantidades` sin ningún campo de cabecera inválido ancla a su sección
// (`cantidadesSection`), que va después de la cabecera en el DOM (EC-893).
const scrollToFirstValidationError = (
  formElement: HTMLFormElement,
  issuePaths: string[],
  cantidadesSection: HTMLElement | null,
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
    return;
  }

  if (cantidadesSection && issuePaths.includes("cantidades")) {
    cantidadesSection.scrollIntoView({ behavior: "smooth", block: "center" });
    // Como los campos de cabecera: el foco va a la primera cantidad. Sin
    // inputs (orden sin renglones o sin piezas recibibles) se queda donde está.
    cantidadesSection
      .querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }
};

// Recorre el detalle de la orden y construye los renglones del payload,
// descartando los que no tengan una cantidad recibida positiva. El tipo de
// orden sólo afecta la forma del renglón (`buildRow`), que cada rama de
// `onSubmit` define con su propia clave de id de detalle.
function reduceDetalle<D extends { id: number }, T>(
  detalle: D[],
  cantidades: ReceiptFormValues["cantidades"],
  buildRow: (item: D, cantidadRecibida: string) => T,
): T[] {
  return detalle.reduce<T[]>((acc, item) => {
    const cantidad = cantidades[String(item.id)];
    // Misma regla que el schema ("al menos una"): ver `tieneCantidadRecibida`.
    if (cantidad === undefined || !tieneCantidadRecibida(cantidad)) return acc;
    acc.push(buildRow(item, cantidad));
    return acc;
  }, []);
}

export function useReceiptForm({ onSuccess, candidate }: UseReceiptFormParams) {
  // ── Catálogos desde onboarding ────────────────────────────────────────
  const { onboardingData } = useReceiptOnboardingData();
  const allWarehouses = onboardingData?.catalogos.almacenes ?? [];
  // Solo se ofrecen los almacenes de la sucursal de la orden (EC-796), que
  // son los únicos que el backend acepta al recibir, sea OC u OP (compara
  // contra `oc.sucursal` u `op.sucursal`, o la de la SM de OB/OR); los que no
  // tienen sucursal también los rechaza, así que quedan fuera.
  const warehouses = almacenesDeSucursal(allWarehouses, candidateSucursalId(candidate));

  // La SM de OB/OR se recibe sin renglones (`detalle: []`, EC-912): ahí no se
  // exige ninguna cantidad.
  const conRenglones = candidateHasLines(candidate);
  const formSchema = buildReceiptFormSchema({ conRenglones });

  // Almacén destino elegido en la OC, si está entre los ofrecidos. Se calcula
  // UNA vez al montar (el formulario se monta de nuevo con cada orden elegida):
  // un refetch del catálogo nunca pisa lo que el usuario haya elegido después.
  const [almacenInicial] = useState(() =>
    candidate.type === "compra"
      ? almacenPreseleccionado(candidate.order.almacen_id, warehouses)
      : 0,
  );

  // ── Mutación ──────────────────────────────────────────────────────────
  const createReceiptMutation = useCreateReceipt();

  // ── Referencia del formulario ─────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);
  // Sección de cantidades (o su aviso, si la orden no trae renglones): destino
  // del scroll cuando el error está en `cantidades`.
  const cantidadesRef = useRef<HTMLElement | null>(null);

  // ── Errores de validación ─────────────────────────────────────────────
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ReceiptFormField, string>>
  >({});

  // ── Valores por defecto ───────────────────────────────────────────────
  const defaultValues = useMemo<ReceiptFormValues>(
    () => ({
      almacen: almacenInicial,
      serie_codigo: "",
      remision: "",
      factura_referencia: "",
      observaciones: "",
      cantidades: {},
    }),
    [almacenInicial],
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
    const fieldSchema = formSchema.shape[field];
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
    const parsed = formSchema.safeParse(values);
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
        scrollToFirstValidationError(
          formRef.current!,
          issuePaths,
          cantidadesRef.current,
        );
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

      // Campos de cabecera compartidos (idénticos para ambos tipos de orden).
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

      switch (candidate.type) {
        case "compra": {
          const detalle = reduceDetalle<
            typeof candidate.order.detalle[number],
            ReceiptCreatePurchaseOrderDetalle
          >(candidate.order.detalle, value.cantidades, (d, cantidad_recibida) => ({
            orden_compra_detalle: d.id,
            cantidad_recibida,
          }));

          payload = {
            recepcion: {
              orden_compra: candidate.order.id,
              ...recepcionBase,
            },
            detalle,
          };
          break;
        }
        case "produccion": {
          const detalle = reduceDetalle<
            typeof candidate.order.detalle[number],
            ReceiptCreateProductionOrderDetalle
          >(candidate.order.detalle, value.cantidades, (d, cantidad_recibida) => ({
            orden_produccion_detalle: d.id,
            cantidad_recibida,
            producto_variante: d.producto_variante_id ?? null,
          }));

          payload = {
            recepcion: {
              orden_produccion: candidate.order.id,
              // SM de esta OP: misma recepción de OP, y el backend cierra la SM.
              ...(candidate.salidaMaquila
                ? { salida_maquila: candidate.salidaMaquila.id }
                : {}),
              ...recepcionBase,
            },
            detalle,
          };
          break;
        }
        case "salida-maquila":
          // SM de OB/OR: solo cabecera; no mueve inventario.
          payload = {
            recepcion: {
              salida_maquila: candidate.salidaMaquila.id,
              ...recepcionBase,
            },
            detalle: [],
          };
          break;
      }

      createReceiptMutation.mutate(payload, {
        onSuccess: () => {
          form.reset(defaultValues);
          onSuccess();
        },
      });
    },
  });

  // ── Cambio de una cantidad ────────────────────────────────────────────
  // Guarda el valor del renglón y quita el error de `cantidades` solo si, con
  // el cambio, ya hay al menos una cantidad recibida: un "−" en 0 o un "+"
  // topado no lo borran (el formulario seguiría siendo inválido).
  const handleCantidadChange = (lineId: number, valor: string) => {
    const key = String(lineId);
    form.setFieldValue(`cantidades.${key}`, valor);
    const cantidades = { ...form.state.values.cantidades, [key]: valor };
    if (Object.values(cantidades).some(tieneCantidadRecibida)) {
      clearFieldErrors("cantidades");
    }
  };

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
  const formKey = `receipt-${candidateKey(candidate)}`;

  return {
    form,
    formRef,
    cantidadesRef,
    formKey,
    isPending: createReceiptMutation.isPending,
    warehouses,
    conRenglones,
    candidate,
    getError,
    clearFieldErrors,
    validateField,
    handleCantidadChange,
    handleReset,
    handleFormSubmit,
  };
}

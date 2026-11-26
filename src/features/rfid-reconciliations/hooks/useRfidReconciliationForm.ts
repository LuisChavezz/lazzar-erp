"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import type { ReceiptOnboardingData } from "@/src/features/receipts/interfaces/receipt-onboarding.interface";
import { candidateSucursalId } from "@/src/features/receipts/utils/receiptCandidates";
import { receiptSeriePreseleccionada, receiptSeriesOfrecidas } from "@/src/features/receipts/utils/receiptSeries";
import {
  almacenesDeSucursal,
  almacenPreseleccionado,
} from "@/src/features/purchase-orders/utils/purchaseOrderDelivery";
import type { RfidReconciliation } from "../interfaces/rfid-reconciliation.interface";
import {
  buildCreateRfidReconciliationPayload,
  type RfidReconciliationCandidate,
} from "../utils/rfidReconciliationPayload";
import {
  buildRfidReconciliationFormSchema,
  type RfidReconciliationFormField,
  type RfidReconciliationFormValues,
} from "../schemas/rfidReconciliation.schema";
import { useCreateRfidReconciliation } from "./useCreateRfidReconciliation";

export type { RfidReconciliationCandidate };

interface UseRfidReconciliationFormParams {
  candidate: RfidReconciliationCandidate;
  onboardingData: ReceiptOnboardingData | undefined;
  onCreated: (created: RfidReconciliation) => void;
}

/**
 * Paso 2 del alta: almacén, serie y referencias del encuadre. Igual que en
 * Nueva Recepción, solo se ofrecen los almacenes y series de la sucursal de la
 * orden, y el almacén de la OC se preselecciona si está entre ellos. Se monta
 * de nuevo con cada orden elegida, así que lo preseleccionado se calcula una
 * vez.
 */
export function useRfidReconciliationForm({ candidate, onboardingData, onCreated }: UseRfidReconciliationFormParams) {
  const sucursalId = candidateSucursalId(candidate);
  const warehouses = almacenesDeSucursal(onboardingData?.catalogos.almacenes ?? [], sucursalId);
  const series = receiptSeriesOfrecidas(onboardingData?.catalogos.series_recepcion ?? [], sucursalId);
  const schema = buildRfidReconciliationFormSchema(series);

  const [initialValues] = useState<RfidReconciliationFormValues>(() => ({
    almacen: candidate.type === "compra" ? almacenPreseleccionado(candidate.order.almacen_id, warehouses) : 0,
    serie_codigo: receiptSeriePreseleccionada(series),
    remision: "",
    factura_referencia: "",
    observaciones: "",
  }));

  const { getError, setServerFieldError, clearFieldErrors, replaceClientErrors, clearServerErrors } =
    useFormFieldErrors<RfidReconciliationFormField>();
  const mutation = useCreateRfidReconciliation({ onFieldError: setServerFieldError, onSuccess: onCreated });

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => {
      if (mutation.isPending) return;
      clearServerErrors();
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        const errors: Partial<Record<RfidReconciliationFormField, string>> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as RfidReconciliationFormField;
          errors[field] ??= issue.message;
        }
        replaceClientErrors(errors);
        return;
      }
      replaceClientErrors({});
      mutation.mutate(buildCreateRfidReconciliationPayload(candidate, parsed.data));
    },
  });

  return { form, warehouses, series, getError, clearFieldErrors, isPending: mutation.isPending };
}

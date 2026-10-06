"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import {
  uploadSupplierInvoicePdfMutationKey,
  type UploadSupplierInvoicePdfVariables,
} from "./useUploadSupplierInvoicePdf";
import { downloadSupplierInvoiceMergedPdfMutationKey } from "./useDownloadSupplierInvoiceMergedPdf";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Callbacks y "en vuelo" llegan al menú por contexto, NO por la factoría de
// columnas: cambiarlos crearía funciones `cell` nuevas y React remontaría todas
// las celdas (se cerraría el menú abierto de otra fila al empezar o terminar
// una subida o descarga). Los callbacks reciben el id: la vista resuelve la
// fila VIVA. Mismo patrón que `useAbsenceRowActions`.

export interface SupplierInvoiceRowActionsContextValue {
  onViewDetail: (id: number) => void;
  onEdit: (id: number) => void;
  onRegistrar: (id: number) => void;
  onCancel: (id: number) => void;
  /** Adjuntar o reemplazar el PDF del proveedor (la vista decide si confirma antes). */
  onAttachPdf: (id: number) => void;
  onDownloadMergedPdf: (id: number) => void;
  /** Ids con una subida de PDF en vuelo (`usePendingSupplierInvoicePdfIds`, calculado en la lista). */
  uploadingIds: number[];
  /** Ids con una descarga del documento fusionado en vuelo. */
  downloadingIds: number[];
}

const SupplierInvoiceRowActionsContext =
  createContext<SupplierInvoiceRowActionsContextValue | null>(null);

export const SupplierInvoiceRowActionsProvider = SupplierInvoiceRowActionsContext.Provider;

export function useSupplierInvoiceRowActionsContext(): SupplierInvoiceRowActionsContextValue {
  const value = useContext(SupplierInvoiceRowActionsContext);
  if (!value) {
    throw new Error(
      "Las acciones de fila de facturas de proveedor deben renderizarse dentro de un SupplierInvoiceRowActionsProvider (ver SupplierInvoiceList).",
    );
  }
  return value;
}

type PendingPdfMutation = { kind: "upload" | "download"; id: number };

const UPLOAD_KEY = uploadSupplierInvoicePdfMutationKey[0];
const DOWNLOAD_KEY = downloadSupplierInvoiceMergedPdfMutationKey[0];

/**
 * Ids de factura con una subida o descarga EN CURSO, leídos de la
 * `MutationCache` (una instancia de `useMutation` solo recuerda su última
 * llamada). UNA suscripción, llamada una vez en `SupplierInvoiceList`; llega a
 * cada menú y al detalle por el contexto / props.
 */
export function usePendingSupplierInvoicePdfIds(): {
  uploadingIds: number[];
  downloadingIds: number[];
} {
  const pending = useMutationState<PendingPdfMutation | null>({
    filters: {
      status: "pending",
      predicate: (mutation) => {
        const key = mutation.options.mutationKey?.[0];
        return key === UPLOAD_KEY || key === DOWNLOAD_KEY;
      },
    },
    select: (mutation) => {
      const key = mutation.options.mutationKey?.[0];
      if (key === UPLOAD_KEY) {
        const variables = mutation.state.variables as UploadSupplierInvoicePdfVariables;
        return { kind: "upload", id: variables.factura.id };
      }
      if (key === DOWNLOAD_KEY) {
        return { kind: "download", id: (mutation.state.variables as FacturaProveedor).id };
      }
      return null;
    },
  });

  return {
    uploadingIds: pending.filter((p) => p?.kind === "upload").map((p) => p!.id),
    downloadingIds: pending.filter((p) => p?.kind === "download").map((p) => p!.id),
  };
}

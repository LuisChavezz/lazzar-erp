"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import { Order } from "@/src/features/orders/interfaces/order.interface";
import {
  PurchaseOrderSchema,
  PurchaseOrderFormValues,
} from "../schemas/purchase-order.schema";
import { useCreatePurchaseOrder } from "../hooks/useCreatePurchaseOrder";
import { PurchaseOrderSelector } from "./PurchaseOrderSelector";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { OrdenesIcon, InfoIcon } from "@/src/components/Icons";

interface PurchaseOrderFormProps {
  onSuccess: () => void;
}

type FormField = keyof PurchaseOrderFormValues;

export function PurchaseOrderForm({ onSuccess }: PurchaseOrderFormProps) {
  const { data: session } = useSession();
  const { mutateAsync: createPurchaseOrder, isPending } = useCreatePurchaseOrder();

  // Pedido seleccionado del que se derivarán los campos
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [clientErrors, setClientErrors] = useState<Partial<Record<FormField, string>>>({});
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const clearFieldErrors = (field: FormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateField = (field: FormField, value: string) => {
    const fieldSchema = PurchaseOrderSchema.shape[field];
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

  const getError = (field: FormField) => {
    const message = clientErrors[field];
    return message ? { message } : undefined;
  };

  const form = useForm({
    defaultValues: {
      fecha_entrega_estimada: "",
      observaciones: "",
    },
    onSubmit: async ({ value }) => {
      // Validar selección de pedido
      if (!selectedOrder) {
        setSelectionError("Debes seleccionar un pedido");
        return;
      }
      setSelectionError(null);

      // Validar formulario con Zod
      const parsed = PurchaseOrderSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<FormField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as FormField;
          if (!field || nextErrors[field]) return;
          nextErrors[field] = issue.message;
        });
        setClientErrors(nextErrors);
        return;
      }

      const now = new Date().toISOString().split("T")[0];
      const userId = Number(session?.user?.id ?? 0);

      await createPurchaseOrder({
        folio: "",
        referencia: selectedOrder.oc ?? "",
        fecha_oc: now,
        fecha_autorizacion: null,
        fecha_entrega_estimada: value.fecha_entrega_estimada,
        estatus: 1,
        subtotal: selectedOrder.subtotal,
        descuento: selectedOrder.descuento_global,
        impuestos: "0",
        total: selectedOrder.gran_total,
        observaciones: value.observaciones,
        activo: true,
        empresa: selectedOrder.empresa,
        sucursal: selectedOrder.sucursal,
        proveedor: 0,
        solicitud_compra: 0,
        moneda: selectedOrder.moneda,
        usuario: userId,
        pedido: selectedOrder.id,
      });

      form.reset();
      setSelectedOrder(null);
      onSuccess();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <fieldset
        disabled={isPending}
        className={`space-y-6 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}
      >
        {/* Sección: Selección de pedido */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <OrdenesIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Seleccionar Pedido
              </h3>
              <p className="text-xs text-slate-500">
                La orden de compra se creará a partir del pedido elegido
              </p>
            </div>
          </div>
          <div className="p-5">
            <PurchaseOrderSelector
              selectedOrderId={selectedOrder?.id ?? null}
              onSelect={(order) => {
                setSelectedOrder(order);
                setSelectionError(null);
              }}
            />
            {selectionError && (
              <p className="text-xs text-red-500 mt-2 font-medium">{selectionError}</p>
            )}
          </div>
        </section>

        {/* Sección: Campos del formulario */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <InfoIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Detalles de la Orden
              </h3>
              <p className="text-xs text-slate-500">
                Completa los datos adicionales requeridos
              </p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 gap-5">
            <form.Field name="fecha_entrega_estimada">
              {(field) => (
                <FormInput
                  type="date"
                  label="Fecha de Entrega Estimada"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldErrors("fecha_entrega_estimada");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_entrega_estimada", field.state.value);
                  }}
                  error={getError("fecha_entrega_estimada")}
                />
              )}
            </form.Field>

            <form.Field name="observaciones">
              {(field) => (
                <FormTextarea
                  label="Observaciones"
                  placeholder="Notas adicionales sobre la orden de compra..."
                  rows={3}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldErrors("observaciones");
                  }}
                  onBlur={() => field.handleBlur()}
                  error={getError("observaciones")}
                />
              )}
            </form.Field>
          </div>
        </section>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton
            onClick={() => {
              form.reset();
              setSelectedOrder(null);
              setClientErrors({});
              setSelectionError(null);
            }}
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending} loadingLabel="Creando...">
            Crear Orden de Compra
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}

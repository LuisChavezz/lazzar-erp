"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useLineItemsFormErrors } from "@/src/hooks/useLineItemsFormErrors";
import { useAccountingCustomers } from "@/src/features/accounting-customers/hooks/useAccountingCustomers";
import type { AccountingCustomer } from "@/src/features/accounting-customers/interfaces/accounting-customer.interface";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import {
  CobroFormSchema,
  createEmptyCobroForm,
  type CobroFormValues,
  type CobroLineFormValues,
} from "../schemas/createCobro.schema";
import { useCobrableCxcs } from "./useCobrableCxcs";
import { buildCobroPayload } from "../services/actions";
import { useCreateCobro } from "./useCreateCobro";

/** Etiqueta de un cliente en el selector y en el campo una vez elegido. */
export const customerLabel = (customer: Pick<AccountingCustomer, "razon_social" | "nombre">) =>
  customer.razon_social || customer.nombre;

/** Siembra una línea a partir de la CxC elegida en el selector. */
const lineFromCuentaPorCobrar = (cuenta: CuentaPorCobrar): CobroLineFormValues => ({
  cxc: cuenta.id,
  saldo: cuenta.saldo,
  moneda_codigo: cuenta.moneda_codigo,
  factura_folio: cuenta.factura_folio || `CxC #${cuenta.id}`,
  // Arranca en el SALDO COMPLETO (el caso normal); editable para abonos parciales.
  importe_aplicado: cuenta.saldo,
  observaciones: "",
});

export function useCreateCobroForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ── Catálogos ─────────────────────────────────────────────────────────────
  // Ninguno de los dos hooks está migrado a `useGuardedQuery`: exponen el
  // `isError` crudo, así que aquí se reduce a "falló la PRIMERA carga". Un
  // refetch fallido con datos en caché no debe tirar el formulario y las líneas
  // ya capturadas.
  const {
    customers,
    hasLoaded: hasLoadedCustomers,
    isLoading: isLoadingCustomers,
    isError: isErrorCustomers,
  } = useAccountingCustomers();
  const {
    bankAccounts,
    hasLoaded: hasLoadedBankAccounts,
    isLoading: isLoadingBankAccounts,
    isError: isErrorBankAccounts,
  } = useBankAccounts();

  const isLoadingFormData = isLoadingCustomers || isLoadingBankAccounts;
  const isErrorFormData =
    (isErrorCustomers && !hasLoadedCustomers) || (isErrorBankAccounts && !hasLoadedBankAccounts);

  // `clientes-contabilidad/` ya devuelve solo activos; se filtra de nuevo por si acaso.
  const activeCustomers = customers.filter((customer) => customer.activo);

  // Solo cuentas ACTIVAS (el backend aceptaría una inactiva).
  const activeBankAccounts = bankAccounts.filter((account) => account.activo);
  const bankAccountOptions = activeBankAccounts.map((account) => ({
    value: account.id,
    label: [account.alias, account.banco_nombre, account.moneda_codigo].filter(Boolean).join(" · "),
  }));

  const missingItems: string[] = [];
  if (activeCustomers.length === 0) missingItems.push("Clientes activos");
  if (bankAccountOptions.length === 0) missingItems.push("Cuentas bancarias activas");

  // ── Estado de UI ──────────────────────────────────────────────────────────
  // Errores de cabecera y de línea, y el banner de "todo o nada" (helper
  // compartido con el alta de pagos).
  const {
    getError,
    clearError,
    resetLineErrors,
    applyValidationIssues,
    applyServerError,
    clearErrors,
    serverBanner,
    setServerBanner,
  } = useLineItemsFormErrors({
    linesKey: "cobro_detalles",
    totalField: "total_cobrado",
    bannerPrefix: "No se registró ningún cobro.",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Claves estables por línea, para que borrar una intermedia no reutilice el
  // estado local de otra.
  const lineKeyCounter = useRef(0);
  const [lineKeys, setLineKeys] = useState<number[]>([]);

  const { mutateAsync: createCobroMutation, isPending: isCreating } = useCreateCobro(applyServerError);

  // ── Formulario ────────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues: createEmptyCobroForm(),
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      // El techo de cada línea es su saldo VIGENTE, no el que traía al
      // agregarse (ver `saldoFor`).
      const parsed = CobroFormSchema.safeParse(withFreshSaldos(value));
      if (!parsed.success) {
        applyValidationIssues(parsed.error.issues);
        return;
      }
      clearErrors();
      setIsSubmitting(true);

      try {
        // Hoy el alta solo crea cobros aplicados; los borradores son EC-548.
        await createCobroMutation(buildCobroPayload(parsed.data, "Aplicado"));
        resetAll();
        onSuccess?.();
      } catch {
        // Ya repartido en `handleServerError` y avisado por toast; se captura
        // para que el rechazo no escape del `void form.handleSubmit()`.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ── Saldos vigentes de las líneas ─────────────────────────────────────────
  // Las líneas se siembran con el saldo que trajo el selector, pero ese saldo
  // puede cambiar (otro cobro sobre la misma CxC). Esta consulta es la MISMA que
  // la del selector y se refresca al montarse y tras cualquier error de saldo
  // (`useCreateCobro` invalida las CxC): la línea muestra y valida contra el
  // saldo vigente sin tocar el importe que el usuario tecleó.
  const cliente = useStore(form.store, (state) => state.values.cliente);
  const cuentaBancaria = useStore(form.store, (state) => state.values.cuenta_bancaria);
  const moneda = useStore(form.store, (state) => state.values.moneda);
  const selectedAccount = activeBankAccounts.find((account) => account.id === cuentaBancaria);
  const selectorMoneda = selectedAccount && moneda ? { id: selectedAccount.moneda, codigo: moneda } : null;
  const { byId: freshCxcs, hasLoaded: hasLoadedFreshCxcs } = useCobrableCxcs({
    clienteId: cliente,
    moneda: selectorMoneda,
  });

  /**
   * Saldo vigente de la CxC de una línea. Si la consulta ya cargó y la CxC ya no
   * aparece (`saldo_pendiente=true` solo trae saldos > 0), se liquidó: su saldo
   * es 0. Mientras no carga, el saldo con que se agregó.
   */
  const saldoFor = (line: Pick<CobroLineFormValues, "cxc" | "saldo">): string => {
    const fresh = freshCxcs.get(line.cxc);
    if (fresh) return fresh.saldo;
    return hasLoadedFreshCxcs ? "0.00" : line.saldo;
  };

  const withFreshSaldos = (values: CobroFormValues): CobroFormValues => ({
    ...values,
    cobro_detalles: values.cobro_detalles.map((line) => ({ ...line, saldo: saldoFor(line) })),
  });

  const resetAll = () => {
    // Valores frescos en cada limpieza (no un objeto compartido).
    form.reset(createEmptyCobroForm());
    setLineKeys([]);
    clearErrors();
    setServerBanner(null);
  };

  const clearLines = () => {
    form.setFieldValue("cobro_detalles", []);
    setLineKeys([]);
    resetLineErrors();
  };

  // ── Líneas ────────────────────────────────────────────────────────────────
  const addLines = (cuentas: CuentaPorCobrar[]) => {
    if (cuentas.length === 0) return;
    const newKeys = cuentas.map((cuenta) => {
      form.pushFieldValue("cobro_detalles", lineFromCuentaPorCobrar(cuenta));
      return lineKeyCounter.current++;
    });
    setLineKeys((prev) => [...prev, ...newKeys]);
    // Agregar al final no recorre índices: los errores de línea siguen válidos.
    clearError("cobro_detalles");
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("cobro_detalles", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  /**
   * Cambiar de cliente VACÍA las líneas: el backend rechaza CxC de otro cliente,
   * y las del anterior ya no aplican.
   */
  const handleClienteChange = (customer: AccountingCustomer | null) => {
    const nextId = customer?.id ?? 0;
    if (nextId === form.getFieldValue("cliente")) return;
    form.setFieldValue("cliente", nextId);
    clearLines();
    clearError("cliente");
  };

  /**
   * Cambiar de cuenta bancaria VACÍA las líneas: la cuenta fija la moneda del
   * cobro, y las CxC elegidas eran de la moneda anterior.
   */
  const handleCuentaChange = (cuentaId: number) => {
    if (cuentaId === form.getFieldValue("cuenta_bancaria")) return;
    const account = activeBankAccounts.find((item) => item.id === cuentaId);
    form.setFieldValue("cuenta_bancaria", cuentaId);
    form.setFieldValue("moneda", account?.moneda_codigo || null);
    clearLines();
    clearError("cuenta_bancaria");
  };

  // ── Submit / reset ────────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    customers: activeCustomers,
    bankAccounts: activeBankAccounts,
    bankAccountOptions,
    selectorMoneda,
    saldoFor,
    lineKeys,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    addLines,
    removeLine,
    handleClienteChange,
    handleCuentaChange,
    handleFormSubmit,
    handleReset: resetAll,
  };
}

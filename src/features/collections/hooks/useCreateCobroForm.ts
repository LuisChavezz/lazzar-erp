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
  CobroDraftFormSchema,
  CobroFormSchema,
  createEmptyCobroForm,
  type CobroFormValues,
  type CobroLineFormValues,
} from "../schemas/createCobro.schema";
import type { CobroEstatus } from "../interfaces/collection.interface";
import { useCobrableCxcs } from "./useCobrableCxcs";
import { buildCobroPayload } from "../services/actions";
import { useSaveCobro } from "./useSaveCobro";

/** Etiqueta de un cliente en el selector y en el campo una vez elegido. */
export const customerLabel = (customer: Pick<AccountingCustomer, "razon_social" | "nombre">) =>
  customer.razon_social || customer.nombre;

/**
 * Borrador a editar: su id y los valores con que arranca el formulario (ver
 * `cobroToFormValues`). Sin él, el formulario es un alta.
 */
export interface CobroDraftSeed {
  id: number;
  values: CobroFormValues;
}

/** Con qué estatus se envía: guardar borrador o registrar/aplicar. */
interface CobroSubmitMeta {
  estatus: Extract<CobroEstatus, "Borrador" | "Aplicado">;
}

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

/**
 * Formulario de cobros: alta (sin `draft`) o edición de un borrador (`draft`).
 *
 * Dos envíos, con su schema cada uno: "Guardar borrador" (`CobroDraftFormSchema`,
 * cabecera mínima y líneas opcionales) y registrar/aplicar (`CobroFormSchema`,
 * las reglas que el backend aplica en `aplicar_cobro`). En edición siempre viaja
 * el cobro completo por PATCH (`updateCobro`), y el cliente queda bloqueado
 * mientras haya líneas: cambiarlo exige quitarlas primero.
 */
export function useCreateCobroForm({
  onSuccess,
  draft,
}: { onSuccess?: () => void; draft?: CobroDraftSeed } = {}) {
  const isEdit = draft !== undefined;
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

  // Solo cuentas ACTIVAS: el backend rechaza una inactiva en `cuenta_bancaria`.
  // Excepción: al editar un borrador, SU cuenta sigue en la lista aunque se haya
  // desactivado, marcada "(inactiva)", para no perder la selección ni sus líneas;
  // guardar o aplicar queda bloqueado hasta elegir una activa (ver
  // `isCuentaInactiva`). Las demás inactivas siguen ocultas.
  const draftCuentaId = draft?.values.cuenta_bancaria;
  const activeBankAccounts = bankAccounts.filter((account) => account.activo);
  const selectableBankAccounts = bankAccounts.filter(
    (account) => account.activo || (draftCuentaId !== undefined && account.id === draftCuentaId),
  );
  const bankAccountOptions = selectableBankAccounts.map((account) => ({
    value: account.id,
    label:
      [account.alias, account.banco_nombre, account.moneda_codigo].filter(Boolean).join(" · ") +
      (account.activo ? "" : " (inactiva)"),
  }));

  const missingItems: string[] = [];
  if (activeCustomers.length === 0) missingItems.push("Clientes activos");
  if (activeBankAccounts.length === 0) missingItems.push("Cuentas bancarias activas");

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
    bannerPrefix: isEdit ? "No se guardó ningún cambio del cobro." : "No se registró ningún cobro.",
  });
  // Envío en curso y cuál de los dos botones lo disparó (para su texto).
  const [submittingEstatus, setSubmittingEstatus] = useState<CobroSubmitMeta["estatus"] | null>(null);

  // Claves estables por línea, para que borrar una intermedia no reutilice el
  // estado local de otra. Las líneas del borrador arrancan con las suyas.
  const initialLineCount = draft?.values.cobro_detalles.length ?? 0;
  const lineKeyCounter = useRef(initialLineCount);
  const [lineKeys, setLineKeys] = useState<number[]>(() => Array.from({ length: initialLineCount }, (_, i) => i));

  const { mutateAsync: saveCobroMutation, isPending: isSaving } = useSaveCobro(applyServerError);

  // ── Formulario ────────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues: draft?.values ?? createEmptyCobroForm(),
    // Enter y el botón principal registran/aplican; "Guardar borrador" pasa el suyo.
    onSubmitMeta: { estatus: "Aplicado" } as CobroSubmitMeta,
    onSubmit: async ({ value, meta }) => {
      setServerBanner(null);
      // Los botones ya están deshabilitados; esto cubre un envío por Enter.
      if (bankAccounts.find((account) => account.id === value.cuenta_bancaria)?.activo === false) return;

      // El techo de cada línea es su saldo VIGENTE, no el que traía al
      // agregarse (ver `saldoFor`). Un borrador no lo valida: el saldo se
      // revisa al aplicar.
      const schema = meta.estatus === "Borrador" ? CobroDraftFormSchema : CobroFormSchema;
      const parsed = schema.safeParse(withFreshSaldos(value));
      if (!parsed.success) {
        applyValidationIssues(parsed.error.issues);
        return;
      }
      clearErrors();
      setSubmittingEstatus(meta.estatus);

      try {
        await saveCobroMutation({ payload: buildCobroPayload(parsed.data, meta.estatus), cobroId: draft?.id });
        if (!isEdit) resetAll();
        onSuccess?.();
      } catch {
        // Ya repartido en `handleServerError` y avisado por toast; se captura
        // para que el rechazo no escape del `void form.handleSubmit()`.
      } finally {
        setSubmittingEstatus(null);
      }
    },
  });

  const isPending = submittingEstatus !== null || isSaving;

  // ── Saldos vigentes de las líneas ─────────────────────────────────────────
  // Las líneas se siembran con el saldo que trajo el selector, pero ese saldo
  // puede cambiar (otro cobro sobre la misma CxC). Esta consulta es la MISMA que
  // la del selector y se refresca al montarse y tras cualquier error de saldo
  // (`useCreateCobro` invalida las CxC): la línea muestra y valida contra el
  // saldo vigente sin tocar el importe que el usuario tecleó.
  const cliente = useStore(form.store, (state) => state.values.cliente);
  const cuentaBancaria = useStore(form.store, (state) => state.values.cuenta_bancaria);
  const moneda = useStore(form.store, (state) => state.values.moneda);
  const lineCount = useStore(form.store, (state) => state.values.cobro_detalles.length);
  // En edición el cliente no cambia mientras haya líneas: el backend solo revisa
  // el cliente de cada CxC al guardar líneas, y sus CxC ya son de este cliente.
  const isClienteLocked = isEdit && lineCount > 0;
  const selectedAccount = selectableBankAccounts.find((account) => account.id === cuentaBancaria);
  // La cuenta elegida es la del borrador y ya no está activa: el backend la
  // rechazaría al guardar o aplicar.
  const isCuentaInactiva = selectedAccount !== undefined && !selectedAccount.activo;
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
   * y las del anterior ya no aplican. En edición, con líneas, no se permite (ver
   * `isClienteLocked`).
   */
  const handleClienteChange = (customer: AccountingCustomer | null) => {
    if (isClienteLocked) return;
    const nextId = customer?.id ?? 0;
    if (nextId === form.getFieldValue("cliente")) return;
    form.setFieldValue("cliente", nextId);
    clearLines();
    clearError("cliente");
  };

  /**
   * Cambiar de cuenta bancaria VACÍA las líneas y el tipo de cambio: la cuenta
   * fija la moneda del cobro, y las CxC elegidas eran de la moneda anterior.
   */
  const handleCuentaChange = (cuentaId: number) => {
    if (cuentaId === form.getFieldValue("cuenta_bancaria")) return;
    const account = selectableBankAccounts.find((item) => item.id === cuentaId);
    form.setFieldValue("cuenta_bancaria", cuentaId);
    form.setFieldValue("moneda", account?.moneda_codigo || null);
    // El tipo de cambio es de la moneda anterior.
    form.setFieldValue("tipo_cambio", "");
    clearError("tipo_cambio");
    clearLines();
    clearError("cuenta_bancaria");
  };

  // ── Submit / reset ────────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleSaveDraft = () => {
    void form.handleSubmit({ estatus: "Borrador" });
  };

  return {
    form,
    isEdit,
    isPending,
    submittingEstatus,
    isClienteLocked,
    isCuentaInactiva,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    customers: activeCustomers,
    bankAccounts: selectableBankAccounts,
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
    handleSaveDraft,
    handleReset: resetAll,
  };
}

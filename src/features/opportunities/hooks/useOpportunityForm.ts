"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useCustomers } from "@/src/features/customers/hooks/useCustomers";
import { ETAPA_NUEVA, ETAPA_PERDIDA } from "../constants/opportunityChoices";
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityPatch,
  OpportunityWrite,
} from "../interfaces/opportunity.interface";
import {
  createOpportunityFormSchema,
  getMotivoPerdidaError,
  getTituloError,
  IDENTIFICACION_ERROR_PATH,
  OpportunityFormFields,
  OpportunityFormValues,
} from "../schemas/opportunity.schema";
import { useCreateOpportunity } from "./useCreateOpportunity";
import { useUpdateOpportunity } from "./useUpdateOpportunity";

interface UseOpportunityFormParams {
  onSuccess: () => void;
  opportunityToEdit?: Opportunity | null;
}

type OpportunityFormField = keyof OpportunityFormValues;

/** Cliente como lo lista el buscador, con el id ya numérico. */
export interface OpportunityCustomerOption {
  id: number;
  razon_social: string;
  nombre: string;
  correo: string;
  telefono: string;
}

const EMPTY_VALUES: OpportunityFormValues = {
  cliente: null,
  nombre_contacto: "",
  telefono: "",
  correo: "",
  titulo: "",
  monto_estimado: "",
  etapa: ETAPA_NUEVA,
  motivo_perdida: "",
  proximo_contacto: "",
  notas: "",
};

const toFormValues = (opportunity: Opportunity): OpportunityFormValues => ({
  cliente: opportunity.cliente,
  nombre_contacto: opportunity.nombre_contacto ?? "",
  telefono: opportunity.telefono ?? "",
  correo: opportunity.correo ?? "",
  titulo: opportunity.titulo ?? "",
  monto_estimado: opportunity.monto_estimado ?? "",
  // `etapa` siempre es una de las tres capturables, aunque `estado` diga
  // Cotizada o Ganada.
  etapa: opportunity.etapa,
  motivo_perdida: opportunity.motivo_perdida ?? "",
  proximo_contacto: opportunity.proximo_contacto ?? "",
  notas: opportunity.notas ?? "",
});

/**
 * Valores del formulario → lo que se escribe. Campo por campo, a propósito:
 * `vendedor` y `estado` nunca viajan. Un importe vacío es 0. El motivo de
 * pérdida solo se captura con la etapa `Perdida` (en un ALTA con otra etapa va
 * vacío; en una edición, ver `diffPayload`).
 */
const toWritePayload = (values: OpportunityFormValues): OpportunityWrite => ({
  cliente: values.cliente,
  nombre_contacto: values.nombre_contacto.trim(),
  telefono: values.telefono.trim(),
  correo: values.correo.trim(),
  titulo: values.titulo.trim(),
  monto_estimado: normalizeCapturedDecimal(values.monto_estimado) || "0",
  etapa: values.etapa,
  motivo_perdida: values.etapa === ETAPA_PERDIDA ? values.motivo_perdida.trim() : "",
  proximo_contacto: values.proximo_contacto || null,
  notas: values.notas.trim(),
});

/** "1500" y "1500.00" son el mismo importe (14 dígitos caben sin pérdida). */
const sameAmount = (a: string, b: string) => Number(a).toFixed(2) === Number(b).toFixed(2);

/**
 * Solo los campos que cambiaron respecto a como se ABRIÓ el registro. Lo que
 * no se tocó no viaja, así que no pisa lo que otra persona haya editado
 * entretanto.
 *
 * `motivo_perdida` solo viaja con la etapa `Perdida`, que es cuando se ve y se
 * edita. Al sacar una oportunidad de `Perdida` NO se manda vacío: el backend
 * conserva a propósito el motivo guardado.
 */
const diffPayload = (original: OpportunityWrite, next: OpportunityWrite): OpportunityPatch => {
  const changes: OpportunityPatch = {};
  (Object.keys(next) as (keyof OpportunityWrite)[]).forEach((key) => {
    if (key === "motivo_perdida" && next.etapa !== ETAPA_PERDIDA) return;
    const unchanged =
      key === "monto_estimado"
        ? sameAmount(original.monto_estimado, next.monto_estimado)
        : original[key] === next[key];
    if (!unchanged) {
      Object.assign(changes, { [key]: next[key] });
    }
  });
  return changes;
};

export function useOpportunityForm({ onSuccess, opportunityToEdit }: UseOpportunityFormParams) {
  const isEditing = Boolean(opportunityToEdit?.id);
  // El backend rechaza un `titulo: ""` explícito: uno ya capturado no se vacía.
  const ruleContext = { hadTitulo: (opportunityToEdit?.titulo ?? "").trim() !== "" };

  const {
    customers,
    isLoading: isLoadingCustomers,
    isInitialError: isErrorCustomers,
  } = useCustomers();

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Envío en curso, síncrono (ver `onSubmit`).
  const submittingRef = useRef(false);

  // Errores por campo (de cliente y de servidor): ver `useFormFieldErrors`.
  const {
    getError,
    setServerFieldError,
    setClientFieldError: setClientError,
    clearClientFieldError,
    clearFieldErrors: clearOwnFieldErrors,
    replaceClientErrors,
    clearServerErrors,
    clearAllErrors,
  } = useFormFieldErrors<OpportunityFormField>();
  // Falta con qué identificar la oportunidad (título, cliente o contacto). No
  // es de un campo: el formulario lo pinta como aviso junto a los tres.
  const [identificationError, setIdentificationError] = useState<string | null>(null);

  const { mutateAsync: createOpportunity, isPending: isCreating } =
    useCreateOpportunity(setServerFieldError);
  const { mutateAsync: updateOpportunity, isPending: isUpdating } =
    useUpdateOpportunity(setServerFieldError);

  /**
   * El campo cambió: se van sus errores y, si es uno de los tres que
   * identifican la oportunidad, también el aviso de identificación (capturar
   * cualquiera de ellos lo resuelve).
   */
  const clearFieldErrors = (field: OpportunityFormField) => {
    if (field === "titulo" || field === "cliente" || field === "nombre_contacto") {
      setIdentificationError(null);
    }
    clearOwnFieldErrors(field);
  };

  /** Regla que depende de otro campo o del registro en edición. */
  const getCrossRuleError = (field: OpportunityFormField, values: OpportunityFormValues) => {
    if (field === "motivo_perdida") return getMotivoPerdidaError(values);
    if (field === "titulo") return getTituloError(values, ruleContext);
    return null;
  };

  // Valida un solo campo en blur (el schema completo ya no expone `.shape`).
  const validateField = (
    field: OpportunityFormField,
    value: OpportunityFormValues[OpportunityFormField]
  ) => {
    const parsed = OpportunityFormFields[field].safeParse(value);
    const message = parsed.success
      ? getCrossRuleError(field, { ...form.state.values, [field]: value })
      : parsed.error.issues[0]?.message ?? "Valor inválido";

    if (message) {
      setClientError(field, message);
      return false;
    }
    clearClientFieldError(field);
    return true;
  };

  const validateForm = (values: OpportunityFormValues) => {
    const parsed = createOpportunityFormSchema(ruleContext).safeParse(values);
    if (parsed.success) {
      replaceClientErrors({});
      setIdentificationError(null);
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<OpportunityFormField, string>> = {};
    let nextIdentificationError: string | null = null;
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0] === IDENTIFICACION_ERROR_PATH) {
        nextIdentificationError = issue.message;
        return;
      }
      const field = issue.path[0] as OpportunityFormField;
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });

    replaceClientErrors(nextErrors);
    setIdentificationError(nextIdentificationError);
    // El aviso de identificación se pinta junto al título: se lleva la vista ahí.
    const issuePaths = Object.keys(nextErrors);
    if (nextIdentificationError && !issuePaths.includes("titulo")) issuePaths.unshift("titulo");
    return { success: false as const, issuePaths };
  };

  /** El envío en sí, sin la guarda de doble envío (vive en `onSubmit`). */
  const submitOpportunity = async (value: OpportunityFormValues) => {
    clearServerErrors();

    const validationResult = validateForm(value);
    if (!validationResult.success) {
      scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
      return;
    }

    const payload = toWritePayload(value);

    setIsLoading(true);
    try {
      if (opportunityToEdit) {
        const changes = diffPayload(toWritePayload(toFormValues(opportunityToEdit)), payload);
        if (Object.keys(changes).length === 0) {
          toast("No hay cambios que guardar.");
          onSuccess();
          return;
        }
        await updateOpportunity({ id: opportunityToEdit.id, changes });
      } else {
        // `titulo` vacío se omite: el backend rechaza un `""` explícito.
        const { titulo, ...rest } = payload;
        const createPayload: OpportunityCreate = titulo ? { ...rest, titulo } : rest;
        await createOpportunity(createPayload);
      }
      onSuccess();
    } catch (error) {
      // El `onError` de la mutación ya avisó y pintó los errores por campo. Sin
      // este catch el rechazo de `mutateAsync` escaparía sin manejar.
      //
      // Si la oportunidad ya no existe (otra persona la dio de baja), no hay
      // nada que reintentar: el diálogo se cierra y queda el listado, que la
      // mutación ya refrescó.
      if (opportunityToEdit && isNotFoundError(error)) onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const form = useForm({
    defaultValues: opportunityToEdit ? toFormValues(opportunityToEdit) : EMPTY_VALUES,
    onSubmit: async ({ value }) => {
      // Guarda SÍNCRONA contra el doble envío en el mismo tick: `isPending`
      // deshabilita el formulario hasta el siguiente render.
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        await submitOpportunity(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  const watchedEtapa = useStore(form.store, (state) => state.values.etapa);
  const watchedCliente = useStore(form.store, (state) => state.values.cliente);
  const isLost = watchedEtapa === ETAPA_PERDIDA;

  /** Cambiar de etapa quita el error del motivo cuando deja de aplicar. */
  const changeEtapa = (etapa: OpportunityFormValues["etapa"]) => {
    form.setFieldValue("etapa", etapa);
    clearFieldErrors("etapa");
    if (etapa !== ETAPA_PERDIDA) clearFieldErrors("motivo_perdida");
  };

  // ── Cliente ───────────────────────────────────────────────────────────────
  // `Customer.id` está tipado como string, pero el backend manda un número: se
  // normaliza aquí, en un solo sitio. Solo se OFRECEN los activos.
  const customerOptions: OpportunityCustomerOption[] = customers
    .filter((customer) => customer.activo)
    .map((customer) => ({
      id: Number(customer.id),
      razon_social: customer.razon_social,
      nombre: customer.nombre,
      correo: customer.correo,
      telefono: customer.telefono,
    }));

  const selectedCustomer =
    watchedCliente === null
      ? undefined
      : customers.find((customer) => Number(customer.id) === watchedCliente);
  // Sin catálogo (cargando o caído) se usa el nombre que trae la oportunidad.
  const selectedCustomerLabel =
    watchedCliente === null
      ? ""
      : selectedCustomer?.razon_social ??
        (watchedCliente === opportunityToEdit?.cliente ? opportunityToEdit.cliente_nombre : null) ??
        `Cliente #${watchedCliente}`;
  // Una oportunidad ya ligada a un cliente inactivo lo conserva al editar.
  const isSelectedCustomerInactive = selectedCustomer !== undefined && !selectedCustomer.activo;

  // Texto del buscador mientras se escribe; `null` = muestra el cliente elegido.
  // El texto es solo una BÚSQUEDA: la selección cambia al elegir una opción o
  // "Sin cliente", nunca por lo que quede tecleado.
  const [customerSearch, setCustomerSearch] = useState<string | null>(null);
  const customerSearchValue = customerSearch ?? selectedCustomerLabel;

  const selectCustomer = (customer: OpportunityCustomerOption) => {
    form.setFieldValue("cliente", customer.id);
    setCustomerSearch(null);
    clearFieldErrors("cliente");
  };

  const clearCustomer = () => {
    form.setFieldValue("cliente", null);
    setCustomerSearch(null);
    // QUITAR el cliente nunca resuelve la falta de identificación: ese aviso
    // se queda.
    clearOwnFieldErrors("cliente");
  };

  /** Al salir del buscador, lo tecleado sin elegir se descarta. */
  const resetCustomerSearch = () => setCustomerSearch(null);

  const isPending = isCreating || isUpdating || isLoading;

  const handleReset = () => {
    form.reset(opportunityToEdit ? toFormValues(opportunityToEdit) : EMPTY_VALUES);
    setCustomerSearch(null);
    clearAllErrors();
    setIdentificationError(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    isPending,
    isEditing,
    isLost,
    customerOptions,
    customerSearchValue,
    selectedCustomerId: watchedCliente ?? undefined,
    isSelectedCustomerInactive,
    isLoadingCustomers,
    isErrorCustomers,
    identificationError,
    setCustomerSearch,
    selectCustomer,
    clearCustomer,
    resetCustomerSearch,
    changeEtapa,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}

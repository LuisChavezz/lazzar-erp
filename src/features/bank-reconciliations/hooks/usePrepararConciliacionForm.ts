"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import {
  PrepararConciliacionFormSchema,
  createEmptyPrepararConciliacionForm,
  type PrepararConciliacionFormValues,
} from "../schemas/bank-reconciliation.schema";
import type {
  ConciliacionBancaria,
  PrepararConciliacionPayload,
  PrepararConciliacionResponse,
} from "../interfaces/bank-reconciliation.interface";
import { useConciliaciones } from "./useConciliaciones";
import { usePrepararConciliacion } from "./usePrepararConciliacion";

type FormField = keyof PrepararConciliacionFormValues;

/** Estado de la comprobación de solapamiento (ver `estadoSolapamiento`). */
export type EstadoSolapamiento =
  | "incompleto"
  | "verificando"
  | "error"
  | "conflicto"
  | "libre";

interface UsePrepararConciliacionFormParams {
  /**
   * Se invoca con la respuesta COMPLETA de `preparar`, no solo con el id: la
   * vista abre el detalle con ese objeto en vez de esperar a que la fila llegue
   * al listado (ver `conciliacionEnDetalleDesdePreparar`).
   */
  onPrepared: (resultado: PrepararConciliacionResponse) => void;
}

/**
 * Formulario de "preparar conciliación".
 *
 * Captura cuenta, periodo y saldo del estado de cuenta, comprueba que el
 * periodo no pise una conciliación ya CERRADA y llama a `preparar`. No muestra
 * resultados: al terminar entrega la respuesta para que la vista aterrice en el
 * detalle del borrador, donde ya están los saldos calculados.
 */
export function usePrepararConciliacionForm({
  onPrepared,
}: UsePrepararConciliacionFormParams) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<FormField, string>>
  >({});

  // ── Catálogo de cuentas ──────────────────────────────────────────────────
  const {
    bankAccounts,
    hasLoaded: hasLoadedBankAccounts,
    isLoading: isLoadingBankAccounts,
    isError: isErrorBankAccounts,
  } = useBankAccounts();

  const isLoadingFormData = isLoadingBankAccounts;
  // Un refetch fallido CON datos en caché no debe tirar el formulario: el
  // usuario pudo ya capturar el periodo y el saldo. Solo la carga inicial
  // fallida deja la pantalla sin selector válido. Mismo criterio
  // `isError && !hasLoaded` que usa el resto de finanzas.
  const isErrorFormData = isErrorBankAccounts && !hasLoadedBankAccounts;

  // Mismo armado que `usePaymentForm`: solo cuentas activas, etiquetadas con el
  // alias, el banco y la moneda.
  const bankAccountOptions = bankAccounts
    .filter((cuenta) => cuenta.activo)
    .map((cuenta) => ({
      value: cuenta.id,
      label: [cuenta.alias, cuenta.banco_nombre, cuenta.moneda_codigo]
        .filter(Boolean)
        .join(" · "),
    }));

  /**
   * Prerrequisito de captura, no un error: sin cuentas bancarias activas no hay
   * nada que conciliar. Se distingue del estado de error de red.
   */
  const missingItems: string[] =
    bankAccountOptions.length === 0 ? ["Cuentas bancarias activas"] : [];

  const [defaultValues] = useState<PrepararConciliacionFormValues>(() =>
    createEmptyPrepararConciliacionForm(),
  );

  const { mutateAsync: prepararAsync, isPending } = usePrepararConciliacion();

  const clearFieldError = (field: FormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const getError = (field: FormField): FormFieldError | undefined => {
    const message = clientErrors[field];
    return message ? { message } : undefined;
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const parsed = PrepararConciliacionFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<FormField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as FormField;
          if (!field || nextErrors[field]) return;
          nextErrors[field] = issue.message;
        });
        setClientErrors(nextErrors);
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }
      setClientErrors({});

      // Guardia de última hora, INDEPENDIENTE del botón: la vista ya deshabilita
      // el envío, pero el bloqueo no debe depender de que la UI haya pintado el
      // estado correcto. Llegados aquí el esquema ya aceptó cuenta y periodo, así
      // que la ÚNICA salida permitida es un resultado de solapamiento verificado
      // para este rango y sin conflicto. Ni un error, ni una consulta en vuelo,
      // ni datos de otro rango cuentan como "libre".
      if (estadoSolapamiento !== "libre") return;

      const payload: PrepararConciliacionPayload = {
        cuenta_bancaria: parsed.data.cuenta_bancaria,
        fecha_inicio: parsed.data.fecha_inicio,
        fecha_final: parsed.data.fecha_final,
        saldo_estado_cuenta: parsed.data.saldo_estado_cuenta.trim(),
      };

      try {
        const resultado = await prepararAsync(payload);
        onPrepared(resultado);
      } catch {
        // El toast ya salió desde la mutación. Se captura para que el rechazo
        // de `mutateAsync` no escape por `void form.handleSubmit()` como
        // unhandled rejection y, sobre todo, para NO cerrar el diálogo.
      }
    },
  });

  // ── Comprobación de solapamiento (previa a preparar) ─────────────────────
  // Se leen los valores SUSCRITOS: la consulta tiene que rehacerse cuando el
  // usuario cambia de cuenta o de fecha, no solo al enviar.
  const cuentaBancaria = useStore(form.store, (state) => state.values.cuenta_bancaria);
  const fechaInicio = useStore(form.store, (state) => state.values.fecha_inicio);
  const fechaFinal = useStore(form.store, (state) => state.values.fecha_final);

  const rangoCompleto =
    cuentaBancaria > 0 &&
    fechaInicio !== "" &&
    fechaFinal !== "" &&
    fechaInicio <= fechaFinal;

  // El backend devuelve las conciliaciones que SE SOLAPAN con el rango (ver
  // `ConciliacionBancariaQueryParams`), que es exactamente lo que hace falta:
  // un choque parcial cuenta igual que uno exacto.
  const {
    conciliaciones: solapadas,
    hasLoaded: hasLoadedOverlap,
    isFetching: isFetchingOverlap,
    isError: isErrorOverlap,
    isPlaceholderData: isPlaceholderOverlap,
    refetch: refetchOverlap,
  } = useConciliaciones(
    rangoCompleto
      ? {
          cuenta_bancaria: cuentaBancaria,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFinal,
        }
      : undefined,
    { enabled: rangoCompleto },
  );

  /**
   * ¿Hay un resultado de solapamiento en el que se pueda CONFIAR para ESTE
   * rango? Es la condición para permitir preparar, y falla CERRADA.
   *
   * `solapadas` cae a `[]` tanto cuando el servidor dijo "no hay nada" como
   * cuando la consulta falló o todavía no respondió, y un `[]` leído como "sin
   * conflicto" dejaba re-preparar un periodo CERRADO en cuanto el GET daba 500
   * o se agotaba el tiempo —justo la regla que el backend no impone y que esta
   * pantalla existe para proteger—. Por eso no basta con mirar el arreglo: hace
   * falta que haya datos (`hasLoaded`), que sean del rango actual y no los del
   * anterior mientras llegan los nuevos (`!isPlaceholderData`), que no haya una
   * consulta en vuelo que pueda cambiarlos (`!isFetching`) y que no haya error.
   */
  const solapamientoVerificado =
    rangoCompleto &&
    hasLoadedOverlap &&
    !isPlaceholderOverlap &&
    !isFetchingOverlap &&
    !isErrorOverlap;

  /**
   * Solo las CERRADAS bloquean.
   *
   * Un `Borrador` del mismo periodo NO es un conflicto: es justo lo que
   * `preparar` reutiliza, y es el camino normal para corregir un saldo mal
   * capturado. Una `Cancelada` se ignora: no marcó ningún movimiento.
   *
   * Se calcula solo sobre un resultado VERIFICADO: mientras llega el del rango
   * nuevo, el arreglo puede ser el del rango anterior y señalaría conflictos
   * que no son de este periodo (o callaría uno que sí lo es).
   */
  const cerradasEnConflicto: ConciliacionBancaria[] = solapamientoVerificado
    ? solapadas.filter((conciliacion) => conciliacion.estatus === "Cerrada")
    : [];

  /**
   * Estado de la comprobación, para que la vista pinte un aviso distinto en
   * cada caso. Todos salvo `"libre"` BLOQUEAN el envío cuando el rango está
   * completo:
   *  - `"incompleto"`: no hay cuenta y periodo válidos que comprobar; el envío
   *    lo frena el esquema, que dice qué falta.
   *  - `"verificando"`: la consulta va en vuelo o todavía no respondió para este
   *    rango.
   *  - `"error"`: la consulta falló; el periodo NO se pudo verificar.
   *  - `"conflicto"`: hay una conciliación cerrada que se cruza.
   *  - `"libre"`: el servidor respondió para este rango y no hay ninguna.
   */
  const estadoSolapamiento: EstadoSolapamiento = !rangoCompleto
    ? "incompleto"
    : isErrorOverlap
      ? "error"
      : !solapamientoVerificado
        ? "verificando"
        : cerradasEnConflicto.length > 0
          ? "conflicto"
          : "libre";

  /** ¿Bloquea el envío la comprobación de solapamiento? */
  const bloqueadoPorSolapamiento = rangoCompleto && estadoSolapamiento !== "libre";

  /**
   * ¿El conflicto es exactamente el mismo periodo? Solo entonces se ofrece
   * abrir la conciliación existente: con un solapamiento PARCIAL no hay una
   * "la misma" que abrir, y el usuario tiene que ajustar el rango.
   */
  const cerradaExacta =
    cerradasEnConflicto.length === 1 &&
    cerradasEnConflicto[0].fecha_inicio === fechaInicio &&
    cerradasEnConflicto[0].fecha_final === fechaFinal
      ? cerradasEnConflicto[0]
      : null;

  const selectedAccount =
    bankAccounts.find((cuenta) => cuenta.id === cuentaBancaria) ?? null;

  const handleReset = () => {
    form.reset(defaultValues);
    setClientErrors({});
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    // `isPending` deshabilita el envío mientras `preparar` viaja. Es la ÚNICA
    // protección contra el doble envío: la idempotencia del backend es de
    // servicio, sin restricción única, así que dos llamadas simultáneas del
    // mismo periodo pueden crear dos borradores.
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    bankAccountOptions,
    selectedAccount,
    cerradasEnConflicto,
    cerradaExacta,
    estadoSolapamiento,
    bloqueadoPorSolapamiento,
    // Vuelve a pedir la comprobación del rango ACTUAL (la llave de la consulta
    // ya es la de este rango), para el aviso de "no se pudo verificar".
    reintentarSolapamiento: () => void refetchOverlap(),
    getError,
    clearFieldError,
    handleReset,
    handleFormSubmit,
  };
}

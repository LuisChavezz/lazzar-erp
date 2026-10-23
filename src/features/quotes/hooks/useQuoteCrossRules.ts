"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { QuoteFormValues } from "../schemas/quote.schema";
import type { ErrorNode } from "../utils/quoteFormErrorTree";
import { ANTICIPO_MAYOR_AL_TOTAL_MESSAGE, isAnticipoMayorAlTotal } from "../utils/quoteAmounts";

/**
 * Las reglas CRUZADAS del formulario: un valor (el disparador) decide si otro
 * campo (el que muestra el error) es válido.
 *
 * Las dos primeras son réplica de la condición de `quoteFormSchema.superRefine`
 * —mismo predicado y mismo mensaje— para poder evaluarla fuera del submit. Si
 * cambia una regla allá, cambia aquí. No se deriva corriendo el schema completo
 * porque el `superRefine` de un objeto no garantiza ejecutarse cuando otros
 * campos traen errores, y aquí se necesita una respuesta determinista para UN
 * campo.
 *
 * `anticipo` (EC-563, CO-03) no está en el schema: su disparador es el GRAN
 * TOTAL en vivo, un valor derivado que el schema no ve. Por eso cada hook lo
 * entrega con `getGranTotal` y la regla también se agrega al submit
 * (`getAnticipoIssue`).
 */
const QUOTE_CROSS_RULES = {
  condicionPagoMonto: {
    trigger: "condicionPago",
    message: "Especifica un monto válido",
    isViolated: (values: Partial<QuoteFormValues>) =>
      values.condicionPago === "otra_cantidad" &&
      (values.condicionPagoMonto == null || Number(values.condicionPagoMonto) <= 0),
  },
  comentarios_parcialidad: {
    trigger: "embarque_parcial",
    message: "Agrega los comentarios de parcialidad",
    isViolated: (values: Partial<QuoteFormValues>) =>
      Boolean(values.embarque_parcial) && !values.comentarios_parcialidad?.trim(),
  },
  anticipo: {
    trigger: "granTotal",
    message: ANTICIPO_MAYOR_AL_TOTAL_MESSAGE,
    isViolated: (values: Partial<QuoteFormValues>, granTotal: number) =>
      isAnticipoMayorAlTotal(values.anticipo, granTotal),
  },
} as const;

/** Campo que muestra el error de una regla cruzada. */
export type QuoteCrossRuleField = keyof typeof QUOTE_CROSS_RULES;

/**
 * Lo que decide si la regla aplica: el select de condición, la casilla, o el
 * gran total en vivo (`granTotal`, un valor derivado y no un campo).
 */
export type QuoteCrossRuleTrigger = (typeof QUOTE_CROSS_RULES)[QuoteCrossRuleField]["trigger"];

const CROSS_RULE_FIELDS = Object.keys(QUOTE_CROSS_RULES) as QuoteCrossRuleField[];

export const isQuoteCrossRuleField = (field: string): field is QuoteCrossRuleField =>
  field in QUOTE_CROSS_RULES;

const fieldForTrigger = (trigger: QuoteCrossRuleTrigger) =>
  CROSS_RULE_FIELDS.find((field) => QUOTE_CROSS_RULES[field].trigger === trigger)!;

const messageAt = (tree: ErrorNode, field: QuoteCrossRuleField) => {
  const node = tree[field];
  return node && typeof node === "object" && "message" in node
    ? (node as { message?: unknown }).message
    : undefined;
};

/**
 * `type` con el que una regla cruzada marca el error que ELLA puso. La marca
 * viaja en el propio error —y no en un ref aparte— porque el árbol de errores
 * se copia con `structuredClone` en cada `clearFieldErrors`/`validateField`: un
 * ref de nodos perdería la identidad, y uno de campos quedaría desfasado cuando
 * otro código borra o reemplaza el error.
 */
const CROSS_RULE_ERROR_TYPE = "regla-cruzada";

const isOwnErrorAt = (tree: ErrorNode, field: QuoteCrossRuleField) => {
  const node = tree[field];
  return (
    Boolean(node) &&
    typeof node === "object" &&
    (node as { type?: unknown }).type === CROSS_RULE_ERROR_TYPE
  );
};

const ownError = (field: QuoteCrossRuleField) => ({
  message: QUOTE_CROSS_RULES[field].message,
  type: CROSS_RULE_ERROR_TYPE,
});

/**
 * Reevaluación de las reglas cruzadas del formulario de cotización/pedido.
 *
 * La comparten los TRES hooks que alimentan `QuoteFormContent` (alta y edición
 * de cotización, edición de pedido por Mesa de Control) para que las tres
 * pantallas se comporten igual. Antes, el error cruzado solo nacía en el
 * submit y ningún otro evento lo tocaba:
 *
 * - Salir del campo del error lo borraba aunque la regla siguiera rota, porque
 *   `validateField` solo usa el schema de UN campo (0 pasa `min(0)`, "" pasa
 *   `.optional()`). → `validateCrossRuleOnBlur`.
 * - Cambiar el disparador no lo reevaluaba: al dejar "otra_cantidad" el monto
 *   quedaba DESHABILITADO con su error en rojo y sin forma de quitarlo.
 *   → `revalidateCrossRule`, que limpia o repone.
 *
 * La reevaluación desde el disparador solo actúa si la regla YA SE DISPARÓ al
 * menos una vez (por blur o por submit): antes de eso no se reprocha nada. La
 * guarda NO es "hubo un submit" —el error también nace del blur— ni "el error
 * está visible ahora". Mismo criterio que turnos, contratos y series.
 *
 * Solo se toca un error si es PROPIO (marcado con `CROSS_RULE_ERROR_TYPE`): un
 * error del servidor en la misma ruta —lo mezcla `applyServerValidationIssues`—
 * no se pisa ni se borra desde aquí, aunque traiga el mismo texto (el del
 * anticipo es idéntico al del backend a propósito).
 */
const NOT_FIRED: Record<QuoteCrossRuleField, boolean> = {
  condicionPagoMonto: false,
  comentarios_parcialidad: false,
  anticipo: false,
};

export function useQuoteCrossRules(
  getValues: () => QuoteFormValues,
  setErrorTree: Dispatch<SetStateAction<ErrorNode>>,
  /** Gran total EN VIVO, el mismo que pinta el formulario. */
  getGranTotal: () => number,
) {
  const firedRef = useRef<Record<QuoteCrossRuleField, boolean>>({ ...NOT_FIRED });

  const showOwnError = (field: QuoteCrossRuleField) => {
    setErrorTree((prev) => {
      const current = messageAt(prev, field);
      // Ya está, o hay otro error (p. ej. del servidor) que no es nuestro.
      if (current !== undefined) return prev;
      return { ...prev, [field]: ownError(field) };
    });
  };

  const clearOwnError = (field: QuoteCrossRuleField) => {
    setErrorTree((prev) => {
      if (!isOwnErrorAt(prev, field)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /**
   * Blur del campo que muestra el error. Devuelve `true` si la regla cruzada
   * sigue rota (y el error queda puesto): `validateField` no debe limpiarlo.
   * `value` es el valor del campo al salir, que manda sobre el del store.
   */
  const validateCrossRuleOnBlur = (field: QuoteCrossRuleField, value: unknown) => {
    const rule = QUOTE_CROSS_RULES[field];
    if (!rule.isViolated({ ...getValues(), [field]: value }, getGranTotal())) {
      return false;
    }
    firedRef.current[field] = true;
    showOwnError(field);
    return true;
  };

  /**
   * Cambio del disparador (select de condición, casilla de embarque parcial o
   * gran total). Recibe el valor NUEVO del disparador para no depender de
   * cuándo el store refleja el `handleChange` recién hecho.
   */
  const revalidateCrossRule = (trigger: QuoteCrossRuleTrigger, triggerValue: unknown) => {
    const field = fieldForTrigger(trigger);
    if (!firedRef.current[field]) {
      return;
    }
    const isViolated =
      trigger === "granTotal"
        ? QUOTE_CROSS_RULES[field].isViolated(getValues(), Number(triggerValue))
        : QUOTE_CROSS_RULES[field].isViolated(
            { ...getValues(), [trigger]: triggerValue },
            getGranTotal()
          );
    if (isViolated) {
      showOwnError(field);
    } else {
      clearOwnError(field);
    }
  };

  /**
   * Submit fallido: marca como disparadas las reglas cuyo error trae el submit
   * y, en `tree` (el árbol que el hook está por guardar), marca esos errores
   * como propios para que la regla pueda retirarlos cuando deje de aplicar.
   * Los issues del submit son todos del cliente (schema o `getAnticipoIssue`).
   */
  const markCrossRulesFired = (
    issues: { path: PropertyKey[]; message: string }[],
    tree?: ErrorNode,
  ) => {
    issues.forEach((issue) => {
      const field = String(issue.path[0] ?? "");
      if (
        issue.path.length === 1 &&
        isQuoteCrossRuleField(field) &&
        issue.message === QUOTE_CROSS_RULES[field].message
      ) {
        firedRef.current[field] = true;
        if (tree && messageAt(tree, field) === issue.message) {
          tree[field] = ownError(field);
        }
      }
    });
  };

  /**
   * Issue de la regla del anticipo para el submit, o `null`. El schema no la
   * conoce (depende del total), así que el hook la suma a los issues de Zod.
   */
  const getAnticipoIssue = (values: Partial<QuoteFormValues>) =>
    QUOTE_CROSS_RULES.anticipo.isViolated(values, getGranTotal())
      ? { path: ["anticipo"], message: ANTICIPO_MAYOR_AL_TOTAL_MESSAGE }
      : null;

  /** Todo reset del formulario vuelve las reglas a "no disparadas". */
  const resetCrossRules = () => {
    firedRef.current = { ...NOT_FIRED };
  };

  return {
    validateCrossRuleOnBlur,
    revalidateCrossRule,
    markCrossRulesFired,
    resetCrossRules,
    getAnticipoIssue,
    /** Retira el error de `field` solo si lo puso la regla (ver `CROSS_RULE_ERROR_TYPE`). */
    clearOwnCrossRuleError: clearOwnError,
  };
}

/**
 * Anticipo ≤ total EN VIVO: una vez disparada la regla, un cambio del gran
 * total (partidas o cargos) reevalúa el error del anticipo sin esperar al
 * siguiente blur. Solo corre cuando el total CAMBIA: `crossRules` es un objeto
 * nuevo en cada render, así que su callback se lee por ref y no es dependencia.
 */
export function useRevalidateAnticipoOnTotalChange(
  crossRules: Pick<ReturnType<typeof useQuoteCrossRules>, "revalidateCrossRule">,
  granTotal: number,
) {
  const revalidateRef = useRef(crossRules.revalidateCrossRule);
  useEffect(() => {
    revalidateRef.current = crossRules.revalidateCrossRule;
  });
  const lastGranTotalRef = useRef(granTotal);
  useEffect(() => {
    if (lastGranTotalRef.current === granTotal) return;
    lastGranTotalRef.current = granTotal;
    revalidateRef.current("granTotal", granTotal);
  }, [granTotal]);
}

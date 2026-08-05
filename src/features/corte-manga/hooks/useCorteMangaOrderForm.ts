"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  CreateCorteMangaOrderFormSchema,
  type CreateCorteMangaOrderFormValues,
} from "../schemas/corte-manga-order.schema";
import { useCorteMangaOnboarding } from "./useCorteMangaOnboarding";
import {
  useCreateCorteMangaOrder,
  type ParsedCorteMangaOrderError,
} from "./useCreateCorteMangaOrder";
import { buildCorteMangaOrderPayload } from "../utils/buildCorteMangaOrderPayload";
import { resolveAssignedOperator } from "../utils/resolveAssignedOperator";

/** Igual a `ParsedCorteMangaOrderError["duplicate"]` — conserva el mensaje del
 * backend JUNTO con la orden existente, no solo la orden. */
type CorteMangaDuplicateState = NonNullable<ParsedCorteMangaOrderError["duplicate"]>;

/**
 * Estado del formulario de alta de orden de corte de manga.
 *
 * `prioridad` arranca en `1`, que es el default del propio backend
 * (`IntegerField(default=1)`, y el service hace `data.get("prioridad", 1)`):
 * omitir el campo produciría exactamente el mismo valor almacenado, así que
 * preseleccionarlo muestra la verdad en vez de fingir que "sin elegir" es un
 * estado posible. Ojo con la consecuencia: bajo la convención de etiquetas del
 * proyecto ese `1` se lee "Alta", de modo que el default efectivo de TODA orden
 * de corte de manga es prioridad Alta — es una herencia del backend, no una
 * decisión de esta pantalla.
 */
export function useCorteMangaOrderForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { data: session } = useSession();
  const {
    pedidos,
    operadores,
    folioPreview,
    isLoading: isLoadingCatalog,
    isError: isErrorCatalog,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCorteMangaOnboarding();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  // Poblado SOLO en el 409 de duplicado (forma D del parser). Mutuamente
  // excluyente con `serverBanner`: cuando está presente, el formulario muestra
  // el bloque informativo de duplicado EN VEZ DEL banner rosa de validación —
  // son el mismo rechazo, no dos avisos a la vez.
  const [duplicate, setDuplicate] = useState<CorteMangaDuplicateState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  // ─── Opciones derivadas ───────────────────────────────────────────────────
  const pedidoOptions = useMemo(
    () =>
      pedidos.map((pedido) => ({
        value: pedido.id,
        // `folio` es nullable en el modelo: sin él, el id es lo único que
        // identifica al pedido en la lista.
        label: [pedido.folio ?? `Pedido #${pedido.id}`, pedido.cliente_nombre]
          .filter(Boolean)
          .join(" — "),
      })),
    [pedidos],
  );

  /** Operador que quedará asignado: siempre el usuario autenticado. */
  const operadorAsignado = useMemo(
    () => resolveAssignedOperator(operadores, session?.user),
    [operadores, session?.user],
  );

  // ─── Helpers de errores ───────────────────────────────────────────────────
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

  /**
   * Reparte el error ya normalizado: los de campo (forma C) bajo su input, el
   * duplicado (forma D) a su propio bloque informativo, y todo lo demás al
   * banner. El banner siempre aparece en los demás casos —aun cuando el error
   * sea atribuible a un campo— porque lo importante que comunica es que NO se
   * creó nada: el service es atómico y rechaza antes de consumir folio.
   *
   * El mensaje del backend viaja VERBATIM dentro del banner (solo se le
   * antepone el "No se creó la orden..."), incluido el `{"err": "El usuario no
   * tiene una sucursal asignada."}` del requisito muerto de `sucursal_default`.
   */
  const handleServerError = (parsed: ParsedCorteMangaOrderError) => {
    const next: Record<string, string> = {};
    (Object.keys(parsed.fieldErrors) as (keyof typeof parsed.fieldErrors)[]).forEach(
      (field) => {
        const message = parsed.fieldErrors[field];
        if (message) next[field] = message;
      },
    );
    setErrors((prev) => ({ ...prev, ...next }));

    if (parsed.duplicate) {
      setDuplicate(parsed.duplicate);
      setServerBanner(null);
      return;
    }
    setDuplicate(null);

    const hasFieldErrors = Object.keys(parsed.fieldErrors).length > 0;
    const detail =
      parsed.formError ?? (hasFieldErrors ? "Revisa los campos marcados." : "Intenta de nuevo.");
    setServerBanner(`No se creó la orden de corte de manga. ${detail}`);
  };

  const { mutateAsync: createOrder, isPending: isCreating } =
    useCreateCorteMangaOrder(handleServerError);

  // ─── Formulario ───────────────────────────────────────────────────────────
  const defaultValues = useMemo<CreateCorteMangaOrderFormValues>(
    () => ({ pedido: 0, prioridad: 1, observaciones: "" }),
    [],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);
      setDuplicate(null);

      const parsed = CreateCorteMangaOrderFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }
      setErrors({});

      // Guarda contra el doble envío: crear una orden consume un folio de la
      // serie y no existe endpoint para cancelarla.
      if (submitInFlight.current) return;
      submitInFlight.current = true;
      setIsSubmitting(true);

      try {
        await createOrder(buildCorteMangaOrderPayload(parsed.data));
        form.reset(defaultValues);
        setErrors({});
        setServerBanner(null);
        setDuplicate(null);
        onSuccess?.();
      } catch {
        // Ya repartido por `handleServerError` (banner + campos) y notificado
        // por toast desde la mutación.
      } finally {
        setIsSubmitting(false);
        submitInFlight.current = false;
      }
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    pedidoOptions,
    operadorAsignado,
    folioPreview,
    isLoadingCatalog,
    isErrorCatalog,
    catalogError,
    refetchCatalog,
    isPending: isSubmitting || isCreating,
    serverBanner,
    duplicate,
    dismissBanner: () => setServerBanner(null),
    dismissDuplicate: () => setDuplicate(null),
    getError,
    clearError,
    handleFormSubmit,
  };
}

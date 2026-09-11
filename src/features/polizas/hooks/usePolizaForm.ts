"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import {
  PolizaFormSchema,
  createEmptyPolizaForm,
  createEmptyPolizaLine,
  type PolizaFormValues,
} from "../schemas/poliza.schema";
import { buildPolizaPayload } from "../utils/buildPolizaPayload";
import { contabilizarPoliza } from "../services/actions";
import {
  parsePolizaError,
  polizaErrorToastMessage,
  type ParsedPolizaError,
} from "../utils/parsePolizaError";
import { useCreatePoliza } from "./useCreatePoliza";
import { useCuentasContables } from "./useCuentasContables";
import { useCentrosCosto } from "./useCentrosCosto";

const LINE_ERROR_PREFIX = "poliza_detalles";

/**
 * Detecta la ruta de un CAMPO de un movimiento (`poliza_detalles.<i>.<campo>`) y
 * captura su índice (grupo 1) y el nombre del campo (grupo 2), para derivar la
 * clave del error a nivel de línea (`poliza_detalles.<i>._form`) de esa misma
 * línea. Mismo mecanismo que `useCreditNoteForm`/`useStockTransferForm`.
 */
const LINE_FIELD_PATH_RE = new RegExp(`^${LINE_ERROR_PREFIX}\\.(\\d+)\\.(.+)$`);

/**
 * Valores iniciales del formulario, con la sucursal ya sembrada.
 *
 * Vive a nivel de MÓDULO —no dentro del hook— para que su identidad sea estable
 * y el `useMemo` de abajo dependa solo de la sucursal. Devuelve un objeto NUEVO
 * en cada llamada a propósito: reusar uno memoizado haría que una sola instancia
 * de `poliza_detalles` respaldara el montaje inicial y todos los `reset`, y
 * bastaría una escritura en sitio del arreglo para que la siguiente alta
 * arrancara con los movimientos de la anterior.
 */
const buildFormDefaults = (sucursal: number): PolizaFormValues => ({
  ...createEmptyPolizaForm(),
  sucursal,
});

/**
 * Ruta de un issue de Zod → `name` del control en el DOM.
 *
 * Son dos convenciones distintas para lo mismo: Zod entrega
 * `["poliza_detalles", 0, "cargo"]` y TanStack Form nombra ese campo
 * `poliza_detalles[0].cargo` (con corchetes), que es el `name` —y por tanto el
 * `id`— que acaba en el input. `scrollToFirstValidationError` empareja por
 * `name`, así que sin esta traducción los errores de los movimientos no
 * encontrarían su campo.
 *
 * El mapa de errores de este hook sigue usando la forma con PUNTOS
 * (`poliza_detalles.0.cargo`), que es la que consulta `getError` en la vista;
 * esta conversión es solo para el emparejamiento con el DOM.
 */
const fieldNameFromIssuePath = (path: readonly PropertyKey[]): string =>
  path.reduce<string>(
    (name, segment) =>
      typeof segment === "number"
        ? `${name}[${segment}]`
        : name
          ? `${name}.${String(segment)}`
          : String(segment),
    "",
  );

export function usePolizaForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();

  // ── Catálogos ────────────────────────────────────────────────────────────
  // Se piden al montar el CONTENIDO del diálogo (que solo se monta mientras está
  // abierto), así que la carga es bajo demanda. Los tres alimentan tanto los
  // selectores como las etiquetas de lo ya elegido en cada renglón, por eso se
  // cargan UNA vez aquí y se pasan hacia abajo en vez de que cada selector traiga
  // los suyos — mismo reparto que `useStockTransferForm`.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);
  const {
    branches,
    isLoading: isLoadingBranches,
    isError: isErrorBranches,
  } = useCompanyBranches(selectedCompany.id);
  const {
    cuentasContables,
    isLoading: isLoadingCuentas,
    isError: isErrorCuentas,
  } = useCuentasContables();
  const {
    centrosCosto,
    isLoading: isLoadingCentros,
    isError: isErrorCentros,
  } = useCentrosCosto();

  const isLoadingFormData = isLoadingBranches || isLoadingCuentas || isLoadingCentros;
  // Si CUALQUIER catálogo falla no se puede armar el formulario con selectores
  // válidos: una lista vacía por error de red se confundiría con un catálogo
  // legítimamente vacío y mandaría al usuario a "crear" datos que sí existen.
  // Mismo patrón que `useStockTransferForm`.
  const isErrorFormData = isErrorBranches || isErrorCuentas || isErrorCentros;

  /**
   * Prerrequisitos de captura. Sin cuentas contables que acepten movimientos no
   * hay asiento posible, y sin sucursal no hay cabecera: son bloqueos de
   * CONFIGURACIÓN, no errores, y se distinguen del estado de error de red.
   * Los centros de costo NO entran: son opcionales en los dos niveles.
   */
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (branches.length === 0) items.push("Al menos una sucursal activa");
    if (cuentasContables.length === 0) {
      items.push(
        "Cuentas contables activas que acepten movimientos (catálogo contable)",
      );
    }
    return items;
  }, [branches.length, cuentasContables.length]);

  // ── Estado de UI ─────────────────────────────────────────────────────────
  // Errores indexados por ruta ("folio", "poliza_detalles.0.cargo").
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  // Cambia en CADA rechazo (aunque el mensaje sea idéntico al anterior), para que
  // la vista pueda desplazarse al banner en cada intento fallido y no solo cuando
  // el texto cambia. Mismo recurso que `useStockTransferForm`.
  const [bannerErrorTick, setBannerErrorTick] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario del DOM, para llevar a la vista el primer campo inválido tras una
  // validación local fallida. Mismo cableado que `useEmployeeForm` y
  // `useCustomerForm`: la ref vive en el hook y la vista la engancha al `<form>`.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Claves estables por movimiento, para que borrar uno intermedio no reutilice
  // el estado local de otro. Arranca con dos: los del formulario vacío.
  const lineKeyCounter = useRef(2);
  const [lineKeys, setLineKeys] = useState<number[]>([0, 1]);

  // ── Helpers de errores ───────────────────────────────────────────────────
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      // Al limpiar el error de un CAMPO de un movimiento se limpia también el de
      // LÍNEA (`_form`): si el usuario edita el renglón lo está corrigiendo, así
      // que el aviso del backend deja de ser vigente.
      const match = LINE_FIELD_PATH_RE.exec(path);
      const lineFormKey =
        match && match[2] !== "_form"
          ? `${LINE_ERROR_PREFIX}.${match[1]}._form`
          : null;
      const keys = [path, lineFormKey].filter((key): key is string => key !== null);
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  /**
   * Descarta TODOS los errores de movimiento (y el banner). Se usa al QUITAR un
   * renglón, porque el borrado recorre los índices posteriores y sus errores
   * quedarían mal atribuidos. Agregar al final no los recorre, así que `addLine`
   * no la invoca.
   */
  const resetLineErrors = () => {
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(LINE_ERROR_PREFIX)) next[key] = value;
      }
      return next;
    });
    setServerBanner(null);
  };

  // ── Reparto del error del backend ────────────────────────────────────────
  const handleServerError = (parsed: ParsedPolizaError) => {
    const next: Record<string, string> = {};

    (Object.keys(parsed.fieldErrors) as (keyof typeof parsed.fieldErrors)[]).forEach(
      (field) => {
        const message = parsed.fieldErrors[field];
        if (message) next[field] = message;
      },
    );

    Object.entries(parsed.lineErrors).forEach(([index, fields]) => {
      Object.entries(fields).forEach(([field, message]) => {
        next[`${LINE_ERROR_PREFIX}.${index}.${field}`] = message;
      });
    });

    setErrors((prev) => ({ ...prev, ...next }));

    const hasFieldOrLine =
      Object.keys(parsed.fieldErrors).length > 0 ||
      Object.keys(parsed.lineErrors).length > 0;
    const detail =
      parsed.formError ??
      (hasFieldOrLine ? "Revisa los campos marcados." : "Intenta de nuevo.");
    // El alta es atómica (`@transaction.atomic` en `perform_create`): se le dice
    // al usuario explícitamente que NADA quedó registrado —ni la cabecera ni un
    // solo movimiento—, para que no busque una póliza a medias ni reintente
    // creyendo que duplicará algo.
    setServerBanner(`No se registró ninguna póliza. ${detail}`);
    setBannerErrorTick((tick) => tick + 1);
  };

  const { mutateAsync: createPolizaMutation, isPending: isCreating } =
    useCreatePoliza(handleServerError);

  // ── Formulario ───────────────────────────────────────────────────────────
  /**
   * La sucursal arranca con la del workspace activo: es la que el usuario ya
   * eligió al entrar y la que el backend va a validar contra su empresa. Sigue
   * siendo editable (un usuario con varias sucursales puede capturar para otra),
   * igual que en `useSerieFolioForm`.
   */
  const sucursalPorDefecto = selectedBranch?.id ?? 0;

  // Memoizado (a diferencia del resto del módulo, donde el React Compiler ya lo
  // hace) porque `useForm` recibe `defaultValues` en cada `update`: un objeto
  // nuevo por render lo tentaría a reinicializar el store mientras el usuario
  // escribe. Se recalcula solo si cambia la sucursal activa.
  const defaultValues = useMemo<PolizaFormValues>(
    () => buildFormDefaults(sucursalPorDefecto),
    [sucursalPorDefecto],
  );

  /**
   * Contabiliza la póliza RECIÉN CREADA, encadenando la acción al alta.
   *
   * Se llama a la acción directamente en vez de a `useContabilizarPoliza`
   * porque el mensaje al usuario es distinto: aquí lo importante no es solo el
   * motivo del rechazo, sino que la póliza SÍ QUEDÓ GUARDADA como borrador. El
   * toast genérico del hook diría solo la mitad. La invalidación se hace a mano,
   * que es lo único que se pierde al no usarlo.
   *
   * Nunca es un `PATCH { estatus }`: contabilizar pasa siempre por la acción.
   */
  const contabilizarRecienCreada = async (poliza: {
    id: number;
    folio: string | null;
  }) => {
    const etiqueta = poliza.folio || `#${poliza.id}`;
    try {
      await contabilizarPoliza(poliza.id);
      toast.success(`Póliza ${etiqueta} registrada y contabilizada`);
    } catch (error) {
      console.error(error);
      const parsed = parsePolizaError(error, "No se pudo contabilizar la póliza.");
      const motivo = polizaErrorToastMessage(
        parsed,
        "No se pudo contabilizar la póliza.",
      );
      toast.error(
        `La póliza ${etiqueta} se guardó como Borrador, pero NO se contabilizó: ${motivo}\nPuedes contabilizarla desde el listado.`,
        // Más tiempo del habitual: es un resultado PARCIAL y el usuario tiene que
        // leer las dos mitades (qué se guardó y qué no) antes de que desaparezca.
        { duration: 10000 },
      );
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["polizas"] });
    }
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      const parsed = PolizaFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        // Sin esto el envío fallido no produce NINGÚN cambio visible cuando el
        // campo culpable está fuera de la vista: el mensaje se pinta bajo un
        // campo que el usuario no tiene en pantalla (el caso típico es `folio`,
        // arriba del todo, mientras se capturan los movimientos), y desde su
        // punto de vista el botón "Guardar" no hizo nada. El helper compartido
        // elige el primer control inválido por ORDEN DEL DOM —no por el orden en
        // que Zod emite los issues— y difiere el scroll un frame para que los
        // mensajes ya estén pintados.
        scrollToFirstValidationError(
          formRef.current,
          parsed.error.issues.map((issue) => fieldNameFromIssuePath(issue.path)),
        );
        return;
      }
      setErrors({});

      // El reenvío concurrente ya lo impide `form.handleSubmit()`, que se niega a
      // reentrar mientras hay un envío en vuelo; no hace falta un candado propio.
      setIsSubmitting(true);

      try {
        const poliza = await createPolizaMutation(buildPolizaPayload(parsed.data));

        // El POST SIEMPRE crea un borrador. Si la intención era contabilizar, se
        // encadena la acción — que es la única que valida el cuadre.
        if (parsed.data.estatus_objetivo === "Contabilizada") {
          await contabilizarRecienCreada(poliza);
        } else {
          toast.success(
            `Borrador de póliza ${poliza.folio || `#${poliza.id}`} guardado`,
          );
        }

        // Valores frescos en cada limpieza: reusar un objeto memoizado haría que
        // una sola instancia de `poliza_detalles` respaldara el montaje inicial y
        // todos los `reset`, y bastaría una escritura en sitio del arreglo para
        // que la siguiente alta arrancara con los movimientos de la anterior.
        form.reset(buildFormDefaults(sucursalPorDefecto));
        setLineKeys([lineKeyCounter.current++, lineKeyCounter.current++]);
        setErrors({});
        setServerBanner(null);
        onSuccess?.();
      } catch {
        // El error del ALTA ya se repartió en `handleServerError` (banner +
        // errores por campo/movimiento) y el toast salió desde la mutación. Se
        // captura aquí a propósito: sin este `catch`, el rechazo de `mutateAsync`
        // escaparía por el `void form.handleSubmit()` como unhandled rejection.
        // El fallo de `contabilizarRecienCreada` NO llega aquí: lo maneja ella y
        // no relanza, porque la póliza sí se creó y el formulario debe limpiarse.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ── Movimientos ──────────────────────────────────────────────────────────
  const addLine = () => {
    const key = lineKeyCounter.current++;
    form.pushFieldValue("poliza_detalles", createEmptyPolizaLine());
    setLineKeys((prev) => [...prev, key]);
    // Agregar al FINAL no recorre los índices existentes, así que sus errores
    // siguen siendo válidos y se conservan a propósito. Solo se limpia el error
    // del arreglo (mínimo de movimientos, descuadre), que acaba de recalcularse.
    clearError("poliza_detalles");
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("poliza_detalles", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  // ── Submit / reset ───────────────────────────────────────────────────────
  /**
   * Envía el formulario fijando primero la INTENCIÓN con la que se envía.
   *
   * Vive en los VALORES del formulario (y no como argumento del envío) porque el
   * `superRefine` del esquema aplica reglas distintas según cuál sea: a un
   * borrador no se le exige todavía cuadrar. `setFieldValue` escribe en el store
   * de forma síncrona, así que el `handleSubmit` de la línea siguiente ya lee el
   * valor nuevo. Mismo mecanismo que `submitAs` en notas de crédito.
   */
  const submitAs = (objetivo: PolizaFormValues["estatus_objetivo"]) => {
    form.setFieldValue("estatus_objetivo", objetivo);
    void form.handleSubmit();
  };

  /**
   * `onSubmit` nativo del `<form>`: se dispara al pulsar Enter dentro de un
   * campo. Guarda como BORRADOR, la opción inocua — contabilizar cierra un
   * asiento contable y no debe poder ocurrir por un Enter accidental; para eso
   * está su botón explícito.
   */
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    submitAs("Borrador");
  };

  const handleReset = () => {
    form.reset(buildFormDefaults(sucursalPorDefecto));
    setLineKeys([lineKeyCounter.current++, lineKeyCounter.current++]);
    setErrors({});
    setServerBanner(null);
  };

  return {
    form,
    formRef,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    branches,
    cuentasContables,
    centrosCosto,
    lineKeys,
    serverBanner,
    bannerErrorTick,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    addLine,
    removeLine,
    submitAs,
    handleFormSubmit,
    handleReset,
  };
}

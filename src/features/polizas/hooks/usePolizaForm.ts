"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { fieldNameFromIssuePath } from "@/src/utils/fieldNameFromIssuePath";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useValidWorkspaceBranchId } from "@/src/features/workspace/hooks/useValidWorkspaceBranchId";
import {
  getSinSucursalMessage,
  WORKSPACE_BRANCH_LOADING_MESSAGE,
  type WorkspaceBranchDocument,
} from "@/src/features/workspace/utils/workspaceBranchMessages";
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
import { useChartOfAccounts } from "@/src/features/chart-of-accounts/hooks/useChartOfAccounts";
import { useCostCenters } from "@/src/features/cost-centers/hooks/useCostCenters";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";

const LINE_ERROR_PREFIX = "poliza_detalles";

/** La póliza en los textos del aviso compartido de sucursal. */
export const POLIZA_SUCURSAL_DOCUMENT: WorkspaceBranchDocument = {
  asignarA: "a la póliza",
  guardar: "la póliza",
};

/**
 * Detecta la ruta de un CAMPO de un movimiento (`poliza_detalles.<i>.<campo>`) y
 * captura su índice (grupo 1) y el nombre del campo (grupo 2), para derivar la
 * clave del error a nivel de línea (`poliza_detalles.<i>._form`) de esa misma
 * línea. Mismo mecanismo que `useCreditNoteForm`/`useStockTransferForm`.
 */
const LINE_FIELD_PATH_RE = new RegExp(`^${LINE_ERROR_PREFIX}\\.(\\d+)\\.(.+)$`);

export function usePolizaForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const queryClient = useQueryClient();

  // ── Catálogos ────────────────────────────────────────────────────────────
  // Se piden al montar el CONTENIDO del diálogo (que solo se monta mientras está
  // abierto), así que la carga es bajo demanda. Los tres alimentan tanto los
  // selectores como las etiquetas de lo ya elegido en cada renglón, por eso se
  // cargan UNA vez aquí y se pasan hacia abajo en vez de que cada selector traiga
  // los suyos — mismo reparto que `useStockTransferForm`.
  // La sucursal NO se captura (EC-676, mismo criterio que RH en EC-623): es la
  // del workspace, solo si es válida entre las sucursales del usuario
  // (`useValidWorkspaceBranchId`, sin respaldo a una fija). Sin ella el
  // formulario avisa (`WorkspaceBranchNotice`) y el guardado se bloquea.
  const {
    branchId: sucursalId,
    isLoading: isLoadingWorkspaceBranch,
    isError: isErrorWorkspaceBranch,
  } = useValidWorkspaceBranchId();
  // Nombre de la sucursal para el campo de solo lectura: `mis-sucursales` (la
  // misma consulta en caché que valida el id); si no está, el id.
  const companyId = useSessionCompanyId();
  const { branches } = useCompanyBranches(companyId);
  const sucursalLabel =
    sucursalId === null
      ? ""
      : (branches.find((branch) => branch.id === sucursalId)?.nombre ??
        `Sucursal #${sucursalId}`);
  /** Sin sucursal válida (ya resuelta): el formulario avisa y no guarda. */
  const isSucursalMissing = !isLoadingWorkspaceBranch && sucursalId === null;
  // Solo cuentas que admiten un asiento DIRECTO: el filtro va al servidor. Una
  // cuenta de agrupación (`acepta_movimientos=false`, las que solo suman a sus
  // hijas) no puede recibir un cargo o un abono, y una inactiva no debe
  // ofrecerse. El backend NO impone esta regla —`PolizaDetalle.cuenta_contable`
  // acepta cualquier cuenta de la empresa—, así que este filtro es lo único que
  // lo impide.
  const {
    cuentasContables,
    isLoading: isLoadingCuentas,
    isError: isErrorCuentas,
  } = useChartOfAccounts({ acepta_movimientos: true, activo: true });
  // Solo los centros de costo ACTIVOS: el filtro va al servidor, igual que el de
  // las cuentas. Uno dado de baja sigue en el catálogo y en las pólizas que ya lo
  // usan, pero no debe ofrecerse en una captura nueva. Alimenta los DOS
  // selectores —el de la cabecera y el de cada movimiento—, que son dos campos
  // distintos del mismo catálogo (`Poliza` y `PolizaDetalle` declaran cada uno su
  // FK a `CentroCosto`): una sola entrada de caché sirve a los dos.
  const {
    centrosCosto,
    isLoading: isLoadingCentros,
    isError: isErrorCentros,
  } = useCostCenters({ activo: true });

  const isLoadingFormData = isLoadingCuentas || isLoadingCentros;
  // Si CUALQUIER catálogo falla no se puede armar el formulario con selectores
  // válidos: una lista vacía por error de red se confundiría con un catálogo
  // legítimamente vacío y mandaría al usuario a "crear" datos que sí existen.
  // Cuentas y centros de costo siguen con su `isError` crudo: un refetch
  // fallido de esos dos todavía cambia el formulario por el error. Pendiente en
  // #239. La sucursal no entra: su falta la explica `WorkspaceBranchNotice`.
  const isErrorFormData = isErrorCuentas || isErrorCentros;

  /**
   * Prerrequisitos de captura. Sin cuentas contables que acepten movimientos no
   * hay asiento posible: es un bloqueo de CONFIGURACIÓN, no un error, y se
   * distingue del estado de error de red. Los centros de costo NO entran: son
   * opcionales en los dos niveles. La sucursal tampoco: sale del workspace y su
   * falta la avisa `WorkspaceBranchNotice`.
   */
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (cuentasContables.length === 0) {
      items.push(
        "Cuentas contables activas que acepten movimientos (catálogo contable)",
      );
    }
    return items;
  }, [cuentasContables.length]);

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
  // `useState` con inicializador: `useForm` recibe `defaultValues` en cada
  // `update`, y un objeto nuevo por render lo tentaría a reinicializar el store
  // mientras el usuario escribe. La sucursal NO vive aquí: se agrega al validar
  // (ver `onSubmit`), así que los valores iniciales no dependen del workspace.
  // Cada `reset` usa un objeto NUEVO (`createEmptyPolizaForm()`): reusar este
  // haría que una sola instancia de `poliza_detalles` respaldara todas las
  // altas, y una escritura en sitio arrastraría movimientos a la siguiente.
  const [defaultValues] = useState<PolizaFormValues>(createEmptyPolizaForm);

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

      // La sucursal sale del contexto, no de un campo: se revisa ANTES que el
      // resto para no hacer corregir todo el formulario y bloquear al final.
      if (isLoadingWorkspaceBranch) {
        toast.error(WORKSPACE_BRANCH_LOADING_MESSAGE, { id: "poliza-sin-sucursal" });
        return;
      }
      if (sucursalId === null) {
        toast.error(getSinSucursalMessage(isErrorWorkspaceBranch, POLIZA_SUCURSAL_DOCUMENT), {
          id: "poliza-sin-sucursal",
        });
        return;
      }

      const parsed = PolizaFormSchema.safeParse({ ...value, sucursal: sucursalId });
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
        form.reset(createEmptyPolizaForm());
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
    form.reset(createEmptyPolizaForm());
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
    sucursalLabel,
    isSucursalMissing,
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

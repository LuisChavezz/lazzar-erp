/**
 * useReflectiveState.ts
 * Hook para manejar las configuraciones de reflejante:
 * - Mantiene la lista de configuraciones (opción, posiciones, tipo).
 * - Valida campos y detecta posiciones duplicadas entre configuraciones.
 * - Expone la construcción del payload `reflejantes` y utilidades de edición.
 */
import { useCallback, useMemo, useState } from "react";
import {
  createReflectiveConfigForm,
  type ReflectiveConfigFieldErrors,
  type ReflectiveConfigForm,
} from "../utils/reflective-form";
import type { QuoteItem } from "../types";

interface ReflectiveValidationResult {
  hasError: boolean;
  firstErrorConfigId: string | null;
  errorsByConfig: Record<string, ReflectiveConfigFieldErrors>;
}

/**
 * buildInitialReflectiveConfigs
 * Convierte las especificaciones existentes de `QuoteItem` en formularios
 * editables agrupados por `opcion+tipo`. Si no hay especificaciones, devuelve
 * una configuración vacía por defecto para facilitar la UX.
 */
const buildInitialReflectiveConfigs = (
  item?: QuoteItem | null
): ReflectiveConfigForm[] => {
  const specs = item?.reflejantes?.especificaciones ?? [];
  if (specs.length === 0) {
    return [createReflectiveConfigForm()];
  }

  const grouped = new Map<string, ReflectiveConfigForm>();
  for (const spec of specs) {
    const key = `${spec.opcion}::${spec.tipo}`;
    const existing = grouped.get(key);
    if (existing) {
      if (!existing.posiciones.includes(spec.posicion)) {
        existing.posiciones.push(spec.posicion);
      }
      continue;
    }

    grouped.set(
      key,
      createReflectiveConfigForm({
        opcion: spec.opcion,
        posiciones: [spec.posicion],
        tipo: spec.tipo,
      })
    );
  }

  return Array.from(grouped.values());
};

/**
 * useReflectiveState
 * Hook público que administra el estado de los reflejantes: creación,
 * edición, eliminación, validación y construcción del payload listo para enviar.
 */
export function useReflectiveState(initialItem?: QuoteItem | null) {
  const [hasReflective, setHasReflective] = useState(
    Boolean(initialItem?.reflejantes?.activo)
  );
  const [configs, setConfigs] = useState<ReflectiveConfigForm[]>(() =>
    buildInitialReflectiveConfigs(initialItem)
  );
  const [observaciones, setObservaciones] = useState(
    initialItem?.reflejantes?.observaciones ?? ""
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const addConfig = useCallback(() => {
    const newConfig = createReflectiveConfigForm();
    setConfigs((prev) => [newConfig, ...prev]);
    return newConfig.id;
  }, []);

  const removeConfig = useCallback((id: string) => {
    setConfigs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((config) => config.id !== id);
    });
  }, []);

  const updateConfig = useCallback(
    (
      id: string,
      field: "opcion" | "posiciones" | "tipo",
      value: string | string[]
    ) => {
      setConfigs((prev) =>
        prev.map((config) =>
          config.id === id
            ? {
                ...config,
                [field]: value,
              }
            : config
        )
      );
    },
    []
  );

  const validation = useMemo<ReflectiveValidationResult>(() => {
    if (!hasReflective) {
      return {
        hasError: false,
        firstErrorConfigId: null,
        errorsByConfig: {},
      };
    }

    const errorsByConfig: Record<string, ReflectiveConfigFieldErrors> = {};
    const firstByPosition = new Map<string, string>();

    const setError = (
      configId: string,
      key: keyof ReflectiveConfigFieldErrors,
      message: string
    ) => {
      errorsByConfig[configId] = {
        ...(errorsByConfig[configId] ?? {}),
        [key]: message,
      };
    };

    configs.forEach((config) => {
      if (!config.opcion.trim()) {
        setError(config.id, "opcion", "Selecciona una opción.");
      }

      if (!config.tipo.trim()) {
        setError(config.id, "tipo", "Selecciona un tipo.");
      }

      if (config.posiciones.length === 0) {
        setError(config.id, "posiciones", "Selecciona al menos una posición.");
        return;
      }

      config.posiciones.forEach((posicion) => {
        const firstConfigId = firstByPosition.get(posicion);
        if (firstConfigId && firstConfigId !== config.id) {
          const duplicateMsg =
            "Esta posición ya fue usada en otra configuración.";
          setError(config.id, "posiciones", duplicateMsg);
          setError(firstConfigId, "posiciones", duplicateMsg);
          return;
        }
        firstByPosition.set(posicion, config.id);
      });
    });

    const firstErrorConfigId =
      configs.find((config) => Boolean(errorsByConfig[config.id]))?.id ?? null;

    return {
      hasError: Boolean(firstErrorConfigId),
      firstErrorConfigId,
      errorsByConfig,
    };
  }, [configs, hasReflective]);

  const buildPayload = useCallback(() => {
    if (!hasReflective) {
      return undefined;
    }

    const especificaciones = configs.flatMap((config) =>
      config.posiciones.map((posicion) => ({
        opcion: config.opcion,
        posicion,
        tipo: config.tipo,
      }))
    );

    return {
      activo: configs.length > 0,
      observaciones: observaciones.trim() || undefined,
      especificaciones,
    };
  }, [configs, hasReflective, observaciones]);

  const reset = useCallback((item?: QuoteItem | null) => {
    setHasReflective(Boolean(item?.reflejantes?.activo));
    setConfigs(buildInitialReflectiveConfigs(item));
    setObservaciones(item?.reflejantes?.observaciones ?? "");
    setSubmitAttempted(false);
  }, []);

  return {
    hasReflective,
    setHasReflective,
    configs,
    observaciones,
    setObservaciones,
    submitAttempted,
    setSubmitAttempted,
    addConfig,
    removeConfig,
    updateConfig,
    validation,
    buildPayload,
    reset,
  };
}

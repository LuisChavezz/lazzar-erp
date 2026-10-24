/**
 * useEmbroideryState.ts
 * Hook que encapsula la lógica para configurar bordados (especificaciones,
 * validaciones y construcción del payload). Maneja:
 * - Activación del servicio de bordado.
 * - Lista editable de especificaciones por ubicación.
 * - Validaciones por especificación (posiciones duplicadas, medidas y URL).
 * - Construcción del objeto `bordados` para el payload final.
 */
import { useCallback, useMemo, useState } from "react";
import {
  CUSTOM_EMBROIDERY_POSITION_NAME,
  isCustomEmbroideryPosition,
} from "../constants/embroideryPositions";
import {
  POSITION_OPTIONS,
  type EmbroiderySpecBooleanField,
  type EmbroiderySpecErrorsById,
  type EmbroiderySpecFieldErrors,
  type EmbroiderySpecForm,
  type QuoteItem,
} from "../types";
import { admitsCode, admitsProcess, type LocationRule } from "../utils/processCompatibility";

/**
 * IMAGE_URL_EXTENSION_REGEX & isValidImageUrl
 * Utilidad local para validar que una URL apunte a un recurso con extensión
 * de imagen conocida. Usada para validación de previsualizaciones.
 */
const IMAGE_URL_EXTENSION_REGEX =
  /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?(#.*)?$/i;

const REQUIRED_FIELD_ERROR = "Requerido";
const POSITIVE_NUMBER_ERROR = "Positivo";

const isValidImageUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }

  try {
    const parsed = new URL(trimmedValue);
    return (
      Boolean(parsed.protocol) &&
      IMAGE_URL_EXTENSION_REGEX.test(parsed.pathname + parsed.search + parsed.hash)
    );
  } catch {
    return false;
  }
};

/**
 * buildInitialEmbroiderySpecs
 * Traduce las especificaciones existentes de un `QuoteItem` a la forma
 * interna editable (`EmbroiderySpecForm[]`). Se usa durante inicialización
 * y reset del hook.
 */
const buildInitialEmbroiderySpecs = (
  item?: QuoteItem | null
): EmbroiderySpecForm[] =>
  item?.bordados?.especificaciones?.map((spec: NonNullable<QuoteItem["bordados"]>["especificaciones"][number], index: number) => ({
    id: `${spec.posicionCodigo}-${index}`,
    posicionCodigo: spec.posicionCodigo,
    posicionPersonalizada:
      spec.posicionPersonalizada ??
      (isCustomEmbroideryPosition(spec.posicionCodigo) &&
      spec.posicionNombre !== CUSTOM_EMBROIDERY_POSITION_NAME &&
      spec.posicionNombre !== spec.posicionCodigo
        ? spec.posicionNombre
        : ""),
    ancho: spec.ancho && spec.ancho > 0 ? String(spec.ancho) : "",
    alto: spec.alto && spec.alto > 0 ? String(spec.alto) : "",
    colorHilo: spec.colorHilo ?? "",
    pantones: spec.pantones ?? "",
    imagen: spec.imagen ?? "",
    nuevoPonchado: spec.nuevoPonchado ?? false,
    serigrafia: spec.serigrafia ?? false,
    sublimado: spec.sublimado ?? false,
    dtf: spec.dtf ?? false,
    revelado: spec.revelado ?? false,
  })) ?? [];

/**
 * useEmbroideryState
 * Hook público que expone el estado y operaciones para trabajar bordados
 * dentro del flujo de agregar/editar productos.
 */
export function useEmbroideryState(
  initialItem?: QuoteItem | null,
  /**
   * Ubicaciones que admite la prenda (o la selección) según la matriz
   * prenda/proceso (CO-05). Sin ella no se restringe.
   */
  positionRule?: LocationRule
) {
  const [hasEmbroidery, setHasEmbroidery] = useState(
    Boolean(initialItem?.bordados?.activo)
  );
  const [embroideryObservaciones, setEmbroideryObservaciones] = useState(
    initialItem?.bordados?.observaciones ?? ""
  );
  const [embroiderySpecs, setEmbroiderySpecs] = useState<EmbroiderySpecForm[]>(
    () => buildInitialEmbroiderySpecs(initialItem)
  );
  const [embroideryError, setEmbroideryError] = useState<string | null>(null);
  const [specErrors, setSpecErrors] = useState<EmbroiderySpecErrorsById>({});

  const positionMap = useMemo(
    () => new Map(POSITION_OPTIONS.map((position) => [position.codigo, position.nombre])),
    []
  );

  const addEmbroiderySpec = useCallback(() => {
    const newId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEmbroiderySpecs((prev) => [
      {
        id: newId,
        posicionCodigo: "",
        posicionPersonalizada: "",
        ancho: "",
        alto: "",
        colorHilo: "",
        pantones: "",
        imagen: "",
        nuevoPonchado: false,
        serigrafia: false,
        sublimado: false,
        dtf: false,
        revelado: false,
      },
      ...prev,
    ]);
  }, []);

  const removeEmbroiderySpec = useCallback((id: string) => {
    setEmbroiderySpecs((prev) => prev.filter((spec) => spec.id !== id));
    setSpecErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateEmbroiderySpec = useCallback(
    (
      id: string,
      field:
        | "posicionCodigo"
        | "posicionPersonalizada"
        | "ancho"
        | "alto"
        | "colorHilo"
        | "pantones"
        | "imagen",
      value: string
    ) => {
      setEmbroiderySpecs((prev) =>
        prev.map((spec) => {
          if (spec.id !== id) {
            return spec;
          }
          if (field === "posicionCodigo") {
            return {
              ...spec,
              posicionCodigo: value,
              posicionPersonalizada: isCustomEmbroideryPosition(value)
                ? spec.posicionPersonalizada
                : "",
            };
          }
          return { ...spec, [field]: value };
        })
      );
    },
    []
  );

  const toggleEmbroiderySpecBoolean = useCallback(
    (id: string, field: EmbroiderySpecBooleanField, value: boolean) => {
      setEmbroiderySpecs((prev) =>
        prev.map((spec) => {
          if (spec.id !== id) return spec;
          if (!value) return { ...spec, [field]: false };
          // Only one service can be active per spec — deselect all others first.
          return {
            ...spec,
            nuevoPonchado: false,
            serigrafia: false,
            sublimado: false,
            dtf: false,
            revelado: false,
            [field]: true,
          };
        })
      );

      setSpecErrors((prev) => {
        const currentErrors = prev[id];

        if (!currentErrors || (field === "nuevoPonchado" && value)) {
          return prev;
        }

        const nextSpecErrors: EmbroiderySpecFieldErrors = { ...currentErrors };

        if (nextSpecErrors.ancho === REQUIRED_FIELD_ERROR) {
          delete nextSpecErrors.ancho;
        }

        if (nextSpecErrors.alto === REQUIRED_FIELD_ERROR) {
          delete nextSpecErrors.alto;
        }

        if (Object.keys(nextSpecErrors).length === 0) {
          const nextErrors = { ...prev };
          delete nextErrors[id];
          return nextErrors;
        }

        return {
          ...prev,
          [id]: nextSpecErrors,
        };
      });
    },
    []
  );

  const validateEmbroidery = useCallback(() => {
    if (!hasEmbroidery) {
      setEmbroideryError(null);
      setSpecErrors({});
      return true;
    }

    let hasError = false;
    const nextErrors: EmbroiderySpecErrorsById = {};
    const usedPositions = new Set<string>();

    if (embroiderySpecs.length === 0) {
      setEmbroideryError(
        positionRule && !admitsProcess(positionRule.allowed)
          ? positionRule.notAdmittedMessage
          : "Agrega al menos una especificación."
      );
      return false;
    }

    embroiderySpecs.forEach((spec) => {
      const specError: EmbroiderySpecFieldErrors = {};

      if (!spec.posicionCodigo) {
        specError.posicion = "Requerido";
      } else if (positionRule && !admitsCode(positionRule.allowed, spec.posicionCodigo)) {
        // Se sigue viendo para poder quitarla, pero no se puede guardar.
        specError.posicion = positionRule.codeMessage(spec.posicionCodigo);
      } else if (
        !isCustomEmbroideryPosition(spec.posicionCodigo) &&
        usedPositions.has(spec.posicionCodigo)
      ) {
        specError.posicion = "Duplicado";
      } else if (!isCustomEmbroideryPosition(spec.posicionCodigo)) {
        usedPositions.add(spec.posicionCodigo);
      }

      if (
        isCustomEmbroideryPosition(spec.posicionCodigo) &&
        !spec.posicionPersonalizada.trim()
      ) {
        specError.posicionPersonalizada = "Describe la ubicación";
      }

      const normalizedAncho = spec.ancho.trim();
      if (spec.nuevoPonchado && !normalizedAncho) {
        specError.ancho = REQUIRED_FIELD_ERROR;
      } else if (normalizedAncho) {
        const ancho = Number(normalizedAncho);
        if (!Number.isFinite(ancho) || ancho <= 0) {
          specError.ancho = POSITIVE_NUMBER_ERROR;
        }
      }

      const normalizedAlto = spec.alto.trim();
      if (spec.nuevoPonchado && !normalizedAlto) {
        specError.alto = REQUIRED_FIELD_ERROR;
      } else if (normalizedAlto) {
        const alto = Number(normalizedAlto);
        if (!Number.isFinite(alto) || alto <= 0) {
          specError.alto = POSITIVE_NUMBER_ERROR;
        }
      }

      if (!isValidImageUrl(spec.imagen)) {
        specError.imagen = "Imagen del bordado inválida o faltante";
      }

      if (Object.keys(specError).length > 0) {
        nextErrors[spec.id] = specError;
        hasError = true;
      }
    });

    // El proceso no se admite en ninguna ubicación: se dice eso, no "completa".
    const processNotAdmitted = Boolean(positionRule && !admitsProcess(positionRule.allowed));

    setSpecErrors(nextErrors);
    setEmbroideryError(
      processNotAdmitted
        ? positionRule?.notAdmittedMessage ?? null
        : hasError
          ? "Completa las especificaciones."
          : null
    );

    return !hasError && !processNotAdmitted;
  }, [embroiderySpecs, hasEmbroidery, positionRule]);

  const buildPayload = useCallback(() => {
    if (!hasEmbroidery) {
      return undefined;
    }

    return {
      activo: true,
      observaciones: embroideryObservaciones.trim() || undefined,
      especificaciones: embroiderySpecs.map((spec) => ({
        posicionCodigo: spec.posicionCodigo,
        posicionNombre: isCustomEmbroideryPosition(spec.posicionCodigo)
          ? spec.posicionPersonalizada.trim() || CUSTOM_EMBROIDERY_POSITION_NAME
          : positionMap.get(spec.posicionCodigo) ?? "",
        posicionPersonalizada: spec.posicionPersonalizada.trim(),
        ancho: spec.ancho.trim() ? Math.max(0, Number(spec.ancho) || 0) : undefined,
        alto: spec.alto.trim() ? Math.max(0, Number(spec.alto) || 0) : undefined,
        colorHilo: spec.colorHilo.trim(),
        pantones: spec.pantones.trim(),
        imagen: spec.imagen.trim(),
        nuevoPonchado: spec.nuevoPonchado,
        serigrafia: spec.serigrafia,
        sublimado: spec.sublimado,
        dtf: spec.dtf,
        revelado: spec.revelado,
      })),
    };
  }, [
    embroideryObservaciones,
    embroiderySpecs,
    hasEmbroidery,
    positionMap,
  ]);

  const reset = useCallback((item?: QuoteItem | null) => {
    setHasEmbroidery(Boolean(item?.bordados?.activo));
    setEmbroideryObservaciones(item?.bordados?.observaciones ?? "");
    setEmbroiderySpecs(buildInitialEmbroiderySpecs(item));
    setEmbroideryError(null);
    setSpecErrors({});
  }, []);

  return {
    hasEmbroidery,
    setHasEmbroidery,
    embroideryObservaciones,
    setEmbroideryObservaciones,
    embroiderySpecs,
    embroideryError,
    specErrors,
    positionMap,
    addEmbroiderySpec,
    removeEmbroiderySpec,
    updateEmbroiderySpec,
    toggleEmbroiderySpecBoolean,
    validateEmbroidery,
    buildPayload,
    reset,
  };
}

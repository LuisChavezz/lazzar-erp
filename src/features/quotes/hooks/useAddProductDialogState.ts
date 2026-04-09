/**
 * useAddProductDialogState.ts
 * Contenedor (container hook) que orquesta los hooks de dominio para el
 * diálogo de agregar/editar productos. Composición de:
 * - `useProductSelection` (selección)
 * - `useEmbroideryState` (bordados)
 * - `useReflectiveState` (reflejantes)
 * - `useSizesState` (tallas)
 *
 * Este hook expone el estado del paso actual, funciones de navegación
 * (`onStepNext`, `onStepBack`), `onSaveItem` y props específicas para cada step
 * que son consumidas por la vista presentacional.
 */
import { useCallback, useMemo, useState } from "react";
import { POSITION_OPTIONS, THREAD_COLOR_OPTIONS, type AddProductDialogProps, type QuoteItem, type Step } from "../types";
import { useEmbroideryState } from "./useEmbroideryState";
import { useProductSelection } from "./useProductSelection";
import { useReflectiveState } from "./useReflectiveState";
import { useSizesState } from "./useSizesState";

/**
 * getDialogTitle
 * Resuelve el título del diálogo según el step y si es edición.
 */
const getDialogTitle = (step: Step, isEditing: boolean) => {
  if (step === "select") {
    return isEditing ? "Editar producto" : "Agregar productos";
  }

  if (step === "embroidery") {
    return "Configuración de bordado";
  }

  if (step === "reflective") {
    return "Configuración de reflejante";
  }

  return "Seleccionar tallas";
};

/**
 * useAddProductDialogState
 * Hook principal que compone los hooks de dominio y retorna una API lista
 * para pasar a la vista (`AddProductDialogView`). Controla recorrido de
 * pasos, validaciones y ensamblado final del/los items a agregar o editar.
 */
export function useAddProductDialogState({
  open,
  onOpenChange,
  onAddItem,
  onAddItems,
  onUpdateItem,
  initialItem,
  startStep = "select",
  sizes,
  products,
}: AddProductDialogProps) {
  const isEditing = Boolean(onUpdateItem && initialItem);
  const [step, setStep] = useState<Step>(startStep);
  const [hasSleevecut, setHasSleevecut] = useState(false);

  const productSelection = useProductSelection({ products, initialItem });
  const sizesState = useSizesState({ initialItem });
  const embroideryState = useEmbroideryState(initialItem);
  const reflectiveState = useReflectiveState(initialItem);

  const orderedSteps = useMemo<Step[]>(() => {
    const steps: Step[] = ["select"];
    if (embroideryState.hasEmbroidery) {
      steps.push("embroidery");
    }
    if (reflectiveState.hasReflective) {
      steps.push("reflective");
    }
    steps.push("sizes");
    return steps;
  }, [embroideryState.hasEmbroidery, reflectiveState.hasReflective]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(startStep);
      setHasSleevecut(false);
      productSelection.reset(initialItem);
      sizesState.reset(initialItem);
      embroideryState.reset(initialItem);
      reflectiveState.reset(initialItem);
    }

    onOpenChange(nextOpen);
  }, [
    embroideryState,
    initialItem,
    onOpenChange,
    productSelection,
    reflectiveState,
    sizesState,
    startStep,
  ]);

  const handleStepNext = useCallback(() => {
    if (step === "select" && productSelection.selectedRowIds.size === 0) {
      return;
    }

    if (step === "embroidery" && !embroideryState.validateEmbroidery()) {
      return;
    }

    if (step === "reflective" && reflectiveState.validation.hasError) {
      reflectiveState.setSubmitAttempted(true);
      return;
    }

    const currentIndex = orderedSteps.indexOf(step);
    const nextStep = orderedSteps[currentIndex + 1];
    if (!nextStep) {
      return;
    }

    if (nextStep === "sizes") {
      productSelection.openFirstSelectedProduct();
    }

    setStep(nextStep);
  }, [
    embroideryState,
    orderedSteps,
    productSelection,
    reflectiveState,
    step,
  ]);

  const handleStepBack = useCallback(() => {
    const currentIndex = orderedSteps.indexOf(step);
    const previousStep = orderedSteps[currentIndex - 1];
    if (previousStep) {
      setStep(previousStep);
    }
  }, [orderedSteps, step]);

  const handleSaveItem = useCallback(() => {
    const hasValidSizes = sizesState.validateSelectedRows(productSelection.selectedRows);
    if (!hasValidSizes) {
      return;
    }

    const isEmbroideryValid = embroideryState.hasEmbroidery
      ? embroideryState.validateEmbroidery()
      : true;
    if (!isEmbroideryValid) {
      return;
    }

    if (reflectiveState.hasReflective && reflectiveState.validation.hasError) {
      reflectiveState.setSubmitAttempted(true);
      setStep("reflective");
      return;
    }

    const bordados =
      embroideryState.hasEmbroidery && isEmbroideryValid
        ? embroideryState.buildPayload()
        : undefined;

    const reflejantes = reflectiveState.buildPayload();

    if (isEditing && onUpdateItem && initialItem) {
      const row = productSelection.selectedRows[0];
      if (!row) {
        return;
      }

      const itemSizes = sizesState.getItemSizes(row.id, sizes);
      const item: QuoteItem = {
        productoId: initialItem.productoId ?? row.productoId,
        descripcion: initialItem.descripcion ?? row.nombre,
        unidad: initialItem.unidad ?? row.unidad,
        cantidad: itemSizes.reduce((sum, size) => sum + size.cantidad, 0),
        precio: initialItem.precio ?? row.precio,
        descuento: initialItem.descuento ?? 0,
        importe: 0,
        tallas: itemSizes.map((size) => ({
          tallaId: size.id,
          nombre: size.nombre,
          cantidad: size.cantidad,
        })),
        bordados,
        reflejantes,
      };

      onUpdateItem(item);
      handleOpenChange(false);
      return;
    }

    const itemsToAdd: QuoteItem[] = productSelection.selectedRows.map((row) => {
      const itemSizes = sizesState.getItemSizes(row.id, sizes);
      return {
        productoId: row.productoId,
        descripcion: row.nombre,
        unidad: row.unidad,
        cantidad: itemSizes.reduce((sum, size) => sum + size.cantidad, 0),
        precio: row.precio,
        descuento: 0,
        importe: 0,
        tallas: itemSizes.map((size) => ({
          tallaId: size.id,
          nombre: size.nombre,
          cantidad: size.cantidad,
        })),
        bordados,
        reflejantes,
      };
    });

    if (onAddItems) {
      onAddItems(itemsToAdd);
    } else if (onAddItem) {
      for (const item of itemsToAdd) {
        onAddItem(item);
      }
    }

    handleOpenChange(false);
  }, [
    embroideryState,
    handleOpenChange,
    initialItem,
    isEditing,
    onAddItem,
    onAddItems,
    onUpdateItem,
    productSelection.selectedRows,
    reflectiveState,
    sizes,
    sizesState,
  ]);

  const canProceed = productSelection.selectedRowIds.size > 0;
  const isFirstStep = step === "select";
  const isLastStep = step === "sizes";
  const reflectiveHasBlockingError =
    step === "reflective" &&
    reflectiveState.submitAttempted &&
    reflectiveState.validation.hasError;

  const reflectiveErrorTargetId = reflectiveHasBlockingError
    ? reflectiveState.validation.firstErrorConfigId
    : null;

  return {
    open,
    isEditing,
    title: getDialogTitle(step, isEditing),
    step,
    orderedSteps,
    canProceed,
    isFirstStep,
    isLastStep,
    reflectiveHasBlockingError,
    onOpenChange: handleOpenChange,
    onStepNext: handleStepNext,
    onStepBack: handleStepBack,
    onSaveItem: handleSaveItem,
    selectStepProps: {
      search: productSelection.search,
      onSearchChange: (value: string) => productSelection.setSearch(value),
      rows: productSelection.rows,
      filteredRows: productSelection.filteredRows,
      selectedRowIds: productSelection.selectedRowIds,
      onToggleRow: productSelection.toggleRow,
      hasEmbroidery: embroideryState.hasEmbroidery,
      onToggleEmbroidery: (next: boolean) => embroideryState.setHasEmbroidery(next),
      hasReflective: reflectiveState.hasReflective,
      onToggleReflective: (next: boolean) => reflectiveState.setHasReflective(next),
      hasSleevecut,
      onToggleSleevecut: setHasSleevecut,
    },
    embroideryStepProps: {
      embroideryObservaciones: embroideryState.embroideryObservaciones,
      onObservacionesChange: (value: string) =>
        embroideryState.setEmbroideryObservaciones(value),
      embroiderySpecs: embroideryState.embroiderySpecs,
      onAddSpec: embroideryState.addEmbroiderySpec,
      onRemoveSpec: embroideryState.removeEmbroiderySpec,
      onUpdateSpec: embroideryState.updateEmbroiderySpec,
      onToggleSpecBoolean: embroideryState.toggleEmbroiderySpecBoolean,
      embroideryError: embroideryState.embroideryError,
      specErrors: embroideryState.specErrors,
      positionOptions: POSITION_OPTIONS,
      positionMap: embroideryState.positionMap,
      threadColorOptions: [...THREAD_COLOR_OPTIONS],
    },
    reflectiveStepProps: {
      configs: reflectiveState.configs,
      onAddConfig: reflectiveState.addConfig,
      onRemoveConfig: reflectiveState.removeConfig,
      onUpdateConfig: reflectiveState.updateConfig,
      errorsByConfig: reflectiveState.validation.errorsByConfig,
      showValidationErrors: reflectiveState.submitAttempted,
      generalError: reflectiveHasBlockingError
        ? "Corrige las configuraciones de reflejante para continuar."
        : null,
      scrollToConfigId: reflectiveErrorTargetId,
      observaciones: reflectiveState.observaciones,
      onObservacionesChange: (value: string) => reflectiveState.setObservaciones(value),
    },
    sizesStepProps: {
      selectedRows: productSelection.selectedRows,
      sizes,
      sizeQuantitiesPerProduct: sizesState.sizeQuantitiesPerProduct,
      updateSizeQuantity: sizesState.updateSizeQuantity,
      openProductId: productSelection.openProductId,
      onToggleProduct: productSelection.toggleProduct,
      sizeErrors: sizesState.sizeErrors,
    },
  };
}

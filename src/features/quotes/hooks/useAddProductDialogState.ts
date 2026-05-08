/**
 * useAddProductDialogState.ts
 * Contenedor (container hook) que orquesta los hooks de dominio para el
 * diálogo de agregar/editar productos. Composición de:
 * - `useProductSelection` (selección)
 * - `useEmbroideryState` (bordados)
 * - `useReflectiveState` (reflejantes)
 * - `useColorsState` (colores)
 * - `useSizesState` (tallas)
 *
 * Este hook expone el estado del paso actual, funciones de navegación
 * (`onStepNext`, `onStepBack`), `onSaveItem` y props específicas para cada step
 * que son consumidas por la vista presentacional.
 */
import { useCallback, useMemo, useState } from "react";
import type { Color } from "../../colors/interfaces/color.interface";
import type { Size } from "../../sizes/interfaces/size.interface";
import { POSITION_OPTIONS, type AddProductDialogProps, type QuoteItem, type Step } from "../types";
import { useColorsState } from "./useColorsState";
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

  if (step === "colors") {
    return "Selección de color";
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
  // Estado editable por el usuario — se inicializa desde initialItem y se resetea al cerrar el diálogo
  const [hasSleevecut, setHasSleevecut] = useState(Boolean(initialItem?.lleva_corte_manga));

  const productSelection = useProductSelection({ products, initialItem });
  const sizesState = useSizesState({ initialItem });
  const embroideryState = useEmbroideryState(initialItem);
  const reflectiveState = useReflectiveState(initialItem);
  const colorsState = useColorsState(initialItem);

  // Mapa de productId → colores únicos, derivado de las variantes del producto
  const productColorsById = useMemo<Record<number, Color[]>>(() => {
    const map: Record<number, Color[]> = {};
    for (const product of products) {
      if (!product.id) continue;
      const seen = new Set<number>();
      const colors: Color[] = [];
      for (const variant of product.variantes ?? []) {
        if (!seen.has(variant.color.id)) {
          seen.add(variant.color.id);
          colors.push(variant.color);
        }
      }
      map[product.id] = colors;
    }
    return map;
  }, [products]);

  // Mapa de productId → colorId → tallas disponibles para esa combinación de variante
  const productSizesByProductAndColor = useMemo<Record<number, Record<number, Size[]>>>(() => {
    const map: Record<number, Record<number, Size[]>> = {};
    for (const product of products) {
      if (!product.id) continue;
      const byColor: Record<number, Size[]> = {};
      for (const variant of product.variantes ?? []) {
        const colorId = variant.color.id;
        if (!byColor[colorId]) byColor[colorId] = [];
        const alreadyAdded = byColor[colorId].some((s) => s.id === variant.talla.id);
        if (!alreadyAdded) byColor[colorId].push(variant.talla);
      }
      map[product.id] = byColor;
    }
    return map;
  }, [products]);

  // Tallas disponibles por producto según el color seleccionado actualmente
  const sizesPerProduct = useMemo<Record<number, Size[]>>(() => {
    const map: Record<number, Size[]> = {};
    for (const row of productSelection.selectedRows) {
      const selectedColorId = colorsState.selectedColorPerProduct[row.id];
      const byColor = productSizesByProductAndColor[row.id];
      if (!byColor) {
        // Sin variantes → catálogo global de tallas como fallback
        map[row.id] = sizes;
        continue;
      }
      if (selectedColorId != null) {
        map[row.id] = byColor[selectedColorId] ?? [];
      } else {
        // Sin color seleccionado → todas las tallas únicas de todas las variantes
        const seen = new Set<number>();
        const all: Size[] = [];
        for (const sizesArr of Object.values(byColor)) {
          for (const s of sizesArr) {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              all.push(s);
            }
          }
        }
        map[row.id] = all.length > 0 ? all : sizes;
      }
    }
    return map;
  }, [productSelection.selectedRows, colorsState.selectedColorPerProduct, productSizesByProductAndColor, sizes]);

  const orderedSteps = useMemo<Step[]>(() => {
    const steps: Step[] = ["select"];
    if (embroideryState.hasEmbroidery) {
      steps.push("embroidery");
    }
    if (reflectiveState.hasReflective) {
      steps.push("reflective");
    }
    steps.push("colors");
    steps.push("sizes");
    return steps;
  }, [embroideryState.hasEmbroidery, reflectiveState.hasReflective]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(startStep);
      // Resetea al valor del item en edición, o false en modo creación
      setHasSleevecut(Boolean(initialItem?.lleva_corte_manga));
      productSelection.reset(initialItem);
      sizesState.reset(initialItem);
      embroideryState.reset(initialItem);
      reflectiveState.reset(initialItem);
      colorsState.reset(initialItem);
    }

    onOpenChange(nextOpen);
  }, [
    embroideryState,
    initialItem,
    onOpenChange,
    productSelection,
    reflectiveState,
    colorsState,
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

    if (step === "colors" && !colorsState.validateColors(productSelection.selectedRows, productColorsById)) {
      return;
    }

    const currentIndex = orderedSteps.indexOf(step);
    const nextStep = orderedSteps[currentIndex + 1];
    if (!nextStep) {
      return;
    }

    if (nextStep === "colors" || nextStep === "sizes") {
      productSelection.openFirstSelectedProduct();
    }

    setStep(nextStep);
  }, [
    embroideryState,
    orderedSteps,
    productSelection,
    productColorsById,
    reflectiveState,
    colorsState,
    step,
  ]);

  const handleStepBack = useCallback(() => {
    const currentIndex = orderedSteps.indexOf(step);
    const previousStep = orderedSteps[currentIndex - 1];
    if (previousStep) {
      setStep(previousStep);
    }
  }, [orderedSteps, step]);

  // Al cambiar el color de un producto, reinicia sus tallas para evitar cantidades incoherentes
  const handleSelectColor = useCallback(
    (productId: number, colorId: number) => {
      colorsState.selectColor(productId, colorId);
      sizesState.clearProductSizes(productId);
    },
    [colorsState, sizesState],
  );

  const handleSaveItem = useCallback(() => {
    const hasValidSizes = sizesState.validateSelectedRows(productSelection.selectedRows, sizesPerProduct);
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

      const itemSizes = sizesState.getItemSizes(row.id, sizesPerProduct[row.id] ?? sizes);
      const resolvedColorIdEdit =
        colorsState.selectedColorPerProduct[row.id] ?? initialItem.colorId ?? undefined;
      const resolvedColorEdit = resolvedColorIdEdit
        ? (productColorsById[row.id] ?? []).find((c) => c.id === resolvedColorIdEdit)
        : undefined;
      const item: QuoteItem = {
        productoId: initialItem.productoId ?? row.productoId,
        descripcion: initialItem.descripcion ?? row.nombre,
        unidad: initialItem.unidad ?? row.unidad,
        cantidad: itemSizes.reduce((sum, size) => sum + size.cantidad, 0),
        precio: initialItem.precio ?? row.precio,
        descuento: initialItem.descuento ?? 0,
        importe: 0,
        colorId: resolvedColorIdEdit,
        colorNombre: resolvedColorEdit?.nombre ?? initialItem.colorNombre,
        colorHex: resolvedColorEdit?.codigo_hex ?? initialItem.colorHex,
        availableSizes: sizesPerProduct[row.id] ?? sizes,
        lleva_corte_manga: hasSleevecut,
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
      const itemSizes = sizesState.getItemSizes(row.id, sizesPerProduct[row.id] ?? sizes);
      const resolvedColorId = colorsState.selectedColorPerProduct[row.id] ?? undefined;
      const resolvedColor = resolvedColorId
        ? (productColorsById[row.id] ?? []).find((c) => c.id === resolvedColorId)
        : undefined;
      return {
        productoId: row.productoId,
        descripcion: row.nombre,
        unidad: row.unidad,
        cantidad: itemSizes.reduce((sum, size) => sum + size.cantidad, 0),
        precio: row.precio,
        descuento: 0,
        importe: 0,
        colorId: resolvedColorId,
        colorNombre: resolvedColor?.nombre,
        colorHex: resolvedColor?.codigo_hex,
        availableSizes: sizesPerProduct[row.id] ?? sizes,
        lleva_corte_manga: hasSleevecut,
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
    colorsState,
    embroideryState,
    handleOpenChange,
    hasSleevecut,
    initialItem,
    isEditing,
    onAddItem,
    onAddItems,
    onUpdateItem,
    productColorsById,
    productSelection.selectedRows,
    reflectiveState,
    sizes,
    sizesPerProduct,
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
      onClearSelection: productSelection.clearSelection,
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
      sizesPerProduct,
      sizeQuantitiesPerProduct: sizesState.sizeQuantitiesPerProduct,
      updateSizeQuantity: sizesState.updateSizeQuantity,
      openProductId: productSelection.openProductId,
      onToggleProduct: productSelection.toggleProduct,
      sizeErrors: sizesState.sizeErrors,
    },
    colorsStepProps: {
      selectedRows: productSelection.selectedRows,
      productColorsById,
      selectedColorPerProduct: colorsState.selectedColorPerProduct,
      onSelectColor: handleSelectColor,
      openProductId: productSelection.openProductId,
      onToggleProduct: productSelection.toggleProduct,
      colorErrors: colorsState.colorErrors,
    },
  };
}

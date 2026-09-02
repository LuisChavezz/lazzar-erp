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
import { useCallback, useMemo, useRef, useState } from "react";
import type { Color } from "../../colors/interfaces/color.interface";
import type { Size } from "../../sizes/interfaces/size.interface";
import {
  MUESTRA_ROW_ID,
  POSITION_OPTIONS,
  type AddProductDialogProps,
  type CatalogRow,
  type MuestraDraft,
  type QuoteItem,
  type Step,
} from "../types";
import { useColorsState } from "./useColorsState";
import { useEmbroideryState } from "./useEmbroideryState";
import { useProductSelection } from "./useProductSelection";
import { useReflectiveState } from "./useReflectiveState";
import { useSizesState } from "./useSizesState";

/**
 * Aplana la descripción de una muestra a UNA sola línea.
 *
 * Los saltos de línea del textarea son comodidad de captura, no información:
 * `producto_nombre_externo` se persiste como texto plano. Colapsa cualquier
 * racha de espacios en blanco —saltos, tabulaciones, espacios repetidos— a un
 * solo espacio y recorta los extremos.
 *
 * Se aplica SOLO al ensamblar el item, nunca en el `onChange` del textarea:
 * mientras escribe, el usuario debe seguir viendo sus saltos de línea.
 */
const flattenMuestraNombre = (nombre: string): string =>
  nombre.replace(/\s+/g, " ").trim();

/**
 * getDialogTitle
 * Resuelve el título del diálogo según el step y si es edición.
 */
const getDialogTitle = (step: Step, isEditing: boolean) => {
  if (step === "select") {
    return isEditing ? "Editar producto" : "Agregar productos";
  }

  if (step === "describe") {
    return "Producto de muestra";
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
  startStep,
  variant = "catalogo",
  sizes,
  products,
}: AddProductDialogProps) {
  const isEditing = Boolean(onUpdateItem && initialItem);
  const isMuestra = variant === "muestra";
  // El primer paso depende de la variante: catálogo empieza eligiendo producto,
  // muestra empieza describiéndolo.
  const initialStep: Step = startStep ?? (isMuestra ? "describe" : "select");
  const [step, setStep] = useState<Step>(initialStep);

  // ─── Estado del paso "describe" (solo variante muestra) ────────────────────
  //
  // Una apertura puede capturar N muestras, igual que catálogo permite elegir N
  // productos. Cada borrador lleva su propio `id` NEGATIVO, que es la clave con
  // la que se indexa en los mapas del diálogo (`sizesPerProduct`,
  // `sizeQuantitiesPerProduct`, `sizeErrors`). Negativo para no poder colisionar
  // con un `producto.id` real; y se CORTA al ensamblar el item.
  const [muestraDrafts, setMuestraDrafts] = useState<MuestraDraft[]>(() => [
    { id: MUESTRA_ROW_ID, descripcion: "", precio: 0 },
  ]);
  const nextMuestraIdRef = useRef(MUESTRA_ROW_ID - 1);
  const [describeSubmitAttempted, setDescribeSubmitAttempted] = useState(false);

  /**
   * Acordeones ABIERTOS del paso de tallas, SOLO en la variante muestra.
   *
   * `useProductSelection.openProductId` guarda un único id, así que su acordeón
   * es de una fila a la vez. Eso le sirve a catálogo —donde el usuario ya vio la
   * lista y elige qué abrir—, pero en muestra la validación exige tallas en las
   * N entradas capturadas: con una sola abierta era fácil pulsar Agregar y
   * recibir "Sin tallas" en paneles que nunca se abrieron.
   *
   * Vive aquí, en estado propio de la variante, en vez de convertir
   * `openProductId` en un Set: ese id también lo consume el paso de COLORES y el
   * acordeón de catálogo, y generalizarlo les cambiaría el comportamiento.
   */
  const [openMuestraRowIds, setOpenMuestraRowIds] = useState<Set<number>>(
    () => new Set([MUESTRA_ROW_ID])
  );

  const toggleMuestraRow = useCallback((id: number) => {
    setOpenMuestraRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isDescribeValid =
    muestraDrafts.length > 0 &&
    muestraDrafts.every((d) => d.descripcion.trim() && d.precio > 0);

  const addMuestraDraft = useCallback(() => {
    setMuestraDrafts((prev) => [
      ...prev,
      { id: nextMuestraIdRef.current--, descripcion: "", precio: 0 },
    ]);
  }, []);

  const removeMuestraDraft = useCallback((id: number) => {
    setMuestraDrafts((prev) =>
      prev.length <= 1 ? prev : prev.filter((d) => d.id !== id)
    );
  }, []);

  const updateMuestraDraft = useCallback(
    (id: number, patch: Partial<Omit<MuestraDraft, "id">>) => {
      setMuestraDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
      setDescribeSubmitAttempted(false);
    },
    []
  );

  /**
   * Fila SINTÉTICA de la muestra.
   *
   * Los mapas del diálogo se indexan por `productoId`, y `selectedRows` sale de
   * `useProductSelection`, que solo conoce productos del catálogo. En vez de
   * tocar ese hook —lo que arriesgaría el flujo de catálogo— la variante muestra
   * inyecta aquí su propia fila con `MUESTRA_ROW_ID`. Vive solo en el diálogo.
   */
  const muestraRows = useMemo<CatalogRow[]>(
    () =>
      muestraDrafts.map((draft) => ({
        id: draft.id,
        productoId: draft.id,
        // Aplanado con el MISMO criterio que el ensamblado: el encabezado del
        // acordeón de tallas debe leerse igual que el nombre que se va a
        // guardar, no con los saltos de línea del textarea.
        nombre: flattenMuestraNombre(draft.descripcion) || "Producto de muestra",
        descripcion: flattenMuestraNombre(draft.descripcion),
        unidad: "PZA",
        precio: draft.precio,
        isActive: true,
      })),
    [muestraDrafts]
  );

  // Estado editable por el usuario — se inicializa desde initialItem y se resetea al cerrar el diálogo
  const [hasSleevecut, setHasSleevecut] = useState(Boolean(initialItem?.lleva_corte_manga));

  const productSelection = useProductSelection({ products, initialItem });
  const sizesState = useSizesState({ initialItem });
  const embroideryState = useEmbroideryState(initialItem);
  const reflectiveState = useReflectiveState(initialItem);
  const colorsState = useColorsState(initialItem);

  /**
   * Filas efectivas del diálogo. En catálogo son las seleccionadas por el
   * usuario; en muestra, la única fila sintética. Todo lo que abajo consumía
   * `productSelection.selectedRows` pasa por aquí, para que ambas variantes
   * compartan `sizesPerProduct`, tallas y cantidades sin ramificar en cada uso.
   */
  const effectiveSelectedRows = useMemo<CatalogRow[]>(
    () => (isMuestra ? muestraRows : productSelection.selectedRows),
    [isMuestra, muestraRows, productSelection.selectedRows]
  );

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
    for (const row of effectiveSelectedRows) {
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
  }, [effectiveSelectedRows, colorsState.selectedColorPerProduct, productSizesByProductAndColor, sizes]);

  const orderedSteps = useMemo<Step[]>(() => {
    // Muestra arranca describiendo y NO pasa por colores (no tiene). Los pasos
    // de servicios se agregan igual que en catálogo, con la misma condición.
    const steps: Step[] = [isMuestra ? "describe" : "select"];
    if (embroideryState.hasEmbroidery) {
      steps.push("embroidery");
    }
    if (reflectiveState.hasReflective) {
      steps.push("reflective");
    }
    if (!isMuestra) {
      steps.push("colors");
    }
    steps.push("sizes");
    return steps;
  }, [embroideryState.hasEmbroidery, isMuestra, reflectiveState.hasReflective]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(initialStep);
      // Resetea al valor del item en edición, o false en modo creación
      setHasSleevecut(Boolean(initialItem?.lleva_corte_manga));
      setMuestraDrafts([{ id: MUESTRA_ROW_ID, descripcion: "", precio: 0 }]);
      nextMuestraIdRef.current = MUESTRA_ROW_ID - 1;
      setOpenMuestraRowIds(new Set([MUESTRA_ROW_ID]));
      setDescribeSubmitAttempted(false);
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
    initialStep,
  ]);

  const handleStepNext = useCallback(() => {
    if (step === "select" && productSelection.selectedRowIds.size === 0) {
      return;
    }

    // Equivalente del guard de "select" para la variante muestra: sin
    // descripción ni precio no se avanza.
    if (step === "describe" && !isDescribeValid) {
      setDescribeSubmitAttempted(true);
      return;
    }

    if (step === "embroidery" && !embroideryState.validateEmbroidery()) {
      return;
    }

    if (step === "reflective" && reflectiveState.validation.hasError) {
      reflectiveState.setSubmitAttempted(true);
      return;
    }

    if (!isMuestra && step === "colors" && !colorsState.validateColors(productSelection.selectedRows, productColorsById)) {
      return;
    }

    const currentIndex = orderedSteps.indexOf(step);
    const nextStep = orderedSteps[currentIndex + 1];
    if (!nextStep) {
      return;
    }

    if (nextStep === "colors" || nextStep === "sizes") {
      // En muestra no hay filas seleccionadas en `useProductSelection`: se abren
      // los acordeones de TODAS las filas sintéticas, porque todas piden tallas.
      // Se recalcula en cada entrada al paso para recoger las muestras que el
      // usuario haya agregado o quitado después de pasar por aquí.
      if (isMuestra) {
        setOpenMuestraRowIds(new Set(muestraDrafts.map((draft) => draft.id)));
      } else {
        productSelection.openFirstSelectedProduct();
      }
    }

    setStep(nextStep);
  }, [
    embroideryState,
    isDescribeValid,
    isMuestra,
    muestraDrafts,
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
    const hasValidSizes = sizesState.validateSelectedRows(effectiveSelectedRows, sizesPerProduct);
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

    if (isMuestra) {
      const itemsToAdd: QuoteItem[] = muestraDrafts.map((draft) => {
        const itemSizes = sizesState.getItemSizes(
          draft.id,
          sizesPerProduct[draft.id] ?? sizes
        );
        // `producto_nombre_externo` es la fuente de verdad del nombre; la
        // `descripcion` que pinta la tabla se deriva del mismo texto. Ambos van
        // aplanados: lo que se guarda es una sola línea.
        const nombre = flattenMuestraNombre(draft.descripcion);
        return {
          tipo: "muestra" as const,
          // El id sintético (`draft.id`, negativo) se CORTA aquí: se usó solo
          // para indexar los mapas del diálogo y no viaja al item ni al payload.
          productoId: null,
          producto_nombre_externo: nombre,
          descripcion: nombre,
          unidad: "PZA",
          cantidad: itemSizes.reduce((sum, size) => sum + size.cantidad, 0),
          precio: draft.precio,
          descuento: 0,
          importe: 0,
          availableSizes: sizesPerProduct[draft.id] ?? sizes,
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
      return;
    }

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
        tipo: "catalogo",
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
        tipo: "catalogo" as const,
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
    effectiveSelectedRows,
    isMuestra,
    muestraDrafts,
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

  const canProceed = isMuestra
    ? isDescribeValid
    : productSelection.selectedRowIds.size > 0;
  const isFirstStep = step === orderedSteps[0];
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
    isMuestra,
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
    describeStepProps: {
      drafts: muestraDrafts,
      onAddDraft: addMuestraDraft,
      onRemoveDraft: removeMuestraDraft,
      onUpdateDraft: updateMuestraDraft,
      showErrors: describeSubmitAttempted,
      hasEmbroidery: embroideryState.hasEmbroidery,
      onToggleEmbroidery: (next: boolean) => embroideryState.setHasEmbroidery(next),
      hasReflective: reflectiveState.hasReflective,
      onToggleReflective: (next: boolean) => reflectiveState.setHasReflective(next),
      hasSleevecut,
      onToggleSleevecut: setHasSleevecut,
    },
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
      selectedRows: effectiveSelectedRows,
      sizesPerProduct,
      sizeQuantitiesPerProduct: sizesState.sizeQuantitiesPerProduct,
      updateSizeQuantity: sizesState.updateSizeQuantity,
      openProductId: productSelection.openProductId,
      // Solo la variante muestra usa el acordeón multi-abierto; catálogo pasa
      // `undefined` y conserva el de una sola fila.
      openProductIds: isMuestra ? openMuestraRowIds : undefined,
      onToggleProduct: isMuestra ? toggleMuestraRow : productSelection.toggleProduct,
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

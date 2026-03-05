"use client";

import { useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { OrderFormValues } from "../schema/order.schema";
import { useProducts } from "../../products/hooks/useProducts";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import { StepSelectProduct } from "./StepSelectProduct";
import { StepSizes } from "./StepSizes";
import { StepEmbroidery, type EmbroiderySpecForm } from "./StepEmbroidery";
import type { CatalogRow as BaseCatalogRow } from "../hooks/useAddProductsDialog";
import { useProductVariants } from "../../product-variants/hooks/useProductVariants";

type OrderItem = OrderFormValues["items"][number];

interface CatalogRow extends BaseCatalogRow {
  colorId: number;
  productoId: number;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: OrderItem) => void;
  onUpdateItem?: (item: OrderItem) => void;
  initialItem?: OrderItem | null;
  startStep?: Step;
}

type Step = "select" | "sizes" | "embroidery";

const POSITION_OPTIONS = [
  { codigo: "A", nombre: "Frente Izquierdo" },
  { codigo: "B", nombre: "Frente Derecho" },
  { codigo: "C", nombre: "Manga Derecha" },
  { codigo: "D", nombre: "Manga Izquierda" },
  { codigo: "E", nombre: "Frente Centro" },
  { codigo: "F", nombre: "Espalda Alta" },
  { codigo: "G", nombre: "Espalda Media" },
  { codigo: "H", nombre: "Espalda Baja" },
  { codigo: "I", nombre: "Sobre la bolsa del pantalon izquierda" },
  { codigo: "J", nombre: "Sobre la bolsa del pantalon Derecha" },
  { codigo: "K", nombre: "Pierna Izquierda" },
  { codigo: "L", nombre: "Pierna Derecha" },
];

const THREAD_COLOR_OPTIONS = ["1002", "1004", "1174", "1256", "1176"];

export function AddProductDialog({
  open,
  onOpenChange,
  onAddItem,
  onUpdateItem,
  initialItem,
  startStep = "select",
}: AddProductDialogProps) {
  const { products } = useProducts();
  const { productVariants } = useProductVariants();
  const { units } = useUnitsOfMeasure();
  const { colors } = useColors();
  const { sizes, isLoading: isLoadingSizes } = useSizes();

  const [search, setSearch] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>(startStep);
  const [sizeQuantities, setSizeQuantities] = useState<Record<number, number>>({});
  const [hasEmbroidery, setHasEmbroidery] = useState(
    Boolean(initialItem?.bordados?.activo)
  );
  const [nuevoPonchado, setNuevoPonchado] = useState(
    Boolean(initialItem?.bordados?.nuevoPonchado)
  );
  const [embroideryObservaciones, setEmbroideryObservaciones] = useState(
    initialItem?.bordados?.observaciones ?? ""
  );
  const [embroiderySpecs, setEmbroiderySpecs] = useState<EmbroiderySpecForm[]>(
    () =>
      initialItem?.bordados?.especificaciones?.map((spec, index) => ({
        id: `${spec.posicionCodigo}-${index}`,
        posicionCodigo: spec.posicionCodigo,
        ancho: String(spec.ancho),
        alto: String(spec.alto),
        colorHilo: spec.colorHilo,
      })) ?? []
  );
  const [embroideryError, setEmbroideryError] = useState<string | null>(null);
  const [specErrors, setSpecErrors] = useState<
    Record<string, { posicion?: string; ancho?: string; alto?: string; color?: string }>
  >({});

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("");
      setSelectedRowId(null);
      setStep(startStep);
      setSizeQuantities({});
      setHasEmbroidery(Boolean(initialItem?.bordados?.activo));
      setNuevoPonchado(Boolean(initialItem?.bordados?.nuevoPonchado));
      setEmbroideryObservaciones(initialItem?.bordados?.observaciones ?? "");
      setEmbroiderySpecs(
        initialItem?.bordados?.especificaciones?.map((spec, index) => ({
          id: `${spec.posicionCodigo}-${index}`,
          posicionCodigo: spec.posicionCodigo,
          ancho: String(spec.ancho),
          alto: String(spec.alto),
          colorHilo: spec.colorHilo,
        })) ?? []
      );
      setEmbroideryError(null);
      setSpecErrors({});
    }
    onOpenChange(nextOpen);
  };

  const rows = useMemo<CatalogRow[]>(() => {
    const productsById = new Map(products.map((p) => [p.id, p]));
    const unitsById = new Map(units.map((u) => [u.id, u]));
    const colorsById = new Map(colors.map((c) => [c.id, c]));

    return (productVariants || [])
      .map((variant) => {
        const product = productsById.get(variant.producto);
        if (!product) return null;
        const unit = unitsById.get(product.unidad_medida);
        const precio = Number(variant.precio_base);
        const color = colorsById.get(variant.color);
        return {
          id: variant.id,
          sku: variant.sku ?? "",
          nombre: product.nombre ?? "",
          descripcion: product.descripcion ?? "",
          unidad: unit?.clave ?? "PZA",
          precio: Number.isFinite(precio) ? precio : 0,
          isActive: Boolean(variant.activo) && Boolean(product.activo),
          colorNombre: color?.nombre ?? "Sin color",
          colorHex: color?.codigo_hex ?? "FFFFFF",
          colorId: variant.color,
          productoId: variant.producto,
        } satisfies CatalogRow;
      })
      .filter((r): r is CatalogRow => Boolean(r))
      .filter((r) => r.isActive)
      .sort((a, b) => a.sku.localeCompare(b.sku, "es"));
  }, [productVariants, products, units, colors]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const haystack = `${r.sku} ${r.nombre} ${r.descripcion} ${r.unidad}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const colorLookup = useMemo(
    () => new Map(colors.map((color) => [color.id, color])),
    [colors]
  );

  const handleSelectRow = (row: BaseCatalogRow) => {
    const fullRow = rows.find((item) => item.id === row.id);
    if (!fullRow) return;
    setSelectedRowId(fullRow.id);
    setSizeQuantities({});
  };

  const handleNext = () => {
    if (!selectedRow) return;
    setStep("sizes");
  };

  const handleBack = () => {
    if (step === "embroidery") {
      setStep("sizes");
      return;
    }
    setStep("select");
    setSizeQuantities({});
  };

  const updateSizeQuantity = (sizeId: number, value: number) => {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    setSizeQuantities((prev) => ({
      ...prev,
      [sizeId]: normalized,
    }));
  };

  const positionMap = useMemo(
    () => new Map(POSITION_OPTIONS.map((pos) => [pos.codigo, pos.nombre])),
    []
  );

  const addEmbroiderySpec = () => {
    const newId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEmbroiderySpecs((prev) => [
      ...prev,
      { id: newId, posicionCodigo: "", ancho: "", alto: "", colorHilo: "" },
    ]);
  };

  const removeEmbroiderySpec = (id: string) => {
    setEmbroiderySpecs((prev) => prev.filter((spec) => spec.id !== id));
    setSpecErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateEmbroiderySpec = (
    id: string,
    field: "posicionCodigo" | "ancho" | "alto" | "colorHilo",
    value: string
  ) => {
    setEmbroiderySpecs((prev) =>
      prev.map((spec) => (spec.id === id ? { ...spec, [field]: value } : spec))
    );
  };

  const initialSizeQuantities = useMemo(() => {
    const map: Record<number, number> = {};
    initialItem?.tallas?.forEach((talla) => {
      map[talla.tallaId] = Math.max(0, Math.floor(Number(talla.cantidad) || 0));
    });
    return map;
  }, [initialItem]);

  const mergedSizeQuantities = useMemo(() => {
    return {
      ...initialSizeQuantities,
      ...sizeQuantities,
    };
  }, [initialSizeQuantities, sizeQuantities]);

  const selectedSizes = useMemo(() => {
    return sizes
      .map((size) => ({
        ...size,
        cantidad: Number(mergedSizeQuantities[size.id] || 0),
      }))
      .filter((size) => size.cantidad > 0);
  }, [sizes, mergedSizeQuantities]);

  const totalCantidad = useMemo(
    () => selectedSizes.reduce((sum, size) => sum + size.cantidad, 0),
    [selectedSizes]
  );

  const selectedRow =
    selectedRowId !== null
      ? rows.find((row) => row.id === selectedRowId) ?? null
      : initialItem?.sku
      ? rows.find((row) => row.sku === initialItem.sku) ?? null
      : null;

  const validateEmbroidery = () => {
    if (!hasEmbroidery) {
      setEmbroideryError(null);
      setSpecErrors({});
      return true;
    }
    let hasError = false;
    const nextErrors: Record<
      string,
      { posicion?: string; ancho?: string; alto?: string; color?: string }
    > = {};
    const usedPositions = new Set<string>();

    if (embroiderySpecs.length === 0) {
      setEmbroideryError("Agrega al menos una especificación.");
      return false;
    }

    embroiderySpecs.forEach((spec) => {
      const specError: {
        posicion?: string;
        ancho?: string;
        alto?: string;
        color?: string;
      } = {};
      if (!spec.posicionCodigo) {
        specError.posicion = "Requerido";
      } else if (usedPositions.has(spec.posicionCodigo)) {
        specError.posicion = "Duplicado";
      } else {
        usedPositions.add(spec.posicionCodigo);
      }

      const ancho = Number(spec.ancho);
      if (!Number.isFinite(ancho) || ancho <= 0) {
        specError.ancho = "Positivo";
      }

      const alto = Number(spec.alto);
      if (!Number.isFinite(alto) || alto <= 0) {
        specError.alto = "Positivo";
      }

      if (!spec.colorHilo) {
        specError.color = "Requerido";
      }

      if (Object.keys(specError).length > 0) {
        nextErrors[spec.id] = specError;
        hasError = true;
      }
    });

    setSpecErrors(nextErrors);
    setEmbroideryError(hasError ? "Completa las especificaciones." : null);
    return !hasError;
  };

  const handleSaveItem = () => {
    if (!selectedRow || totalCantidad <= 0) return;
    const isEmbroideryValid = hasEmbroidery ? validateEmbroidery() : true;
    if (step === "embroidery" && !isEmbroideryValid) return;
    const bordados =
      hasEmbroidery && isEmbroideryValid
        ? {
            activo: true,
            nuevoPonchado,
            observaciones: embroideryObservaciones.trim() || undefined,
            especificaciones: embroiderySpecs.map((spec) => ({
              posicionCodigo: spec.posicionCodigo,
              posicionNombre: positionMap.get(spec.posicionCodigo) ?? "",
              ancho: Math.max(0, Number(spec.ancho) || 0),
              alto: Math.max(0, Number(spec.alto) || 0),
              colorHilo: spec.colorHilo,
            })),
          }
        : undefined;
    const item: OrderItem = {
      sku: isEditing ? initialItem?.sku ?? selectedRow.sku : selectedRow.sku,
      descripcion: isEditing
        ? initialItem?.descripcion ?? selectedRow.nombre
        : selectedRow.nombre,
      unidad: isEditing ? initialItem?.unidad ?? selectedRow.unidad : selectedRow.unidad,
      cantidad: totalCantidad,
      precio: isEditing ? initialItem?.precio ?? selectedRow.precio : selectedRow.precio,
      descuento: isEditing ? initialItem?.descuento ?? 0 : 0,
      importe: 0,
      tallas: selectedSizes.map((size) => ({
        tallaId: size.id,
        nombre: size.nombre,
        cantidad: size.cantidad,
      })),
      bordados,
    };
    if (onUpdateItem && initialItem) {
      onUpdateItem(item);
    } else {
      onAddItem(item);
    }
    handleOpenChange(false);
  };

  const selectedColor = selectedRow ? colorLookup.get(selectedRow.colorId) ?? null : null;
  const canProceed = Boolean(selectedRow);
  const canAdd = totalCantidad > 0;
  const isEditing = Boolean(onUpdateItem && initialItem);
  const canGoEmbroidery = canAdd;

  return (
    <MainDialog
      maxWidth="720px"
      title={
        step === "select"
          ? "Agregar producto"
          : step === "sizes"
          ? "Seleccionar tallas"
          : "Configuración de bordado"
      }
      description="Selecciona el producto, define tallas y agrega bordado si aplica."
      open={open}
      onOpenChange={handleOpenChange}
      actionButtonClose={false}
      actionButton={
        step === "select" ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-xs font-bold  tracking-wide hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-default"
          >
            Siguiente
          </button>
        ) : step === "sizes" ? (
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl cursor-pointer border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold  tracking-wide hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
              >
                Regresar
              </button>
            )}
            {hasEmbroidery ? (
              <button
                type="button"
                onClick={() => setStep("embroidery")}
                disabled={!canGoEmbroidery}
                className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-xs font-bold  tracking-wide hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-default"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={!canAdd}
                className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-xs font-bold  tracking-wide hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-default"
              >
                Agregar
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl cursor-pointer border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold  tracking-wide hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
            >
              Regresar
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              disabled={!canAdd}
              className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-xs font-bold  tracking-wide hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-default"
            >
              Agregar el pedido
            </button>
          </div>
        )
      }
    >
      {step === "select" ? (
        <StepSelectProduct
          search={search}
          onSearchChange={setSearch}
          rows={rows}
          filteredRows={filteredRows}
          selectedRowId={selectedRow?.id ?? null}
          onSelectRow={handleSelectRow}
        />
      ) : step === "sizes" ? (
        <StepSizes
          selectedRow={selectedRow}
          selectedColor={selectedColor}
          sizes={sizes}
          isLoadingSizes={isLoadingSizes}
          mergedSizeQuantities={mergedSizeQuantities}
          updateSizeQuantity={updateSizeQuantity}
          totalCantidad={totalCantidad}
          hasEmbroidery={hasEmbroidery}
          onToggleEmbroidery={setHasEmbroidery}
        />
      ) : (
        <StepEmbroidery
          nuevoPonchado={nuevoPonchado}
          onNuevoPonchadoChange={setNuevoPonchado}
          embroideryObservaciones={embroideryObservaciones}
          onObservacionesChange={setEmbroideryObservaciones}
          embroiderySpecs={embroiderySpecs}
          onAddSpec={addEmbroiderySpec}
          onRemoveSpec={removeEmbroiderySpec}
          onUpdateSpec={updateEmbroiderySpec}
          embroideryError={embroideryError}
          specErrors={specErrors}
          positionOptions={POSITION_OPTIONS}
          positionMap={positionMap}
          threadColorOptions={THREAD_COLOR_OPTIONS}
        />
      )}
    </MainDialog>
  );
}

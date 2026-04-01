"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { OrderFormValues } from "../schema/order.schema";
import { StepSelectProduct } from "./StepSelectProduct";
import { StepSizes } from "./StepSizes";
import { StepEmbroidery, type EmbroiderySpecForm } from "./StepEmbroidery";
import type { CatalogRow as BaseCatalogRow } from "../hooks/useAddProductsDialog";
import type { Size } from "../../sizes/interfaces/size.interface";
import type { Product } from "../../products/interfaces/product.interface";

type OrderItem = OrderFormValues["items"][number];

export interface CatalogRow extends BaseCatalogRow {
  productoId: number;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: OrderItem) => void;
  onUpdateItem?: (item: OrderItem) => void;
  initialItem?: OrderItem | null;
  startStep?: Step;
  sizes: Size[];
  products: Partial<Product>[];
}

type Step = "select" | "sizes" | "embroidery";

// Catálogo fijo de posiciones válidas para bordado y su etiqueta visible en UI.
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
const IMAGE_URL_EXTENSION_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?(#.*)?$/i;

// Valida que la URL exista, tenga protocolo y termine en extensión de imagen permitida.
const isValidImageUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return false;
  }
  try {
    const parsed = new URL(trimmedValue);
    return Boolean(parsed.protocol) && IMAGE_URL_EXTENSION_REGEX.test(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return false;
  }
};

export function AddProductDialog({
  open,
  onOpenChange,
  onAddItem,
  onUpdateItem,
  initialItem,
  startStep = "select",
  sizes,
  products,
}: AddProductDialogProps) {
  // Estado de navegación y contexto principal del modal.
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>(startStep);

  // Estado de tallas/cantidades capturado en el step de tallas.
  const [sizeQuantities, setSizeQuantities] = useState<Record<number, number>>({});

  // Estado de bordado y sus campos auxiliares.
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
        ancho: spec.ancho && spec.ancho > 0 ? String(spec.ancho) : "",
        alto: spec.alto && spec.alto > 0 ? String(spec.alto) : "",
        colorHilo: spec.colorHilo ?? "",
        imagen: spec.imagen ?? "",
      })) ?? []
  );
  const [embroideryError, setEmbroideryError] = useState<string | null>(null);
  const [specErrors, setSpecErrors] = useState<
    Record<string, { posicion?: string; ancho?: string; alto?: string; color?: string; imagen?: string }>
  >({});

  // Sincroniza apertura/cierre del modal y, al cerrar, restablece el flujo a su estado inicial.
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
          ancho: spec.ancho && spec.ancho > 0 ? String(spec.ancho) : "",
          alto: spec.alto && spec.alto > 0 ? String(spec.alto) : "",
          colorHilo: spec.colorHilo ?? "",
          imagen: spec.imagen ?? "",
        })) ?? []
      );
      setEmbroideryError(null);
      setSpecErrors({});
    }
    onOpenChange(nextOpen);
  };

  // Normaliza productos de catálogo al formato interno usado por la tabla de selección.
  const rows = useMemo<CatalogRow[]>(() => {
    return (products || [])
      .map((product) => {
        if (!product.id) return null;
        const precio = Number(product.precio_base);
        return {
          id: product.id,
          nombre: product.nombre ?? "",
          descripcion: product.descripcion ?? "",
          unidad: "PZA", // mantenido para compatibilidad interna pero no mostrado en UI
          precio: Number.isFinite(precio) ? precio : 0,
          isActive: product.activo ?? true,
          productoId: product.id,
        } as CatalogRow;
      })
      .filter((r): r is CatalogRow => Boolean(r))
      .filter((r) => r.isActive)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [products]);

  // Aplica búsqueda por nombre y descripción sobre la lista ya normalizada.
  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const haystack = `${r.nombre} ${r.descripcion}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch, rows]);

  // Guarda el producto seleccionado y reinicia cantidades para evitar residuos entre selecciones.
  const handleSelectRow = useCallback((row: BaseCatalogRow) => {
    const fullRow = rows.find((item) => item.id === row.id);
    if (!fullRow) return;
    setSelectedRowId(fullRow.id);
    setSizeQuantities({});
  }, [rows]);

  // Avanza de "select" a "sizes" solo cuando hay producto seleccionado.
  const handleNext = () => {
    if (!selectedRow) return;
    setStep("sizes");
  };

  // Navegación inversa entre pasos, preservando reglas del flujo del modal.
  const handleBack = () => {
    if (step === "embroidery") {
      setStep("sizes");
      return;
    }
    setStep("select");
    setSizeQuantities({});
  };

  // Sanitiza entradas de cantidad para mantener solo enteros positivos o cero.
  const updateSizeQuantity = useCallback((sizeId: number, value: number) => {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    setSizeQuantities((prev) => ({
      ...prev,
      [sizeId]: normalized,
    }));
  }, []);

  // Mapa de apoyo para resolver nombre legible a partir del código de posición.
  const positionMap = useMemo(
    () => new Map(POSITION_OPTIONS.map((pos) => [pos.codigo, pos.nombre])),
    []
  );

  // CRUD de especificaciones de bordado en memoria local del diálogo.
  const addEmbroiderySpec = useCallback(() => {
    const newId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setEmbroiderySpecs((prev) => [
      { id: newId, posicionCodigo: "", ancho: "", alto: "", colorHilo: "", imagen: "" },
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

  const updateEmbroiderySpec = useCallback((
    id: string,
    field: "posicionCodigo" | "ancho" | "alto" | "colorHilo" | "imagen",
    value: string
  ) => {
    setEmbroiderySpecs((prev) =>
      prev.map((spec) => (spec.id === id ? { ...spec, [field]: value } : spec))
    );
  }, []);

  // Modo edición: base de cantidades iniciales proveniente del item original.
  const initialSizeQuantities = useMemo(() => {
    const map: Record<number, number> = {};
    initialItem?.tallas?.forEach((talla) => {
      map[talla.tallaId] = Math.max(0, Math.floor(Number(talla.cantidad) || 0));
    });
    return map;
  }, [initialItem]);

  // Combina cantidades iniciales con cambios del usuario priorizando lo más reciente.
  const mergedSizeQuantities = useMemo(() => {
    return {
      ...initialSizeQuantities,
      ...sizeQuantities,
    };
  }, [initialSizeQuantities, sizeQuantities]);

  // Proyección final de tallas seleccionadas con cantidad mayor a cero.
  const selectedSizes = useMemo(() => {
    return sizes
      .map((size) => ({
        ...size,
        cantidad: Number(mergedSizeQuantities[size.id] || 0),
      }))
      .filter((size) => size.cantidad > 0);
  }, [sizes, mergedSizeQuantities]);

  // Total de piezas del renglón, usado para habilitar acciones del flujo.
  const totalCantidad = useMemo(
    () => selectedSizes.reduce((sum, size) => sum + size.cantidad, 0),
    [selectedSizes]
  );

  // Producto activo del flujo: prioriza selección actual y luego fallback de edición.
  const selectedRow =
    selectedRowId !== null
      ? rows.find((row) => row.id === selectedRowId) ?? null
      : initialItem?.productoId
      ? rows.find((row) => row.productoId === initialItem.productoId) ?? null
      : null;

  // Valida reglas de negocio de bordado: requeridos, duplicados, numéricos y URL de imagen.
  const validateEmbroidery = () => {
    if (!hasEmbroidery) {
      setEmbroideryError(null);
      setSpecErrors({});
      return true;
    }
    let hasError = false;
    const nextErrors: Record<
      string,
      { posicion?: string; ancho?: string; alto?: string; imagen?: string }
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
        imagen?: string;
      } = {};
      if (!spec.posicionCodigo) {
        specError.posicion = "Requerido";
      } else if (usedPositions.has(spec.posicionCodigo)) {
        specError.posicion = "Duplicado";
      } else {
        usedPositions.add(spec.posicionCodigo);
      }

      const normalizedAncho = spec.ancho.trim();
      if (normalizedAncho) {
        const ancho = Number(normalizedAncho);
        if (!Number.isFinite(ancho) || ancho <= 0) {
          specError.ancho = "Positivo";
        }
      }

      const normalizedAlto = spec.alto.trim();
      if (normalizedAlto) {
        const alto = Number(normalizedAlto);
        if (!Number.isFinite(alto) || alto <= 0) {
          specError.alto = "Positivo";
        }
      }

      if (!isValidImageUrl(spec.imagen)) {
        specError.imagen = "URL de imagen inválida";
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

  // Ensambla el payload final del item, decide crear/actualizar y cierra el modal.
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
              ancho: spec.ancho.trim() ? Math.max(0, Number(spec.ancho) || 0) : undefined,
              alto: spec.alto.trim() ? Math.max(0, Number(spec.alto) || 0) : undefined,
              colorHilo: spec.colorHilo.trim(),
              imagen: spec.imagen.trim(),
            })),
          }
        : undefined;
    const item: OrderItem = {
      productoId: isEditing ? initialItem?.productoId ?? selectedRow.productoId : selectedRow.productoId,
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

  // Banderas de control para navegación y habilitación de botones por paso.
  const canProceed = Boolean(selectedRow);
  const canAdd = totalCantidad > 0;
  const isEditing = Boolean(onUpdateItem && initialItem);
  const canGoEmbroidery = canAdd;

  // Renderizado condicional del diálogo: selección de producto, tallas y bordado.
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
          <Button variant="primary" onClick={handleNext} disabled={!canProceed}>
            Siguiente
          </Button>
        ) : step === "sizes" ? (
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button variant="secondary" onClick={handleBack}>
                Regresar
              </Button>
            )}
            {hasEmbroidery ? (
              <Button
                variant="primary"
                onClick={() => setStep("embroidery")}
                disabled={!canGoEmbroidery}
              >
                Siguiente
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSaveItem} disabled={!canAdd}>
                Agregar
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleBack}>
              Regresar
            </Button>
            <Button variant="primary" onClick={handleSaveItem} disabled={!canAdd}>
              Agregar el pedido
            </Button>
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
          sizes={sizes}
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

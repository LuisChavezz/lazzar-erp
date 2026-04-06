"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { QuoteFormValues } from "../schema/quote.schema";
import { StepSelectProduct } from "./StepSelectProduct";
import { StepSizes } from "./StepSizes";
import { StepEmbroidery, type EmbroiderySpecForm } from "./StepEmbroidery";
import type { CatalogRow as BaseCatalogRow } from "../hooks/useAddProductsDialog";
import type { Size } from "../../sizes/interfaces/size.interface";
import type { Product } from "../../products/interfaces/product.interface";

type QuoteItem = QuoteFormValues["items"][number];

export interface CatalogRow extends BaseCatalogRow {
  productoId: number;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem?: (item: QuoteItem) => void;
  onAddItems?: (items: QuoteItem[]) => void;
  onUpdateItem?: (item: QuoteItem) => void;
  initialItem?: QuoteItem | null;
  startStep?: Step;
  sizes: Size[];
  products: Partial<Product>[];
}

type Step = "select" | "embroidery" | "sizes";

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
  onAddItems,
  onUpdateItem,
  initialItem,
  startStep = "select",
  sizes,
  products,
}: AddProductDialogProps) {
  const isEditing = Boolean(onUpdateItem && initialItem);

  // Estado de navegación y contexto principal del modal.
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [step, setStep] = useState<Step>(startStep);

  // Selección multiple de productos (Set de row IDs).
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(() =>
    initialItem?.productoId ? new Set([initialItem.productoId]) : new Set()
  );

  // Cantidades de tallas indexadas por [productoId][tallaId].
  const [sizeQuantitiesPerProduct, setSizeQuantitiesPerProduct] = useState<
    Record<number, Record<number, number>>
  >(() => {
    if (!initialItem?.productoId || !initialItem?.tallas) return {};
    const map: Record<number, number> = {};
    initialItem.tallas.forEach((t) => {
      map[t.tallaId] = Math.max(0, Math.floor(Number(t.cantidad) || 0));
    });
    return { [initialItem.productoId]: map };
  });

  // Accordion: sólo un producto abierto a la vez.
  const [openProductId, setOpenProductId] = useState<number | null>(
    initialItem?.productoId ?? null
  );

  // Errores de validación de tallas por producto.
  const [sizeErrors, setSizeErrors] = useState<Record<number, string>>({});

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
      setSelectedRowIds(
        initialItem?.productoId ? new Set([initialItem.productoId]) : new Set()
      );
      setStep(startStep);
      const initialSizeMap: Record<number, Record<number, number>> = {};
      if (initialItem?.productoId && initialItem?.tallas) {
        const map: Record<number, number> = {};
        initialItem.tallas.forEach((t) => {
          map[t.tallaId] = Math.max(0, Math.floor(Number(t.cantidad) || 0));
        });
        initialSizeMap[initialItem.productoId] = map;
      }
      setSizeQuantitiesPerProduct(initialSizeMap);
      setOpenProductId(initialItem?.productoId ?? null);
      setSizeErrors({});
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

  // Alterna la selección de un producto en el set de seleccionados.
  const handleToggleRow = useCallback((row: BaseCatalogRow) => {
    const fullRow = rows.find((item) => item.id === row.id);
    if (!fullRow) return;
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(fullRow.id)) next.delete(fullRow.id);
      else next.add(fullRow.id);
      return next;
    });
  }, [rows]);

  // Avanza al siguiente paso según si se requiere bordado.
  const handleNext = () => {
    if (selectedRowIds.size === 0) return;
    if (hasEmbroidery) {
      setStep("embroidery");
    } else {
      const firstId = [...selectedRowIds][0];
      setOpenProductId(firstId ?? null);
      setStep("sizes");
    }
  };

  // Desde bordado: valida y avanza a sizes.
  const handleEmbroideryNext = () => {
    if (!validateEmbroidery()) return;
    const firstId = [...selectedRowIds][0];
    setOpenProductId(firstId ?? null);
    setStep("sizes");
  };

  // Navegación inversa entre pasos.
  const handleBack = () => {
    if (step === "sizes") {
      if (hasEmbroidery) {
        setStep("embroidery");
      } else {
        setStep("select");
      }
      return;
    }
    if (step === "embroidery") {
      setStep("select");
    }
  };

  // Alterna producto abierto en el accordion (uno a la vez).
  const handleToggleProduct = useCallback((id: number) => {
    setOpenProductId((prev) => (prev === id ? null : id));
  }, []);

  // Sanitiza y guarda cantidad de talla por producto.
  const updateSizeQuantity = useCallback(
    (productId: number, sizeId: number, value: number) => {
      const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      setSizeQuantitiesPerProduct((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] ?? {}),
          [sizeId]: normalized,
        },
      }));
      // Limpia el error del producto si ya tiene cantidades.
      setSizeErrors((prev) => {
        if (!prev[productId]) return prev;
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    []
  );

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

  // Productos actualmente seleccionados como array ordenado.
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowIds.has(row.id)),
    [rows, selectedRowIds]
  );

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

  // Ensambla los payloads finales, valida tallas por producto y emite los items.
  const handleSaveItem = () => {
    // Validar que cada producto tiene al menos una talla con cantidad > 0.
    let hasSizeErrors = false;
    const newSizeErrors: Record<number, string> = {};
    for (const row of selectedRows) {
      const quantities = sizeQuantitiesPerProduct[row.id] ?? {};
      const total = Object.values(quantities).reduce((s, q) => s + q, 0);
      if (total <= 0) {
        newSizeErrors[row.id] = "Sin tallas";
        hasSizeErrors = true;
      }
    }
    setSizeErrors(newSizeErrors);
    if (hasSizeErrors) return;

    const isEmbroideryValid = hasEmbroidery ? validateEmbroidery() : true;
    if (!isEmbroideryValid) return;

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

    if (isEditing && onUpdateItem && initialItem) {
      const row = selectedRows[0];
      if (!row) return;
      const quantities = sizeQuantitiesPerProduct[row.id] ?? {};
      const itemSizes = sizes
        .map((size) => ({ ...size, cantidad: quantities[size.id] ?? 0 }))
        .filter((size) => size.cantidad > 0);
      const item: QuoteItem = {
        productoId: initialItem.productoId ?? row.productoId,
        descripcion: initialItem.descripcion ?? row.nombre,
        unidad: initialItem.unidad ?? row.unidad,
        cantidad: itemSizes.reduce((s, sz) => s + sz.cantidad, 0),
        precio: initialItem.precio ?? row.precio,
        descuento: initialItem.descuento ?? 0,
        importe: 0,
        tallas: itemSizes.map((sz) => ({
          tallaId: sz.id,
          nombre: sz.nombre,
          cantidad: sz.cantidad,
        })),
        bordados,
      };
      onUpdateItem(item);
    } else {
      const itemsToAdd: QuoteItem[] = selectedRows.map((row) => {
        const quantities = sizeQuantitiesPerProduct[row.id] ?? {};
        const itemSizes = sizes
          .map((size) => ({ ...size, cantidad: quantities[size.id] ?? 0 }))
          .filter((size) => size.cantidad > 0);
        return {
          productoId: row.productoId,
          descripcion: row.nombre,
          unidad: row.unidad,
          cantidad: itemSizes.reduce((s, sz) => s + sz.cantidad, 0),
          precio: row.precio,
          descuento: 0,
          importe: 0,
          tallas: itemSizes.map((sz) => ({
            tallaId: sz.id,
            nombre: sz.nombre,
            cantidad: sz.cantidad,
          })),
          bordados,
        };
      });

      if (onAddItems) {
        onAddItems(itemsToAdd);
      } else if (onAddItem) {
        for (const item of itemsToAdd) {
        onAddItem(item);
        }
      }
    }
    handleOpenChange(false);
  };

  // Banderas de navegación por paso.
  const canProceed = selectedRowIds.size > 0;

  // Renderizado condicional del diálogo: selección de producto, tallas y bordado.
  return (
    <MainDialog
      maxWidth="720px"
      title={
        step === "select"
          ? isEditing ? "Editar producto" : "Agregar productos"
          : step === "embroidery"
          ? "Configuración de bordado"
          : "Seleccionar tallas"
      }
      description="Selecciona productos, configura bordado si aplica y asigna tallas."
      open={open}
      onOpenChange={handleOpenChange}
      actionButtonClose={false}
      actionButton={
        step === "select" ? (
          <Button variant="primary" onClick={handleNext} disabled={!canProceed}>
            {hasEmbroidery ? "Siguiente" : "Continuar"}
          </Button>
        ) : step === "embroidery" ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleBack}>
              Regresar
            </Button>
            <Button variant="primary" onClick={handleEmbroideryNext}>
              Siguiente
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button variant="secondary" onClick={handleBack}>
                Regresar
              </Button>
            )}
            <Button variant="primary" onClick={handleSaveItem}>
              {isEditing ? "Guardar cambios" : "Agregar"}
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
          selectedRowIds={selectedRowIds}
          onToggleRow={handleToggleRow}
          hasEmbroidery={hasEmbroidery}
          onToggleEmbroidery={setHasEmbroidery}
        />
      ) : step === "embroidery" ? (
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
      ) : (
        <StepSizes
          selectedRows={selectedRows}
          sizes={sizes}
          sizeQuantitiesPerProduct={sizeQuantitiesPerProduct}
          updateSizeQuantity={updateSizeQuantity}
          openProductId={openProductId}
          onToggleProduct={handleToggleProduct}
          sizeErrors={sizeErrors}
        />
      )}
    </MainDialog>
  );
}

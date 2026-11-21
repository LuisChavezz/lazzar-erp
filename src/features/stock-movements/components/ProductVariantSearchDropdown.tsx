"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import { LoadingSpinnerIcon } from "@/src/components/Icons";
import { ProductVariantCodeBadges } from "@/src/features/product-variants/components/ProductVariantCodeBadges";
import { useProductVariantSearch } from "@/src/features/product-variants/hooks/useProductVariantSelector";
import type { ProductVariantSelectorItem } from "@/src/features/product-variants/interfaces/product-variant-selector.interface";
import { useEscapeClosesPopup } from "@/src/hooks/useEscapeClosesPopup";
import { useServerSearchTerm } from "@/src/hooks/useServerSearchTerm";
import { CATALOG_SELECTOR_DEBOUNCE_MS } from "@/src/utils/catalogSelectorQuery";
import type { FormFieldError } from "@/src/utils/getFieldError";

interface ProductVariantSearchDropdownProps {
  value: number;
  onChange: (variantId: number) => void;
  onBlur: () => void;
  error?: FormFieldError;
  disabled?: boolean;
}

const variantLabel = (variant: ProductVariantSelectorItem) => `${variant.sku} - ${variant.nombre}`;

/**
 * Input con búsqueda y dropdown para seleccionar una variante de producto.
 * Reemplaza el <select> de variantes con una experiencia tipo autocomplete.
 *
 * La búsqueda corre EN EL SERVIDOR (`producto-variante/selector/?q=&limit=`,
 * EC-886) con el texto debounced: no se descarga el catálogo, y solo trae
 * variantes activas de productos activos. La variante elegida se guarda
 * entera aquí (`selected`), así su etiqueta no depende de que la búsqueda
 * actual la traiga. El formulario remonta el componente (`key`) al limpiarse.
 *
 * El dropdown usa `position: fixed` calculado desde el input para evitar
 * recortes por contenedores padre con `overflow-hidden`.
 */
export function ProductVariantSearchDropdown({
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: ProductVariantSearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<ProductVariantSelectorItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Label derivado del valor seleccionado ────────────────────────────
  // Solo cuenta si sigue siendo el valor del formulario.
  const selectedVariant = selected && selected.id === value ? selected : null;
  const selectedLabel = selectedVariant ? variantLabel(selectedVariant) : "";

  const showDropdown = isOpen && searchQuery.trim().length > 0;

  // ─── Búsqueda en el servidor (sobre el texto debounced) ──────────────
  // Solo con el dropdown abierto y algo escrito: el texto que queda tras
  // elegir (la etiqueta) no dispara búsquedas.
  const { term, isDebouncing } = useServerSearchTerm(searchQuery, CATALOG_SELECTOR_DEBOUNCE_MS);
  const isSearchEnabled = showDropdown && term !== "";
  const { variants, total, hasResults, isInitialError, isPlaceholderData, refetch } =
    useProductVariantSearch({ q: term }, { enabled: isSearchEnabled });
  const isSearching = isPlaceholderData || isDebouncing;

  // ─── Calcular posición del dropdown (fixed) ──────────────────────────
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  // ─── Cerrar dropdown al redimensionar la ventana ────────────────────
  useEffect(() => {
    if (!showDropdown) return;
    const handleResize = () => setIsOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [showDropdown]);

  // ─── Cerrar dropdown al hacer clic fuera ──────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Restaurar label seleccionado si el usuario había modificado el texto
        if (value > 0 && selectedLabel && searchQuery !== selectedLabel) {
          setSearchQuery(selectedLabel);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, selectedLabel, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleSelect = (variant: ProductVariantSelectorItem) => {
    setSelected(variant);
    setSearchQuery(variantLabel(variant));
    onChange(variant.id);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setSearchQuery(nextValue);
    setIsOpen(true);
    setActiveIndex(-1);
    // No se recalcula la posición aquí: el dropdown se posiciona al enfocar
    // (handleFocus) y el input no se desplaza mientras se escribe. Llamar a
    // getBoundingClientRect en cada pulsación forzaría un reflow síncrono (INP).

    // Si el texto no coincide con el label seleccionado, limpiar la selección
    if (nextValue !== selectedLabel && value > 0) {
      onChange(0);
    }
  };

  const handleFocus = () => {
    // Al enfocar, si ya hay un label seleccionado, limpiar para permitir búsqueda
    if (selectedLabel && searchQuery === selectedLabel) {
      setSearchQuery("");
    }
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleBlur = () => {
    // El retraso permite que el clic en el dropdown se procese antes de cerrar
    setTimeout(() => {
      setIsOpen(false);
      onBlur();
    }, 180);
  };

  // Mientras llega la búsqueda de un término nuevo, las filas pintadas son de
  // la anterior: el teclado no elige sobre ellas.
  const selectableVariants = isSearching ? [] : variants;

  // ─── Navegación por teclado ───────────────────────────────────────────
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (event.key === "ArrowDown") {
        setIsOpen(true);
        updateDropdownPosition();
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev < selectableVariants.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : selectableVariants.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < selectableVariants.length) {
          handleSelect(selectableVariants[activeIndex]);
        }
        break;
    }
  };

  // Escape cierra solo la lista, no el diálogo de movimiento (EC-922): ver
  // `useEscapeClosesPopup`. Restaura la etiqueta elegida, si la hay.
  useEscapeClosesPopup(showDropdown, inputRef, () => {
    setIsOpen(false);
    if (value > 0 && selectedLabel) {
      setSearchQuery(selectedLabel);
    }
  });

  const renderBody = () => {
    if (isInitialError) {
      return (
        <div role="alert" className="px-4 py-3 text-xs text-red-500">
          Error al buscar las variantes.{" "}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void refetch()}
            className="font-semibold underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      );
    }
    if (!hasResults) {
      return (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 dark:text-slate-400"
        >
          <LoadingSpinnerIcon className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Buscando...
        </div>
      );
    }
    if (variants.length === 0) {
      return (
        <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          No se encontraron variantes.
        </div>
      );
    }
    return (
      <div
        aria-busy={isSearching || undefined}
        className={`transition-opacity ${isSearching ? "opacity-60" : ""}`}
      >
        {variants.map((variant, index) => (
          <button
            key={variant.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleSelect(variant)}
            className={`w-full text-left px-4 py-3 cursor-pointer transition-colors ${
              index === activeIndex && !isSearching
                ? "bg-sky-50 dark:bg-sky-500/10"
                : "hover:bg-slate-50 dark:hover:bg-white/10"
            }`}
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="min-w-0 truncate">{variantLabel(variant)}</span>
              <ProductVariantCodeBadges variant={variant} />
            </div>
          </button>
        ))}
        {total > variants.length && (
          <p className="px-4 py-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Hay {total} coincidencias y aquí se listan solo {variants.length}. Escribe más para
            acotar la búsqueda.
          </p>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <FormInput
        ref={inputRef}
        label="Variante de Producto"
        placeholder="Buscar producto por SKU, nombre, código Proscai o SKU de producción..."
        variant="default"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        error={error}
        disabled={disabled}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          style={dropdownStyle}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
        >
          <div className="max-h-52 overflow-y-auto">{renderBody()}</div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";
import type { FormFieldError } from "@/src/utils/getFieldError";

/**
 * Debounce de un valor: difiere las recomputaciones costosas (filtrado +
 * render de la lista de resultados) hasta que el usuario deja de teclear,
 * sacándolas del manejador del evento de input para mejorar el INP.
 */
function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface ProductVariantSearchDropdownProps {
  variants: ProductVariant[];
  value: number;
  onChange: (variantId: number) => void;
  onBlur: () => void;
  error?: FormFieldError;
  disabled?: boolean;
}

/**
 * Input con búsqueda y dropdown para seleccionar una variante de producto.
 * Reemplaza el <select> de variantes con una experiencia tipo autocomplete.
 *
 * El dropdown usa `position: fixed` calculado desde el input para evitar
 * recortes por contenedores padre con `overflow-hidden`.
 */
export function ProductVariantSearchDropdown({
  variants,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: ProductVariantSearchDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Label derivado del valor seleccionado ────────────────────────────
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === value),
    [variants, value],
  );
  const selectedLabel = selectedVariant
    ? `${selectedVariant.sku} - ${selectedVariant.nombre}`
    : "";

  // ─── Resultados filtrados (sobre el query debounced) ─────────────────
  // Filtrar y volver a renderizar la lista en cada pulsación bloquea el hilo
  // principal cuando hay muchas variantes; se hace sobre el valor debounced.
  const debouncedQuery = useDebounce(searchQuery);
  const filteredVariants = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    if (!query) return variants;
    return variants.filter((v) => {
      const haystack = `${v.sku} ${v.nombre}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [variants, debouncedQuery]);

  const showDropdown = isOpen && searchQuery.trim().length > 0;

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
  const handleSelect = (variant: ProductVariant) => {
    const label = `${variant.sku} - ${variant.nombre}`;
    setSearchQuery(label);
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
          prev < filteredVariants.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredVariants.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredVariants.length) {
          handleSelect(filteredVariants[activeIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        if (value > 0 && selectedLabel) {
          setSearchQuery(selectedLabel);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <FormInput
        ref={inputRef}
        label="Variante de Producto"
        placeholder="Buscar producto por SKU o nombre..."
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
          <div className="max-h-52 overflow-y-auto">
            {filteredVariants.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                No se encontraron variantes.
              </div>
            ) : (
              filteredVariants.map((variant, index) => (
                <button
                  key={variant.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(variant)}
                  className={`w-full text-left px-4 py-3 cursor-pointer transition-colors ${
                    index === activeIndex
                      ? "bg-sky-50 dark:bg-sky-500/10"
                      : "hover:bg-slate-50 dark:hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {variant.sku} - {variant.nombre}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

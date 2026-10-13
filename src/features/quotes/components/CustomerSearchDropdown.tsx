"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FormInput } from "@/src/components/FormInput";
import type { FormFieldError } from "@/src/utils/getFieldError";

/** Lo que el buscador lee de un cliente, venga del catálogo que venga. */
interface CustomerSearchOption {
  id: string | number;
  razon_social: string;
  nombre: string;
  correo: string;
  telefono: string;
}

interface CustomerSearchDropdownProps<C extends CustomerSearchOption> {
  value: string;
  onValueChange: (value: string) => void;
  customers: C[];
  onSelect: (customer: C) => void;
  label?: string;
  placeholder?: string;
  error?: FormFieldError;
  /**
   * Opción para QUITAR la selección (p. ej. "Sin cliente"), fija al inicio de
   * la lista. Con ella la lista abre también con el campo vacío, para que la
   * opción esté a la vista. Si se omite, el buscador se comporta como siempre:
   * solo lista coincidencias de lo tecleado.
   */
  clearOption?: { label: string; onSelect: () => void };
  /**
   * Id del cliente ya elegido. Si está entre las coincidencias se pinta
   * primero, para que el tope de filas nunca lo deje fuera.
   */
  selectedId?: C["id"];
}

/** Tope de clientes pintados; el resto se alcanza escribiendo más. */
const MAX_VISIBLE_CUSTOMERS = 50;

const OPTION_CLS = "w-full text-left px-4 py-3 cursor-pointer transition-colors";
const OPTION_IDLE_CLS = "hover:bg-slate-50 dark:hover:bg-white/10";
const OPTION_ACTIVE_CLS = "bg-slate-50 dark:bg-white/10";
const NOTE_CLS = "px-4 py-3 text-xs text-slate-500 dark:text-slate-400";

/**
 * Buscador de clientes con lista desplegable.
 *
 * Teclado: ↓/↑ recorren las opciones, Enter elige la resaltada (al escribir se
 * resalta sola la primera coincidencia), Escape cierra la lista y Tab elige la
 * opción a la que se llegó con las flechas antes de salir del campo.
 */
export function CustomerSearchDropdown<C extends CustomerSearchOption>({
  value,
  onValueChange,
  customers,
  onSelect,
  label,
  placeholder,
  error,
  clearOption,
  selectedId,
}: CustomerSearchDropdownProps<C>) {
  const [isOpen, setIsOpen] = useState(false);
  // Opción a la que se llegó con las flechas; -1 = ninguna (ver `highlightedIndex`).
  const [activeIndex, setActiveIndex] = useState(-1);
  // ¿Se tecleó desde que se abrió la lista? Solo entonces Enter elige la
  // primera coincidencia: con el campo recién enfocado (y su texto anterior)
  // Enter sigue enviando el formulario, como siempre.
  const [hasTyped, setHasTyped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const query = value.trim().toLowerCase();

  const filteredCustomers = useMemo(() => {
    const matches = query
      ? customers.filter((customer) => {
          const haystack =
            `${customer.razon_social} ${customer.nombre} ${customer.correo} ${customer.telefono}`.toLowerCase();
          return haystack.includes(query);
        })
      : customers;
    if (selectedId === undefined) return matches;
    const selected = matches.find((customer) => customer.id === selectedId);
    return selected ? [selected, ...matches.filter((customer) => customer !== selected)] : matches;
  }, [customers, query, selectedId]);

  const visibleCustomers = filteredCustomers.slice(0, MAX_VISIBLE_CUSTOMERS);
  const hiddenCount = filteredCustomers.length - visibleCustomers.length;

  const showDropdown = isOpen && (query.length > 0 || clearOption !== undefined);

  // Opciones en el orden en que se pintan: "quitar" (si la hay) y los clientes.
  const clearOffset = clearOption ? 1 : 0;
  const optionCount = clearOffset + visibleCustomers.length;
  // Sin flechas de por medio, al escribir se resalta la primera coincidencia:
  // Enter la elige sin más pasos.
  const firstMatchIndex =
    hasTyped && query.length > 0 && visibleCustomers.length > 0 ? clearOffset : -1;
  const highlightedIndex =
    activeIndex >= 0 ? Math.min(activeIndex, optionCount - 1) : firstMatchIndex;

  const close = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    setHasTyped(false);
  };

  const chooseOption = (index: number) => {
    if (index < 0 || index >= optionCount) return false;
    if (clearOption && index === 0) {
      clearOption.onSelect();
    } else {
      onSelect(visibleCustomers[index - clearOffset]);
    }
    close();
    return true;
  };

  // La opción resaltada debe quedar a la vista.
  useEffect(() => {
    if (!showDropdown) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [showDropdown, highlightedIndex]);

  // Escape cierra SOLO la lista. Se escucha en `window` en fase de captura
  // porque un diálogo de Radix que contenga el buscador escucha Escape en
  // `document` (también en captura) y se cerraría entero, con lo capturado.
  useEffect(() => {
    if (!showDropdown) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.target !== inputRef.current) return;
      event.stopPropagation();
      setIsOpen(false);
      setActiveIndex(-1);
      setHasTyped(false);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [showDropdown]);

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div className="relative">
      <FormInput
        ref={inputRef}
        label={label}
        placeholder={placeholder}
        variant="ghostSearch"
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-activedescendant={
          showDropdown && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined
        }
        autoComplete="off"
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
          setHasTyped(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!showDropdown) {
              setIsOpen(true);
              return;
            }
            if (optionCount === 0) return;
            setActiveIndex(
              event.key === "ArrowDown"
                ? Math.min(optionCount - 1, highlightedIndex + 1)
                : Math.max(0, highlightedIndex - 1)
            );
          } else if (event.key === "Enter") {
            // Solo con la lista abierta y algo resaltado: si no, Enter sigue
            // su curso (enviar el formulario).
            if (showDropdown && chooseOption(highlightedIndex)) event.preventDefault();
          } else if (event.key === "Tab") {
            // Salir con Tab tras recorrer con las flechas elige esa opción en
            // vez de perderla. Lo solo tecleado no se elige por su cuenta.
            if (showDropdown && activeIndex >= 0) chooseOption(highlightedIndex);
          }
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={close}
        error={error}
      />
      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          <div ref={listRef} id={listId} role="listbox" className="max-h-52 overflow-y-auto">
            {clearOption && (
              <button
                type="button"
                id={optionId(0)}
                role="option"
                aria-selected={highlightedIndex === 0}
                data-active={highlightedIndex === 0 ? "true" : undefined}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(0)}
                className={`${OPTION_CLS} text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 ${
                  highlightedIndex === 0 ? OPTION_ACTIVE_CLS : OPTION_IDLE_CLS
                }`}
              >
                {clearOption.label}
              </button>
            )}
            {filteredCustomers.length === 0 ? (
              <div className={NOTE_CLS}>No se encontraron clientes.</div>
            ) : (
              visibleCustomers.map((customer, index) => {
                const optionIndex = clearOffset + index;
                const isActive = highlightedIndex === optionIndex;
                return (
                  <button
                    key={`${customer.id}-${index}`}
                    type="button"
                    id={optionId(optionIndex)}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive ? "true" : undefined}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseOption(optionIndex)}
                    className={`${OPTION_CLS} ${isActive ? OPTION_ACTIVE_CLS : OPTION_IDLE_CLS}`}
                  >
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {customer.razon_social}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {customer.nombre} · {customer.correo}
                    </div>
                  </button>
                );
              })
            )}
            {hiddenCount > 0 && (
              <div className={NOTE_CLS}>Sigue escribiendo para acotar ({hiddenCount} más).</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

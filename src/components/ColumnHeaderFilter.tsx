'use client';

import { useEffect, useRef, useState } from 'react';
import type { Column } from '@tanstack/react-table';
import { FilterIcon } from './Icons';

export interface ColumnFilterOption {
  /** `undefined` limpia el filtro de la columna (opción "Todos"). */
  value: string | undefined;
  label: string;
  /** Punto de color opcional, para columnas tipo badge/estado. */
  dotClassName?: string;
}

interface ColumnHeaderFilterProps<TData> {
  column: Column<TData, unknown>;
  options: ColumnFilterOption[];
  /** Qué se está filtrando, para el tooltip/aria-label del ícono y el menú. */
  label: string;
}

/**
 * Ícono de filtro embebido en un encabezado de columna (estilo Excel), en vez
 * del panel genérico de chips de `DataTable` (`filterConfig`). Usa el estado
 * NATIVO de columna de TanStack (`column.getFilterValue`/`setFilterValue`) —
 * requiere que la tabla tenga `columnFilters` cableado (ya lo hace
 * `DataTable.tsx`) y que la columna declare su propio `filterFn`, porque el
 * valor a comparar casi nunca es el que la columna muestra tal cual (un badge
 * de estado filtra por el id crudo, no por la etiqueta traducida).
 *
 * `stopPropagation` en cada click evita que dispare el toggle de orden del
 * `<th>` que envuelve todo el encabezado, o el drag-to-reorder de columnas.
 */
export function ColumnHeaderFilter<TData>({ column, options, label }: ColumnHeaderFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeValue = column.getFilterValue() as string | undefined;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className={`inline-flex items-center justify-center rounded p-0.5 transition-colors cursor-pointer ${
          activeValue !== undefined
            ? 'text-sky-600 dark:text-sky-400'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        aria-label={`Filtrar por ${label}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={`Filtrar por ${label}`}
      >
        <FilterIcon className="w-3 h-3" />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={`Filtrar por ${label}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className="absolute left-0 top-full mt-1 w-44 max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-xl z-30 normal-case font-normal tracking-normal"
        >
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="menuitemradio"
              aria-checked={activeValue === opt.value}
              onClick={() => {
                column.setFilterValue(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                activeValue === opt.value
                  ? 'text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${opt.dotClassName ?? ''}`}
                aria-hidden="true"
              />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

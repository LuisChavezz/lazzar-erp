'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import type { Column } from '@tanstack/react-table';
import { FilterIcon } from './Icons';
import { DataTableModeContext } from './DataTableModeContext';

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
  /**
   * Variante con buscador, para catálogos grandes (clientes, vendedores). Por
   * defecto `false`: el menú de siempre, sin ningún cambio. Con `true` (o un
   * objeto con el `placeholder`) el menú abre con un campo de texto que acota
   * las opciones mientras se escribe, sin distinguir acentos ni mayúsculas.
   * "Todos" y la opción seleccionada quedan fijas arriba, y se pintan como
   * mucho `SEARCHABLE_MAX_VISIBLE` coincidencias: el resto se alcanza
   * escribiendo más.
   */
  searchable?: boolean | { placeholder?: string };
  /** El catálogo de opciones aún está cargando. */
  isLoading?: boolean;
  /** El catálogo de opciones no se pudo cargar. */
  isError?: boolean;
}

/** Tope de coincidencias pintadas en la variante con buscador. */
const SEARCHABLE_MAX_VISIBLE = 50;

/** Minúsculas y sin acentos, para comparar lo tecleado con las etiquetas. */
const foldText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const STATUS_LINE_CLS = 'px-3 py-2 text-xs text-slate-400 dark:text-slate-500';

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
 *
 * MODO SERVIDOR de `DataTable` (prop `server`): si la columna declara
 * `meta.serverFilter`, el valor activo y el cambio NO pasan por TanStack sino
 * por los filtros de servidor de la tabla (`DataTableModeContext`), con esa
 * clave. La columna no necesita `filterFn` (nada se filtra en memoria) y las
 * opciones deben venir de un catálogo, nunca de las filas cargadas.
 *
 * NO SE PINTA cuando filtrar en memoria engañaría, porque la tabla solo tiene
 * la página actual: bajo la `serverPagination` obsoleta, y en modo servidor si
 * la columna no declara `meta.serverFilter` o la tabla no recibe
 * `server.filters`.
 */
export function ColumnHeaderFilter<TData>({
  column,
  options,
  label,
  searchable = false,
  isLoading = false,
  isError = false,
}: ColumnHeaderFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tableMode = useContext(DataTableModeContext);
  const serverFilterKey = column.columnDef.meta?.serverFilter;
  const serverFilters =
    tableMode.mode === 'server' && serverFilterKey !== undefined ? tableMode.filters : undefined;
  const activeValue =
    serverFilters !== undefined && serverFilterKey !== undefined
      ? serverFilters.values[serverFilterKey]
      : tableMode.mode === 'client' && tableMode.columnFilters !== undefined
        ? (tableMode.columnFilters.find((filter) => filter.id === column.id)?.value as
            | string
            | undefined)
        : (column.getFilterValue() as string | undefined);
  const applyValue = (value: string | undefined) => {
    if (serverFilters !== undefined && serverFilterKey !== undefined) {
      serverFilters.onChange(serverFilterKey, value);
      return;
    }
    column.setFilterValue(value);
  };

  const isSearchable = searchable !== false;
  const searchPlaceholder =
    (typeof searchable === 'object' ? searchable.placeholder : undefined) ?? 'Buscar…';

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Variante con buscador: al abrir, el foco va al campo de texto.
  useEffect(() => {
    if (isOpen && isSearchable) searchInputRef.current?.focus();
  }, [isOpen, isSearchable]);

  // La opción resaltada con las flechas debe quedar a la vista.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (tableMode.mode === 'server-pagination') return null;
  if (tableMode.mode === 'server' && serverFilters === undefined) return null;

  // Opciones a pintar. Sin buscador: todas, en su orden (como siempre). Con
  // buscador: "Todos" y la seleccionada fijas arriba, y después las
  // coincidencias con lo tecleado, con tope.
  let visibleOptions = options;
  let hiddenCount = 0;
  let hasNoMatches = false;
  if (isSearchable) {
    const foldedQuery = foldText(query.trim());
    const allOption = options.find((opt) => opt.value === undefined);
    const selectedOption =
      activeValue === undefined ? undefined : options.find((opt) => opt.value === activeValue);
    const matches = options.filter(
      (opt) =>
        opt.value !== undefined &&
        opt !== selectedOption &&
        (foldedQuery === '' || foldText(opt.label).includes(foldedQuery)),
    );
    const capped = matches.slice(0, SEARCHABLE_MAX_VISIBLE);
    hiddenCount = matches.length - capped.length;
    hasNoMatches = foldedQuery !== '' && matches.length === 0;
    visibleOptions = [
      ...(allOption ? [allOption] : []),
      ...(selectedOption ? [selectedOption] : []),
      ...capped,
    ];
  }

  const selectOption = (opt: ColumnFilterOption) => {
    applyValue(opt.value);
    close();
  };

  const optionButtons = visibleOptions.map((opt, index) => (
    <button
      key={`${opt.value ?? ''}|${opt.label}`}
      type="button"
      role="menuitemradio"
      aria-checked={activeValue === opt.value}
      data-active={isSearchable && index === activeIndex ? 'true' : undefined}
      onClick={() => selectOption(opt)}
      className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
        activeValue === opt.value
          ? 'text-sky-600 dark:text-sky-400 font-semibold'
          : 'text-slate-600 dark:text-slate-300'
      }${isSearchable && index === activeIndex ? ' bg-slate-50 dark:bg-white/5' : ''}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${opt.dotClassName ?? ''}`}
        aria-hidden="true"
      />
      {opt.label}
    </button>
  ));

  const statusLines = (
    <>
      {isLoading && <p className={STATUS_LINE_CLS}>Cargando opciones…</p>}
      {isError && <p className={STATUS_LINE_CLS}>No se pudieron cargar las opciones.</p>}
      {hasNoMatches && !isLoading && !isError && (
        <p className={STATUS_LINE_CLS}>Sin coincidencias.</p>
      )}
      {hiddenCount > 0 && (
        <p className={STATUS_LINE_CLS}>Sigue escribiendo para acotar ({hiddenCount} más).</p>
      )}
    </>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) close();
          else setIsOpen(true);
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
      {isOpen && !isSearchable && (
        <div
          role="menu"
          aria-label={`Filtrar por ${label}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className="absolute left-0 top-full mt-1 w-44 max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-xl z-30 normal-case font-normal tracking-normal"
        >
          {optionButtons}
          {statusLines}
        </div>
      )}
      {isOpen && isSearchable && (
        <div
          role="menu"
          aria-label={`Filtrar por ${label}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          // El `<th>` que envuelve el encabezado ordena con Enter/Espacio y es
          // arrastrable: sin esto, escribir un espacio en el buscador ordenaría
          // la columna y seleccionar texto con el ratón la arrastraría.
          onKeyDown={(event) => event.stopPropagation()}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-xl z-30 normal-case font-normal tracking-normal"
        >
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((prev) => Math.min(visibleOptions.length - 1, prev + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((prev) => Math.max(0, prev - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const target = visibleOptions[activeIndex];
                  if (target) selectOption(target);
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  close();
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={`Buscar ${label}`}
              autoComplete="off"
              className="block w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
            />
          </div>
          <div ref={listRef} className="max-h-64 overflow-y-auto">
            {optionButtons}
            {statusLines}
          </div>
        </div>
      )}
    </div>
  );
}

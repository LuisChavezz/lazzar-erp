'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import type { Column } from '@tanstack/react-table';
import { FilterIcon } from './Icons';
import { DataTableModeContext } from './DataTableModeContext';
import type { ColumnFilterOption } from '@/src/utils/columnFilterOptions';

export type { ColumnFilterOption };

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
  /**
   * Borde del ícono al que se alinea el menú. Por defecto `"start"` (abre hacia
   * la derecha); `"end"` lo abre hacia la izquierda, para columnas pegadas al
   * borde derecho de la tabla (importes), donde el menú se saldría del marco.
   */
  menuAlign?: 'start' | 'end';
}

/** Tope de coincidencias pintadas en la variante con buscador. */
const SEARCHABLE_MAX_VISIBLE = 50;

/** Minúsculas y sin acentos, para comparar lo tecleado con las etiquetas. */
const foldText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
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
  menuAlign = 'start',
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

  const menuAlignCls = menuAlign === 'end' ? 'right-0' : 'left-0';
  const isSearchable = searchable !== false;

  // Etiqueta del valor activo para el chip "Filtrado por" de `DataTable`
  // (modo cliente). Sin opción que coincida (catálogo aún cargando) no se
  // reporta nada y el chip muestra solo el nombre de la columna.
  const reportFilterValueLabel =
    tableMode.mode === 'client' ? tableMode.reportFilterValueLabel : undefined;
  const activeLabel =
    activeValue === undefined
      ? undefined
      : options.find((opt) => opt.value === activeValue)?.label;
  useEffect(() => {
    reportFilterValueLabel?.(column.id, activeLabel);
  }, [reportFilterValueLabel, column.id, activeLabel]);
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

  // La opción resaltada (con las flechas, o sola al escribir) debe quedar a
  // la vista.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, query]);

  // Variante con buscador: mientras está abierto, el `<th>` que lo contiene
  // deja de ser arrastrable. Firefox no deja colocar el cursor ni seleccionar
  // texto con el ratón en un campo dentro de un ancestro `draggable`.
  useEffect(() => {
    if (!isOpen || !isSearchable) return;
    const draggableAncestor = containerRef.current?.closest<HTMLElement>('[draggable="true"]');
    if (!draggableAncestor) return;
    draggableAncestor.draggable = false;
    return () => {
      draggableAncestor.draggable = true;
    };
  }, [isOpen, isSearchable]);

  if (tableMode.mode === 'server-pagination') return null;
  if (tableMode.mode === 'server' && serverFilters === undefined) return null;

  // Opciones a pintar. Sin buscador: todas, en su orden (como siempre). Con
  // buscador: "Todos" y la seleccionada fijas arriba, y después las
  // coincidencias con lo tecleado, con tope.
  let visibleOptions = options;
  let hiddenCount = 0;
  let hasNoMatches = false;
  // Al escribir se resalta sola la primera coincidencia: Enter la elige sin
  // pasar por las flechas.
  let firstMatchIndex = -1;
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
    if (foldedQuery !== '' && capped.length > 0) {
      firstMatchIndex = visibleOptions.length - capped.length;
    }
  }
  const highlightedIndex = activeIndex >= 0 ? activeIndex : firstMatchIndex;

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
      data-active={isSearchable && index === highlightedIndex ? 'true' : undefined}
      onClick={() => selectOption(opt)}
      className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
        activeValue === opt.value
          ? 'text-sky-600 dark:text-sky-400 font-semibold'
          : 'text-slate-600 dark:text-slate-300'
      }${isSearchable && index === highlightedIndex ? ' bg-slate-50 dark:bg-white/5' : ''}`}
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
    <div
      className="relative"
      ref={containerRef}
      // El `<th>` que envuelve el encabezado ordena con Enter/Espacio (y
      // cancela la tecla): sin esto, abrir el filtro o elegir una opción con el
      // teclado reordenaría la columna, y un espacio en el buscador también.
      onKeyDown={(event) => event.stopPropagation()}
    >
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
            ? 'text-white bg-sky-500 dark:bg-sky-500'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
        aria-label={
          activeLabel ? `Filtrar por ${label} (filtro activo: ${activeLabel})` : `Filtrar por ${label}`
        }
        // Lo lee el `<th>` de `DataTable` (`has-[[data-filter-active]]`) para
        // resaltar la columna filtrada.
        data-filter-active={activeValue !== undefined ? '' : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={activeLabel ? `Filtro activo: ${activeLabel}` : `Filtrar por ${label}`}
      >
        <FilterIcon className="w-3 h-3" />
      </button>
      {isOpen && !isSearchable && (
        <div
          role="menu"
          aria-label={`Filtrar por ${label}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className={`absolute ${menuAlignCls} top-full mt-1 w-44 max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-xl z-30 normal-case font-normal tracking-normal`}
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
          // El `<th>` es arrastrable: que arrastrar dentro del menú no mueva
          // la columna.
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`absolute ${menuAlignCls} top-full mt-1 w-64 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-900 shadow-xl z-30 normal-case font-normal tracking-normal`}
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
                  setActiveIndex(Math.min(visibleOptions.length - 1, highlightedIndex + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex(Math.max(0, highlightedIndex - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const target = visibleOptions[highlightedIndex];
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

/**
 * Encabezado "título + embudo" para una columna con `ColumnHeaderFilter`. Es
 * el marcado que repetía cada tabla; los props del filtro se pasan tal cual.
 */
export function FilterHeader<TData>({
  title,
  ...filterProps
}: ColumnHeaderFilterProps<TData> & { title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{title}</span>
      <ColumnHeaderFilter {...filterProps} />
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useId, useMemo, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  PaginationState,
} from "@tanstack/react-table";
import {
  ColumnsSettingsIcon,
  SearchIcon,
  CloseIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  SyncIcon,
  FilterIcon,
} from "./Icons";
import { Button } from "./Button";
import { Loader } from "./Loader";
import { DropdownMenu } from "@radix-ui/themes";

export type DataTableVisibleColumn<TData> = {
  id: string;
  header: string;
  accessorKey?: string;
  accessorFn?: (originalRow: TData, index: number) => unknown;
};

// ─── Filter types ────────────────────────────────────────────────────────────

export interface DataTableFilterOption {
  value: string;
  label: string;
}

export interface DataTableFilterConfig {
  id: string;
  label: string;
  options: DataTableFilterOption[];
}

export interface DataTableActiveFilter {
  configId: string;
  value: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  baseDataCount?: number;
  title?: string;
  searchPlaceholder?: string;
  actionButton?: React.ReactNode;
  filterConfig?: DataTableFilterConfig[];
  onActiveFiltersChange?: (filters: DataTableActiveFilter[]) => void;
  onRefetch?: () => void | Promise<unknown>;
  isRefetching?: boolean;
  onVisibleRowsChange?: (rows: TData[]) => void;
  onVisibleColumnsChange?: (columns: DataTableVisibleColumn<TData>[]) => void;
  isLoadingOverlay?: boolean;
  loadingTitle?: string;
  loadingMessage?: string;
  /** Al cambiar, reinicia la paginación a la página 1 sin afectar sorting, búsqueda, filtros o columnas. */
  paginationResetKey?: string | number;
  /** Mensaje del estado vacío dentro del cuerpo de la tabla (cuando no hay datos). */
  emptyMessage?: string;
  /**
   * Paginación controlada por el servidor. Cuando se proporciona, la tabla NO
   * recorta `data` (el llamador ya pasó solo la página actual, p. ej.
   * `response.results`) y su pager se cablea a `onPageChange` en vez de a la
   * paginación interna en cliente. Si se omite (todos los consumidores
   * actuales), el comportamiento es idéntico al previo: paginación 100 % en
   * cliente sobre `data`.
   */
  serverPagination?: {
    /** Total de páginas, derivado de `count`/`page_size`. */
    pageCount: number;
    /** Página actual, 1-indexada (misma convención que la API). */
    currentPage: number;
    onPageChange: (page: number) => void;
    /** Deshabilita los controles del pager durante la transición de página. */
    isFetching?: boolean;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  baseDataCount,
  title,
  searchPlaceholder = "Buscar...",
  actionButton,
  filterConfig,
  onActiveFiltersChange,
  onRefetch,
  isRefetching,
  onVisibleRowsChange,
  onVisibleColumnsChange,
  isLoadingOverlay = false,
  loadingTitle,
  loadingMessage,
  paginationResetKey,
  emptyMessage,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const searchInputId = useId();
  const columnsMenuId = `${searchInputId}-columns-menu`;

  // State for sorting, filtering, and column visibility
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Reset pagination when paginationResetKey changes
  const previousPaginationResetKeyRef = useRef(paginationResetKey);
  useEffect(() => {
    if (paginationResetKey === undefined) return;
    if (previousPaginationResetKeyRef.current === paginationResetKey) return;
    previousPaginationResetKeyRef.current = paginationResetKey;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [paginationResetKey]);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filterContentHeight, setFilterContentHeight] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterContentRef = useRef<HTMLDivElement>(null);

  // ── Filter state (Notion-style) ───────────────────────────────────────────
  const [activeFilters, setActiveFilters] = useState<DataTableActiveFilter[]>([]);
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [pendingFilterId, setPendingFilterId] = useState<string | null>(null);
  const [isValueDropdownOpen, setIsValueDropdownOpen] = useState(false);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);
  const addFilterDropdownRef = useRef<HTMLDivElement>(null);
  const valueDropdownRef = useRef<HTMLDivElement>(null);

  const activeConfigIds = useMemo(
    () => new Set(activeFilters.map((f) => f.configId)),
    [activeFilters]
  );

  const availableFilters = useMemo(
    () => (filterConfig ?? []).filter((fc) => !activeConfigIds.has(fc.id)),
    [filterConfig, activeConfigIds]
  );

  const pendingConfig = useMemo(
    () => (pendingFilterId ? filterConfig?.find((fc) => fc.id === pendingFilterId) ?? null : null),
    [pendingFilterId, filterConfig]
  );

  const activeFilterConfigs = useMemo(
    () =>
      activeFilters
        .map((af) => {
          const config = filterConfig?.find((fc) => fc.id === af.configId);
          if (!config) return null;
          const option = config.options.find((o) => o.value === af.value);
          return { ...af, label: config.label, valueLabel: option?.label ?? af.value };
        })
        .filter(Boolean) as (DataTableActiveFilter & { label: string; valueLabel: string })[],
    [activeFilters, filterConfig]
  );

  const allFiltersActive = filterConfig && filterConfig.length > 0 && availableFilters.length === 0;

  // ── Filter data internally ────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (activeFilters.length === 0) return data;
    return data.filter((row) =>
      activeFilters.every((af) => {
        const rowValue = (row as Record<string, unknown>)[af.configId];
        return String(rowValue) === af.value;
      })
    );
  }, [data, activeFilters]);


  // Function to handle column reordering
  const moveColumn = (draggedId: string, targetId: string) => {
    const newColumnOrder = [...table.getAllLeafColumns().map((c) => c.id)];
    const draggedIndex = newColumnOrder.indexOf(draggedId);
    const targetIndex = newColumnOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    newColumnOrder.splice(draggedIndex, 1);
    newColumnOrder.splice(targetIndex, 0, draggedId);

    setColumnOrder(newColumnOrder);
  };

  // State for columns dropdown
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);
  const previousVisibleRowsSignatureRef = useRef("");
  const previousVisibleColumnsSignatureRef = useRef("");

  // Close columns dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnsDropdownRef.current &&
        !columnsDropdownRef.current.contains(event.target as Node) &&
        columnsBtnRef.current &&
        !columnsBtnRef.current.contains(event.target as Node)
      ) {
        setIsColumnsOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (isColumnsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    // Remove event listener when dropdown is closed
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColumnsOpen]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Add Filter dropdown
      if (
        isAddFilterOpen &&
        addFilterDropdownRef.current &&
        !addFilterDropdownRef.current.contains(target) &&
        addFilterBtnRef.current &&
        !addFilterBtnRef.current.contains(target)
      ) {
        setIsAddFilterOpen(false);
      }
    };

    if (isAddFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddFilterOpen]);

  // ── Modo de paginación de servidor ────────────────────────────────────────
  // En este modo `data` ya es solo la página actual (el llamador paginó en el
  // servidor). Se anula la paginación en cliente mostrando TODAS las filas
  // recibidas en una sola "página" interna, para no recortar dos veces; el
  // sorting y la búsqueda siguen operando sobre la página vigente.
  const isServerPaginated = serverPagination !== undefined;
  const effectivePagination = isServerPaginated
    ? { pageIndex: 0, pageSize: Math.max(data.length, 1) }
    : pagination;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnOrder,
      pagination: effectivePagination,
    },
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const hasBaseData = baseDataCount !== undefined ? baseDataCount > 0 : data.length > 0;
  const totalRows = table.getFilteredRowModel().rows.length;
  const startRow = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const endRow = totalRows === 0 ? 0 : Math.min(totalRows, (pagination.pageIndex + 1) * pagination.pageSize);
  const pageCount = isServerPaginated
    ? Math.max(1, serverPagination.pageCount)
    : table.getPageCount();
  // Se acota al rango válido para nunca MOSTRAR un estado imposible (p. ej.
  // "Página 8 de 3") si el consumidor pasa una página fuera de rango; también
  // hace que "anterior/siguiente" partan de una base sensata. En cliente ya es
  // válida (no-op). NO se corrige el estado del consumidor por cuenta propia
  // (no se llama a `onPageChange` solo): eso sigue siendo su responsabilidad.
  const currentPage = isServerPaginated
    ? Math.min(Math.max(1, serverPagination.currentPage), pageCount)
    : pagination.pageIndex + 1;

  // El pager permanece visible en modo servidor aunque la página actual venga
  // vacía (p. ej. tras encogerse el conjunto), para no dejar al usuario sin
  // forma de volver a una página con datos. En cliente conserva el gate por datos.
  const showPager = isServerPaginated || hasBaseData;

  // ── Controles del pager: en modo servidor delegan en `onPageChange`; en
  //    cliente, en la paginación interna de la tabla. ────────────────────────
  const canPreviousPage = isServerPaginated
    ? currentPage > 1
    : table.getCanPreviousPage();
  const canNextPage = isServerPaginated
    ? currentPage < pageCount
    : table.getCanNextPage();
  const pagerBusy = isServerPaginated
    ? Boolean(serverPagination.isFetching)
    : false;
  const goToPage = (targetPage: number) => {
    if (isServerPaginated) serverPagination.onPageChange(targetPage);
    else table.setPageIndex(targetPage - 1);
  };
  const goToPreviousPage = () =>
    isServerPaginated
      ? serverPagination.onPageChange(currentPage - 1)
      : table.previousPage();
  const goToNextPage = () =>
    isServerPaginated
      ? serverPagination.onPageChange(currentPage + 1)
      : table.nextPage();
  const visibleRowsSignature = useMemo(
    () => visibleRows.map((row) => row.id).join("|"),
    [visibleRows]
  );
  const visibleColumnsSignature = useMemo(
    () => visibleColumns.map((column) => column.id).join("|"),
    [visibleColumns]
  );

  const getPaginationItems = (current: number, total: number) => {
    const items: Array<number | "ellipsis"> = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i += 1) {
        items.push(i);
      }
      return items;
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    items.push(1);

    if (start > 2) {
      items.push("ellipsis");
    }

    for (let i = start; i <= end; i += 1) {
      items.push(i);
    }

    if (end < total - 1) {
      items.push("ellipsis");
    }

    items.push(total);
    return items;
  };

  const getColumnLabel = useCallback((column: (typeof visibleColumns)[number]) => {
    const columnDef = column.columnDef as {
      header?: unknown;
      accessorKey?: string;
      meta?: { label?: string };
    };

    if (typeof columnDef.meta?.label === "string" && columnDef.meta.label.trim().length > 0) {
      return columnDef.meta.label;
    }

    if (typeof columnDef.header === "string" && columnDef.header.trim().length > 0) {
      return columnDef.header;
    }

    const rawLabel = columnDef.accessorKey ?? column.id;
    return rawLabel
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, []);

  useEffect(() => {
    if (!onVisibleRowsChange) return;
    if (previousVisibleRowsSignatureRef.current === visibleRowsSignature) return;
    previousVisibleRowsSignatureRef.current = visibleRowsSignature;
    onVisibleRowsChange(visibleRows.map((r) => r.original));
  }, [
    onVisibleRowsChange,
    visibleRows,
    visibleRowsSignature,
  ]);

  useEffect(() => {
    if (!onVisibleColumnsChange) return;
    if (previousVisibleColumnsSignatureRef.current === visibleColumnsSignature) return;
    previousVisibleColumnsSignatureRef.current = visibleColumnsSignature;

    const getColumnDef = (
      column: (typeof visibleColumns)[number]
    ): ColumnDef<TData, unknown> & {
      accessorKey?: string;
      accessorFn?: (originalRow: TData, index: number) => unknown;
    } => column.columnDef as ColumnDef<TData, unknown> & {
      accessorKey?: string;
      accessorFn?: (originalRow: TData, index: number) => unknown;
    };

    const mappedColumns = visibleColumns.map((column) => ({
      id: column.id,
      header: getColumnLabel(column),
      accessorKey:
        typeof getColumnDef(column).accessorKey === "string" ? getColumnDef(column).accessorKey : undefined,
      accessorFn: getColumnDef(column).accessorFn,
    }));
    onVisibleColumnsChange(mappedColumns);
  }, [
    onVisibleColumnsChange,
    visibleColumns,
    visibleColumnsSignature,
    getColumnLabel,
  ]);

  // Notify parent when active filters change
  useEffect(() => {
    onActiveFiltersChange?.(activeFilters);
  }, [activeFilters, onActiveFiltersChange]);

  // Measure filter content height for animation
  useEffect(() => {
    if (filterContentRef.current) {
      setFilterContentHeight(filterContentRef.current.scrollHeight);
    }
  }, [filterConfig, activeFilterConfigs, isValueDropdownOpen, pendingConfig]);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, pageCount),
    [currentPage, pageCount]
  );

  return (
    <div>
      <div className={"flex flex-col lg:flex-row lg:items-center " + (title ? "justify-between" : "justify-end") + " gap-4 mb-4"}>
      {title ? (
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          {title}
        </h1>
      ) : null}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full lg:w-auto">
          <div className="w-full lg:w-auto overflow-x-auto lg:overflow-visible pb-1">
            <div className="flex items-center justify-end gap-2 min-w-max">
            {/* La búsqueda se OCULTA en modo servidor: filtraría solo la página
                actual (no la consulta completa), haciendo creer que un registro
                de otra página "no existe". Aún no hay búsqueda server-side para
                estos reportes. En modo cliente permanece visible como antes. */}
            {!isServerPaginated && (
            <div className="flex items-center gap-0">
              <button
                type="button"
                onClick={() => {
                    const willExpand = !isSearchExpanded;
                    setIsSearchExpanded(willExpand);
                    if (willExpand) {
                      setTimeout(() => searchInputRef.current?.focus(), 300);
                    }
                  }}
                  className={`inline-flex items-center justify-center p-2 cursor-pointer transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 shadow-sm shrink-0 ${
                    isSearchExpanded
                      ? "rounded-l-xl rounded-r-none border-r-0"
                      : "rounded-xl"
                  }`}
                  aria-label={isSearchExpanded ? "Cerrar búsqueda" : "Buscar"}
                >
                  <SearchIcon className="w-4 h-4 shrink-0" />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    width: isSearchExpanded ? "16rem" : "0px",
                    opacity: isSearchExpanded ? 1 : 0,
                  }}
                >
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      id={searchInputId}
                      type="search"
                      value={globalFilter ?? ""}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      className="block w-64 py-1.5 pl-1.5 pr-9 text-sm leading-5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/50 focus:border-sky-500 transition-shadow [&::-webkit-search-cancel-button]:hidden [-moz-appearance:textfield] rounded-r-xl border-l-0"
                    />
                    {globalFilter && (
                      <button
                        type="button"
                        onClick={() => setGlobalFilter("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Limpiar búsqueda"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* /búsqueda */}

            {!isServerPaginated && filterConfig && filterConfig.length > 0 && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                aria-expanded={isFilterExpanded}
                aria-label="Filtros"
                className={`transition-colors shrink-0 ${
                  isFilterExpanded
                    ? "bg-sky-100 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 text-sky-600 dark:text-sky-400"
                    : ""
                }`}
              >
                <FilterIcon className="w-4 h-4 shrink-0" />
              </Button>
            )}
            {onRefetch && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onRefetch()}
                disabled={isRefetching}
                aria-label="Actualizar datos"
              >
                <SyncIcon className={`w-4 h-4 shrink-0 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            )}
            {hasBaseData && (
              <>
                <div className="relative">
                  <Button
                    variant="secondary"
                    size="icon"
                    ref={columnsBtnRef}
                    onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                    aria-expanded={isColumnsOpen}
                    aria-controls={columnsMenuId}
                    aria-haspopup="menu"
                    aria-label="Configurar columnas"
                  >
                    <ColumnsSettingsIcon className="w-4 h-4 shrink-0" />
                  </Button>

                  {isColumnsOpen && (
                    <div
                      id={columnsMenuId}
                      ref={columnsDropdownRef}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
                      role="menu"
                      aria-label="Selector de columnas"
                    >
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
                        <h3 className="font-semibold text-sm text-slate-800 dark:text-white">
                          Mostrar/Ocultar
                        </h3>
                      </div>
                      <div className="p-2 max-h-60 overflow-y-auto">
                        {table.getAllLeafColumns().map((column) => {
                          return (
                            <button
                              type="button"
                              key={column.id}
                              className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                              onClick={() => column.toggleVisibility(!column.getIsVisible())}
                              aria-pressed={column.getIsVisible()}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  column.getIsVisible()
                                    ? "bg-sky-500 border-sky-500"
                                    : "border-slate-300 dark:border-slate-600"
                                }`}
                              >
                                {column.getIsVisible() && (
                                  <CheckCircleIcon className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <span className="text-sm text-slate-700 dark:text-slate-300 select-none">
                                {getColumnLabel(column)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {actionButton}
            </div>
          </div>
        </div>
      </div>

      {/* ── Separator + Filters Container ───────────────────────────────────── */}
      {!isServerPaginated && filterConfig && filterConfig.length > 0 && (
        <div
          className="transition-all duration-300 ease-in-out"
          style={{
            maxHeight: isFilterExpanded ? `${filterContentHeight}px` : "0px",
            opacity: isFilterExpanded ? 1 : 0,
            overflow: isFilterExpanded ? "visible" : "hidden",
            pointerEvents: isFilterExpanded ? "auto" : "none",
          }}
        >
          <div ref={filterContentRef} className="mb-2">
            <hr className="border-t border-slate-200 dark:border-white/10 mb-3" />
            <div className="flex flex-wrap items-center gap-2">
              {/* Active filter chips */}
              {activeFilterConfigs.map((af) => {
                const config = filterConfig?.find((fc) => fc.id === af.configId);
                const options = config?.options ?? [];
                return (
                  <DropdownMenu.Root key={af.configId}>
                    <DropdownMenu.Trigger>
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 cursor-pointer hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors group/chip"
                        role="button"
                        tabIndex={0}
                      >
                        <span className="text-[10px] font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider">
                          {af.label}:
                        </span>
                        <span>{af.valueLabel}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilters((prev) => prev.filter((f) => f.configId !== af.configId));
                            setPendingFilterId(null);
                            setIsValueDropdownOpen(false);
                          }}
                          className="ml-0.5 rounded-full p-0.5 text-sky-400 hover:text-sky-600 hover:bg-sky-200/50 dark:hover:text-sky-200 dark:hover:bg-sky-500/30 transition-colors"
                          aria-label={`Quitar filtro ${af.label}`}
                        >
                          <CloseIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      align="start"
                      className="bg-white! dark:bg-zinc-900! min-w-40 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
                    >
                      {options.map((opt) => (
                        <DropdownMenu.Item
                          key={opt.value}
                          onClick={() => {
                            setActiveFilters((prev) =>
                              prev.map((f) =>
                                f.configId === af.configId ? { ...f, value: opt.value } : f
                              )
                            );
                          }}
                          className={`flex items-center px-3 py-2 text-xs rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors ${
                            opt.value === af.value
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                );
              })}

              {/* Value dropdown for pending filter */}
              {isValueDropdownOpen && pendingConfig && (
                <DropdownMenu.Root
                  open={true}
                  onOpenChange={(open) => {
                    if (!open) {
                      setIsValueDropdownOpen(false);
                      setPendingFilterId(null);
                    }
                  }}
                >
                  <DropdownMenu.Trigger>
                    <div
                      ref={valueDropdownRef}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {pendingConfig.label}:
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">Seleccionar...</span>
                    </div>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content
                    align="start"
                    className="bg-white! dark:bg-zinc-900! min-w-40 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
                  >
                    {pendingConfig.options.map((opt) => (
                      <DropdownMenu.Item
                        key={opt.value}
                        onClick={() => {
                          setActiveFilters((prev) => {
                            const existing = prev.find((f) => f.configId === pendingConfig.id);
                            if (existing) {
                              return prev.map((f) =>
                                f.configId === pendingConfig.id ? { ...f, value: opt.value } : f
                              );
                            }
                            return [...prev, { configId: pendingConfig.id, value: opt.value }];
                          });
                          setPendingFilterId(null);
                          setIsValueDropdownOpen(false);
                        }}
                        className="flex items-center px-3 py-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer! outline-none data-highlighted:bg-slate-50 dark:data-highlighted:bg-white/5 data-highlighted:text-sky-600 dark:data-highlighted:text-sky-400 transition-colors"
                      >
                        {opt.label}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}

              {/* Add Filter button */}
              {availableFilters.length > 0 && (
                <div className="relative">
                  <button
                    ref={addFilterBtnRef}
                    type="button"
                    onClick={() => {
                      setIsAddFilterOpen(!isAddFilterOpen);
                      setIsValueDropdownOpen(false);
                      setPendingFilterId(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors bg-transparent"
                  >
                    + Añadir filtro
                  </button>

                  {isAddFilterOpen && (
                    <div
                      ref={addFilterDropdownRef}
                      className="absolute left-0 mt-1 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
                    >
                      <div className="p-1 max-h-60 overflow-y-auto">
                        {availableFilters.map((fc) => (
                          <button
                            key={fc.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                            onClick={() => {
                              setPendingFilterId(fc.id);
                              setIsAddFilterOpen(false);
                              setIsValueDropdownOpen(true);
                            }}
                          >
                            {fc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Disabled button when all filters active */}
              {allFiltersActive && (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700 bg-transparent cursor-not-allowed"
                >
                  + Añadir filtro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* La cabecera (columnas) permanece visible aunque no haya filas; el
          mensaje de vacío se muestra dentro del cuerpo de la tabla. */}
      <div className="relative w-full rounded-2xl border border-slate-200 dark:border-white/20 shadow-sm bg-white dark:bg-black">
          <div
            className={`overflow-x-auto rounded-2xl max-w-full bg-white dark:bg-black transition-all ${
              visibleRows.length > 0 || isLoadingOverlay ? "h-120" : ""
            } ${
              isLoadingOverlay ? "blur-sm pointer-events-none select-none" : ""
            }`}
          >
            <table
              className="min-w-full text-left border-collapse bg-white dark:bg-black table-fixed"
              style={{ width: table.getTotalSize() }}
            >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {headerGroup.headers.map((header) => {
                    // En modo servidor se desactiva el ordenamiento: solo
                    // ordenaría las filas de la página actual, dando un "top"
                    // parcial engañoso respecto al conjunto completo.
                    const canSort = !isServerPaginated && header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    const ariaSortValue =
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                        ? "descending"
                        : "none";
                    const handleSortToggle = () => {
                      if (!canSort) return;
                      header.column.toggleSorting();
                    };

                    return (
                    <th
                      key={header.id}
                      scope="col"
                      draggable={!header.isPlaceholder && !header.column.getIsResizing()}
                      onDragStart={(e) => {
                        if (header.column.getIsResizing()) {
                          e.preventDefault();
                          return;
                        }
                        setDraggedColumnId(header.column.id);
                        e.dataTransfer.setData("columnId", header.column.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (header.column.id !== draggedColumnId) {
                          setDragOverColumnId(header.column.id);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverColumnId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDraggedColumnId(null);
                        setDragOverColumnId(null);
                        const draggedId = e.dataTransfer.getData("columnId");
                        if (draggedId && draggedId !== header.column.id) {
                          moveColumn(draggedId, header.column.id);
                        }
                      }}
                      className={`px-6 py-4 font-semibold transition-colors group/th sticky top-0 z-10 bg-slate-50 dark:bg-zinc-900 ${
                        canSort
                          ? "cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300"
                          : ""
                      } ${
                        dragOverColumnId === header.column.id
                          ? "border-2 border-sky-500 bg-slate-100 dark:bg-white/10"
                          : ""
                      } ${
                        draggedColumnId === header.column.id ? "opacity-50" : ""
                      }`}
                      onClick={handleSortToggle}
                      onKeyDown={(event) => {
                        if (!canSort) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSortToggle();
                        }
                      }}
                      tabIndex={canSort ? 0 : -1}
                      aria-sort={canSort ? ariaSortValue : undefined}
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}

                        {{
                          asc: <ChevronUpIcon className="w-3 h-3" />,
                          desc: <ChevronDownIcon className="w-3 h-3" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      
                      {/* Column Resizer */}
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          header.getResizeHandler()(e);
                          e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          header.getResizeHandler()(e);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute right-0 top-0 h-full w-2 rounded cursor-col-resize touch-none select-none z-10 ${
                          header.column.getIsResizing()
                            ? "bg-sky-500 opacity-100 w-0.5 right-0"
                            : table.getState().columnSizingInfo.isResizingColumn
                            ? "opacity-0 pointer-events-none"
                            : "opacity-0 hover:opacity-100 group-hover/th:opacity-100"
                        }`}
                      >
                          <div className={`h-full w-0.5 mx-auto rounded bg-sky-500/50 ${header.column.getIsResizing() ? "bg-sky-500" : ""}`} />
                      </div>
                    </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={visibleColumns.length || 1}
                      className="px-6 py-6 text-center text-slate-500 dark:text-slate-400"
                    >
                      {!hasBaseData
                        ? emptyMessage ?? "No hay elementos para mostrar"
                        : globalFilter.trim().length > 0
                        ? `No se encontraron resultados para ${globalFilter}`
                        : "No se encontraron resultados"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isLoadingOverlay && (
            <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-white/35 dark:bg-black/35 backdrop-blur-sm">
              <Loader
                className="h-full w-full"
                title={loadingTitle ?? "Procesando"}
                message={loadingMessage ?? "Espera un momento..."}
              />
            </div>
          )}
        </div>

      {showPager && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {isServerPaginated
              ? `Página ${currentPage} de ${pageCount}`
              : `Mostrando ${startRow}-${endRow} de ${totalRows}`}
          </div>
          <div className="w-full sm:w-auto overflow-x-auto">
            <div className="flex items-center justify-end gap-3 min-w-max">
            {/* Selector de filas por página: solo en modo cliente. En modo
                servidor el `page_size` es fijo (lo define el llamador). */}
            {!isServerPaginated && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Filas</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option
                      key={size}
                      value={size}
                      className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-slate-100"
                    >
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={goToPreviousPage}
                disabled={!canPreviousPage || pagerBusy}
                className="border-slate-200 dark:border-white/10"
                aria-label="Página anterior"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {paginationItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === currentPage ? "primary" : "secondary"}
                      size="icon"
                      onClick={() => goToPage(item)}
                      disabled={pagerBusy}
                      className={`h-9 w-9 p-0 ${item === currentPage ? "" : "border-slate-200 dark:border-white/10"}`}
                      aria-current={item === currentPage ? "page" : undefined}
                      aria-label={`Ir a la página ${item}`}
                    >
                      {item}
                    </Button>
                  )
                )}
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={goToNextPage}
                disabled={!canNextPage || pagerBusy}
                className="border-slate-200 dark:border-white/10"
                aria-label="Página siguiente"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

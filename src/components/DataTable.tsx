"use client";

import { useState, useRef, useEffect, useId, useMemo } from "react";
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
  CloseIcon,
  SearchIcon,
  SettingsIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  SyncIcon,
} from "./Icons";
import { Button } from "./Button";
import { Loader } from "./Loader";

export type DataTableVisibleColumn<TData> = {
  id: string;
  header: string;
  accessorKey?: string;
  accessorFn?: (originalRow: TData, index: number) => unknown;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  baseDataCount?: number;
  title?: string;
  searchPlaceholder?: string;
  actionButton?: React.ReactNode;
  onFiltersClick?: () => void;
  isFiltersActive?: boolean;
  onClearFilters?: () => void;
  onRefetch?: () => void | Promise<unknown>;
  isRefetching?: boolean;
  onVisibleRowsChange?: (rows: TData[]) => void;
  onVisibleColumnsChange?: (columns: DataTableVisibleColumn<TData>[]) => void;
  isLoadingOverlay?: boolean;
  loadingTitle?: string;
  loadingMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  baseDataCount,
  title,
  searchPlaceholder = "Buscar...",
  actionButton,
  onFiltersClick,
  isFiltersActive,
  onClearFilters,
  onRefetch,
  isRefetching,
  onVisibleRowsChange,
  onVisibleColumnsChange,
  isLoadingOverlay = false,
  loadingTitle,
  loadingMessage,
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
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);


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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      columnOrder,
      pagination,
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
  const pageCount = table.getPageCount();
  const currentPage = pagination.pageIndex + 1;
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

  const getColumnLabel = (column: (typeof visibleColumns)[number]) => {
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
  };

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
      header: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
      accessorKey:
        typeof getColumnDef(column).accessorKey === "string" ? getColumnDef(column).accessorKey : undefined,
      accessorFn: getColumnDef(column).accessorFn,
    }));
    onVisibleColumnsChange(mappedColumns);
  }, [
    onVisibleColumnsChange,
    visibleColumns,
    visibleColumnsSignature,
  ]);

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, pageCount),
    [currentPage, pageCount]
  );

  return (
    <div>
      <div className={`flex flex-col lg:flex-row lg:items-center ${title ? "justify-between" : "justify-end"} gap-4 mb-8 `}>
      {title ? (
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          {title}
        </h1>
      ) : null}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full lg:w-auto">
          {hasBaseData && (
            <>
              <div className="relative w-full sm:w-64 lg:w-72 lg:flex-none">
                <label htmlFor={searchInputId} className="sr-only">
                  {searchPlaceholder}
                </label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon className="h-5 w-5" />
                </div>
                <input
                  id={searchInputId}
                  type="search"
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-shadow"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
                {globalFilter.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}

          <div className="w-full lg:w-auto overflow-x-auto lg:overflow-visible pb-1">
            <div className="flex items-center justify-end gap-2 min-w-max">
            {onRefetch && (
              <Button
                variant="secondary"
                onClick={() => onRefetch()}
                disabled={isRefetching}
                leftIcon={<SyncIcon className={`w-4 h-4 shrink-0 ${isRefetching ? "animate-spin" : ""}`} />}
                className="shrink-0"
                aria-label="Actualizar datos"
              >
                Sincronizar
              </Button>
            )}
            {hasBaseData && (
              <>
                {onFiltersClick && (
                  <Button
                    variant="secondary"
                    onClick={onFiltersClick}
                    leftIcon={<FilterIcon className="w-4 h-4 shrink-0" />}
                    className="shrink-0"
                    aria-label="Filtrar datos"
                  >
                    Filtros
                  </Button>
                )}
                {onClearFilters && isFiltersActive && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={onClearFilters}
                    className="rounded-full border-slate-200 dark:border-white/20 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100"
                    aria-label="Limpiar filtros"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </Button>
                )}
                <div className="relative">
                  <Button
                    variant="secondary"
                    ref={columnsBtnRef}
                    onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                    leftIcon={<SettingsIcon className="w-4 h-4 shrink-0" />}
                    className="shrink-0"
                    aria-expanded={isColumnsOpen}
                    aria-controls={columnsMenuId}
                    aria-haspopup="menu"
                  >
                    Columnas
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

      {visibleRows.length > 0 ? (
        <div className="relative w-full rounded-2xl border border-slate-200 dark:border-white/20 shadow-sm bg-white dark:bg-black">
          <div
            className={`h-120 overflow-x-auto [scrollbar-gutter:stable] rounded-2xl max-w-full bg-white dark:bg-black transition-all ${
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
                    const canSort = header.column.getCanSort();
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
                {visibleRows.map((row) => (
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
                ))}
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
      ) : null}

      {!hasBaseData && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p>No hay elementos para mostrar</p>
        </div>
      )}

      {hasBaseData && visibleRows.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p>
            {globalFilter.trim().length > 0
              ? `No se encontraron resultados para ${globalFilter}`
              : "No se encontraron resultados"}
          </p>
        </div>
      )}

      {hasBaseData && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Mostrando {startRow}-{endRow} de {totalRows}
          </div>
          <div className="w-full sm:w-auto overflow-x-auto">
            <div className="flex items-center justify-end gap-3 min-w-max">
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
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
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
                      onClick={() => table.setPageIndex(item - 1)}
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
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
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

"use client";

import { useState, useRef, useEffect } from "react";
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
} from "./Icons";

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
  onVisibleRowsChange?: (rows: TData[]) => void;
  onVisibleColumnsChange?: (columns: DataTableVisibleColumn<TData>[]) => void;
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
  onVisibleRowsChange,
  onVisibleColumnsChange,
}: DataTableProps<TData, TValue>) {

  // State for sorting, filtering, and column visibility
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
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

  // Update visible rows when state changes
  useEffect(() => {
    if (onVisibleRowsChange) {
      onVisibleRowsChange(visibleRows.map((r) => r.original));
    }
  }, [
    onVisibleRowsChange,
    visibleRows,
    sorting,
    globalFilter,
    columnVisibility,
    columnOrder,
    pagination,
    data,
  ]);

  useEffect(() => {
    if (onVisibleColumnsChange) {
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
    }
  }, [
    onVisibleColumnsChange,
    visibleColumns,
    sorting,
    globalFilter,
    columnVisibility,
    columnOrder,
    pagination,
    data,
  ]);

  return (
    <div>
      <div className={`flex flex-col lg:flex-row lg:items-center ${title ? "justify-between" : "justify-end"} gap-4 mb-8 `}>
      {title ? (
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          {title}
        </h1>
      ) : null}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {hasBaseData && (
            <>
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-shadow"
                  placeholder={searchPlaceholder}
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

          <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
            {hasBaseData && (
              <>
                {onFiltersClick && (
                  <button
                    type="button"
                    onClick={onFiltersClick}
                    className="px-4 py-2 cursor-pointer bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all flex items-center gap-2"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Filtros
                  </button>
                )}
                {onClearFilters && isFiltersActive && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex items-center justify-center p-1.5 rounded-full border bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/20 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100 cursor-pointer transition-colors"
                    aria-label="Limpiar filtros"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
                <div className="relative">
                  <button
                    ref={columnsBtnRef}
                    onClick={() => setIsColumnsOpen(!isColumnsOpen)}
                    className="px-4 py-2 cursor-pointer bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all flex items-center gap-2"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Columnas
                  </button>

                  {isColumnsOpen && (
                    <div
                      ref={columnsDropdownRef}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
                        <h3 className="font-semibold text-sm text-slate-800 dark:text-white">
                          Mostrar/Ocultar
                        </h3>
                      </div>
                      <div className="p-2 max-h-60 overflow-y-auto">
                        {table.getAllLeafColumns().map((column) => {
                          return (
                            <div
                              key={column.id}
                              className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                              onClick={() => column.toggleVisibility(!column.getIsVisible())}
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
                                {typeof column.columnDef.header === "string"
                                  ? column.columnDef.header
                                  : column.id}
                              </span>
                            </div>
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

      {visibleRows.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-4xl border border-slate-200 dark:border-white/20 shadow-sm">
          <table className="w-full text-left border-collapse bg-white dark:bg-black table-fixed">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
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
                      className={`px-6 py-4 font-semibold transition-colors relative group/th ${
                        header.column.getCanSort()
                          ? "cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300"
                          : ""
                      } ${
                        dragOverColumnId === header.column.id
                          ? "border-2 border-sky-500 bg-slate-100 dark:bg-white/10"
                          : ""
                      } ${
                        draggedColumnId === header.column.id ? "opacity-50" : ""
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
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
                  ))}
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
            Mostrando {visibleRows.length} de {table.getFilteredRowModel().rows.length}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Filas</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
              >
                {[5, 10, 20].map((size) => (
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
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 transition-colors ${
                  table.getCanPreviousPage()
                    ? "hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 transition-colors ${
                  table.getCanNextPage()
                    ? "hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

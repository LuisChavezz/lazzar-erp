"use client";

import { useState, useRef, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  VisibilityState,
  ColumnOrderState,
} from "@tanstack/react-table";
import {
  SearchIcon,
  SettingsIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "./Icons";
import { User } from "../features/users/interfaces/user.interface";

// DataTable component props
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  searchPlaceholder?: string;
  actionButton?: React.ReactNode;
  loadingRowIds?: (string | number)[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  searchPlaceholder = "Buscar...",
  actionButton,
  loadingRowIds = [],
}: DataTableProps<TData, TValue>) {

  // State for sorting, filtering, and column visibility
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
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
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        {title && (
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-shadow"
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
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
                        onClick={() =>
                          column.toggleVisibility(!column.getIsVisible())
                        }
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

            {actionButton}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-4xl border border-slate-200 dark:border-white/20 shadow-sm">
        <table className="w-full text-left border-collapse bg-white dark:bg-black">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    draggable={!header.isPlaceholder}
                    onDragStart={(e) => {
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
                    className={`px-6 py-4 font-semibold transition-colors ${
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
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {table.getRowModel().rows.map((row) => {
            const isLoading = loadingRowIds.includes((row.original as User).id);
            return (
              <tr
                key={row.id}
                className={`transition-colors relative ${
                  isLoading
                    ? "bg-slate-50 dark:bg-slate-800/50"
                    : "hover:bg-slate-50/50 dark:hover:bg-white/5"
                }`}
              >
                {isLoading && (
                  <td className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-red-500"></div>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Eliminando...
                      </span>
                    </div>
                  </td>
                )}
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-6 py-4 ${isLoading ? "opacity-50 blur-[0.5px]" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {table.getRowModel().rows.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p>No se encontraron resultados para {globalFilter}</p>
        </div>
      )}
    </div>
  );
}

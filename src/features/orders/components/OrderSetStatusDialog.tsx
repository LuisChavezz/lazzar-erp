"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MainDialog } from "@/src/components/MainDialog";
import { CloseIcon, SearchIcon } from "@/src/components/Icons";
import { useOrderStore } from "../stores/order.store";
import { OrderStatus } from "../interfaces/order.interface";
import { getStatusStyles } from "../utils/getStatusStyle";
import { OrderSetStatusSelectableList } from "./OrderSetStatusSelectableList";

interface OrderSetStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions: OrderStatus[] = [
  "Pendiente",
  "Parcial",
  "Completo",
  "Cancelado",
];

export function OrderSetStatusDialog({
  open,
  onOpenChange,
}: OrderSetStatusDialogProps) {

  const orders = useOrderStore((state) => state.orders);
  const updateOrdersStatus = useOrderStore((state) => state.updateOrdersStatus);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus>("Pendiente");
  const [searchTerm, setSearchTerm] = useState("");

  const hasOrders = orders.length > 0;
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return orders;
    }
    return orders.filter((order) => {
      const folio = order.folio?.toLowerCase() ?? "";
      const cliente = order.clienteNombre?.toLowerCase() ?? "";
      const fecha = order.fecha?.toLowerCase() ?? "";
      const estatus = order.estatusPedido?.toLowerCase() ?? "";
      return (
        folio.includes(query) ||
        cliente.includes(query) ||
        fecha.includes(query) ||
        estatus.includes(query)
      );
    });
  }, [orders, searchTerm]);
  const filteredIds = filteredOrders.map((order) => order.id);
  const hasResults = filteredOrders.length > 0;
  const isAllSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  // Manejar el cambio de estado del diálogo
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedIds(new Set());
      setSelectedStatus("Pendiente");
      setSearchTerm("");
    }
    onOpenChange(nextOpen);
  };

  // Manejar la selección de un pedido individual
  const toggleOrder = (orderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Manejar la selección de todos los pedidos
  const toggleAll = () => {
    if (!hasOrders) return;
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // Manejar la actualización de los estados de los pedidos seleccionados
  const handleUpdate = () => {
    if (selectedCount === 0) {
      toast.error("Selecciona al menos un pedido");
      return;
    }
    try {
      updateOrdersStatus(selectedStatus, Array.from(selectedIds));
      toast.success("Estados actualizados correctamente");
      handleOpenChange(false);
    } catch {
      toast.error("No se pudo actualizar el estado de los pedidos");
    }
  };

  return (
    <MainDialog
      title="Actualizar estados"
      description="Selecciona los pedidos y el nuevo estado a aplicar."
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="760px"
    >
      <div className="space-y-6 mt-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusOptions.map((status) => {
              const isActive = status === selectedStatus;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-2 text-xs rounded-xl border cursor-pointer transition-colors ${
                    isActive
                      ? `${getStatusStyles(status)} border-transparent`
                      : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
                  }`}
                  aria-pressed={isActive}
                >
                  {status}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>{selectedCount} seleccionados</span>
            <button
              type="button"
              onClick={toggleAll}
              className="cursor-pointer text-sky-600 dark:text-sky-400 font-semibold hover:underline"
            >
              {isAllSelected ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>
          </div>
        </div>

        {/* <div className="relative">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="Buscar por folio, cliente o fecha"
          />
          {searchTerm.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Limpiar búsqueda"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div> */}

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <SearchIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-shadow"
            placeholder="Buscar por folio, cliente o fecha"
          />
          {searchTerm.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <OrderSetStatusSelectableList
          hasOrders={hasOrders}
          hasResults={hasResults}
          orders={filteredOrders}
          selectedIds={selectedIds}
          onToggle={toggleOrder}
        />

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={selectedCount === 0}
            className="px-4 py-2 rounded-xl cursor-pointer bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-default"
          >
            Actualizar estado
          </button>
        </div>
      </div>
    </MainDialog>
  );
}

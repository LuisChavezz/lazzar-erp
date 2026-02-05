import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Warehouse } from '../interfaces/warehouse.interface';

interface WarehouseState {
  warehouses: Warehouse[];
  selectedWarehouse: Warehouse | null;
  isLoading: boolean;
  
  // Actions
  setWarehouses: (warehouses: Warehouse[]) => void;
  setSelectedWarehouse: (warehouse: Warehouse | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addWarehouse: (warehouse: Warehouse) => void;
  updateWarehouse: (id: string, warehouse: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
}

export const useWarehouseStore = create<WarehouseState>()(
  devtools(
    persist(
      (set) => ({
        warehouses: [],
        selectedWarehouse: null,
        isLoading: false,

        setWarehouses: (warehouses) => set({ warehouses }),
        setSelectedWarehouse: (selectedWarehouse) => set({ selectedWarehouse }),
        setIsLoading: (isLoading) => set({ isLoading }),
        
        addWarehouse: (warehouse) => 
          set((state) => ({ warehouses: [...state.warehouses, warehouse] })),
          
        updateWarehouse: (id, updatedWarehouse) =>
          set((state) => ({
            warehouses: state.warehouses.map((w) =>
              w.id === id ? { ...w, ...updatedWarehouse } : w
            ),
          })),
          
        deleteWarehouse: (id) =>
          set((state) => ({
            warehouses: state.warehouses.filter((w) => w.id !== id),
          })),
      }),
      {
        name: 'warehouse-storage',
      }
    ),
    {
      name: 'warehouse-store',
    }
  )
);

import { create } from "zustand";
import { Order, OrderStatus } from "../interfaces/order.interface";
import { devtools, persist } from "zustand/middleware";


interface OrderState {
  orders: Order[];
  hasHydrated: boolean;

  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => void;
  updateOrdersStatus: (status: OrderStatus, orderIds: string[]) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useOrderStore = create<OrderState>()(
  devtools(
    persist(
      (set) => ({
        orders: [],
        hasHydrated: false,

        addOrder: (order) =>
          set((state) => ({
            orders: [order, ...state.orders],
          })),

        updateOrder: (order) =>
          set((state) => ({
            orders: state.orders.map((o) => (o.id === order.id ? order : o)),
          })),
          
        deleteOrder: (orderId) =>
          set((state) => ({
            orders: state.orders.filter((o) => o.id !== orderId),
          })),
        updateOrdersStatus: (status, orderIds) =>
          set((state) => {
            const ids = new Set(orderIds);
            if (ids.size === 0) {
              return state;
            }
            return {
              orders: state.orders.map((order) =>
                ids.has(order.id) ? { ...order, estatusPedido: status } : order
              ),
            };
          }),
        setHasHydrated: (value) => set({ hasHydrated: value }),
      }),
      {
        name: "order-storage",
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    )
  )
);

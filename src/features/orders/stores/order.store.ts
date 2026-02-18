import { create } from "zustand";
import { Order } from "../interfaces/order.interface";
import { devtools, persist } from "zustand/middleware";


interface OrderState {
  orders: Order[];

  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => void;
}

export const useOrderStore = create<OrderState>()(
  devtools(
    persist(
      (set) => ({
        orders: [],

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
      }),
      {
        name: "orderStore",
      }
    )
  )
);

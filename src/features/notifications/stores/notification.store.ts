import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Notification } from "../interfaces/notification.interface";

interface NotificationState {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  addGenericNotification: () => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  resetNotifications: () => void;
  clearNotifications: () => void;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "Error de Sincronización",
    message:
      "No se pudo conectar con el servidor de pagos. Reintenta en unos minutos.",
    type: "error",
    createdAtLabel: "Hace 5 min",
    createdAt: new Date(),
    isRead: false,
    route: null,
  },
  {
    id: "2",
    title: "Pedido Completado",
    message: "La orden #ORD-7829 ha sido entregada exitosamente.",
    type: "success",
    createdAtLabel: "Hace 2 horas",
    createdAt: new Date(),
    isRead: true,
    route: null,
  },
  {
    id: "3",
    title: "Actualización de Sistema",
    message: "Versión 2.1 disponible con nuevas funciones de reportes.",
    type: "info",
    createdAtLabel: "Ayer",
    createdAt: new Date(),
    isRead: true,
    route: null,
  },
];

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set) => ({
        notifications: initialNotifications,

        setNotifications: (notifications) => set({ notifications }),

        addNotification: (notification) =>
          set((state) => ({
            notifications: [notification, ...state.notifications],
          })),

        addGenericNotification: () =>
          set((state) => ({
            notifications: [
              {
                id: Date.now().toString(),
                title: "Notificación Genérica",
                message: "Este es un mensaje genérico de prueba.",
                type: "info",
                createdAtLabel: "Hace un momento",
                createdAt: new Date(),
                isRead: false,
                route: null,
              },
              ...state.notifications,
            ],
          })),

        markAllAsRead: () =>
          set((state) => ({
            notifications: state.notifications.map((notification) => ({
              ...notification,
              isRead: true,
            })),
          })),

        markAsRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map((notification) =>
              notification.id === id
                ? { ...notification, isRead: true }
                : notification
            ),
          })),

        resetNotifications: () => set({ notifications: initialNotifications }),

        clearNotifications: () => set({ notifications: [] }),
      }),
      {
        name: "notifications-storage",
      }
    ),
    {
      name: "notifications-store",
    }
  )
);

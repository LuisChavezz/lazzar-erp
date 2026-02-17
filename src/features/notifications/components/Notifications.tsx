"use client";

import { useState, useRef, useEffect } from "react";
import { BellIcon } from "../../../components/Icons";
import { useNotificationStore } from "../stores/notification.store";
import { NotificationItem } from "./NotificationItem";
import { NotificationsDialog } from "./NotificationsDialog";

export const Notifications = () => {

  const [isNotifOpen, setIsNotifOpen] = useState(false); // State to manage dropdown visibility
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State to manage notifications dialog
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to dropdown element
  const btnRef = useRef<HTMLButtonElement>(null); // Ref to button element

  // Get notifications and actions from notification store
  const { notifications, markAllAsRead, markAsRead } = useNotificationStore();

  // Check if there are any unread notifications
  const hasUnread = notifications.some((notification) => !notification.isRead);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle notification click to mark as read and close dropdown
  const handleNotificationClick = (id: string) => {
    markAsRead(id);
    setIsNotifOpen(false);
  };

  return (
    <div className="relative">
      <NotificationsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <button
        ref={btnRef}
        type="button"
        aria-label="Abrir panel de notificaciones"
        aria-haspopup="dialog"
        aria-expanded={isNotifOpen}
        aria-controls="notifications-dropdown"
        title="Notificaciones"
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        className="p-2 cursor-pointer text-slate-400 hover:text-sky-600 transition relative outline-none"
      >
        <BellIcon className="w-5 h-5" aria-hidden="true" />
        {hasUnread && (
          <span
            className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50 dark:border-black animate-pulse"
            aria-hidden="true"
            role="presentation"
          ></span>
        )}
      </button>

      {/* Dropdown menu */}
      {isNotifOpen && (
        <div
          ref={dropdownRef}
          id="notifications-dropdown"
          className="absolute right-0 mt-4 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right transition-all duration-200"
          role="dialog"
          aria-label="Notificaciones recientes"
        >
          {/* Header with title and "Mark all as read" button */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
            <h3 className="font-bold text-slate-800 dark:text-white">
              Notificaciones
            </h3>
            <button
              type="button"
              aria-label="Marcar todas las notificaciones como leídas"
              className="text-xs font-medium cursor-pointer! text-sky-500 hover:underline bg-transparent disabled:cursor-default disabled:text-slate-400"
              onClick={markAllAsRead}
              disabled={!hasUnread}
            >
              Marcar leídas
            </button>
          </div>

          {/* List of notifications */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar" role="list" aria-label="Lista de notificaciones recientes">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification.id)}
              />
            ))}
          </div>

          {/* Footer with "View all" link */}
          <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
            <button
              type="button"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 transition-colors cursor-pointer"
              onClick={() => {
                setIsDialogOpen(true);
                setIsNotifOpen(false);
              }}
            >
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

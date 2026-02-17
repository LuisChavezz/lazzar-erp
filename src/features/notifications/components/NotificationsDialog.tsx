"use client";

import { useMemo, useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "../../../components/FormInput";
import { useNotificationStore } from "../stores/notification.store";
import { NotificationIcon } from "./NotificationIcon";
import { ChevronUpIcon, ChevronDownIcon, CheckCircleIcon } from "../../../components/Icons";

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsDialog({ open, onOpenChange }: NotificationsDialogProps) {
  
  // Notification actions from the store
  const notifications = useNotificationStore((state) => state.notifications);
  const resetNotifications = useNotificationStore((state) => state.resetNotifications);
  const addGenericNotification = useNotificationStore((state) => state.addGenericNotification);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  // State for search and sort controls
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const hasUnread = notifications.some((notification) => !notification.isRead);

  // Filter and sort notifications
  const filteredAndSorted = useMemo(() => {
    const query = search.trim().toLowerCase();

    // Filter notifications by search query
    const filtered = query
      ? notifications.filter((notification) => {
          const title = notification.title.toLowerCase();
          const message = notification.message.toLowerCase();
          return (
            title.includes(query) ||
            message.includes(query)
          );
        })
      : notifications;

    // Sort notifications by createdAt
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });

    return sorted;
  }, [notifications, search, sortDirection]);

  // Handle toggle sort direction
  const handleToggleSort = () => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  return (
    <MainDialog
      maxWidth="720px"
      title="Todas las notificaciones"
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4 mt-2">
        {/* Search and sort controls */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1">
            <FormInput
              placeholder="Buscar por título o mensaje..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleToggleSort}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            Ordenar:{" "}
            {sortDirection === "desc" ? (
              <ChevronDownIcon className="w-4 h-4 inline-block ml-1" aria-hidden="true" />
            ) : (
              <ChevronUpIcon className="w-4 h-4 inline-block ml-1" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={!hasUnread}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default"
          >
            Marcar como leídas
          </button>
          <button
            type="button"
            onClick={() => addGenericNotification()}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            Generar
          </button>
          <button
            type="button"
            onClick={resetNotifications}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            Reiniciar
          </button>
        </div>

        {/* Notifications list */}
        <div
          className="max-h-100 overflow-y-auto custom-scrollbar space-y-2"
          role="list"
          aria-label="Todas las notificaciones"
        >
          {filteredAndSorted.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No se encontraron notificaciones.
            </p>
          ) : (
            filteredAndSorted.map((notification) => (
              <div
                key={notification.id}
                className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 flex gap-3 items-start"
                role="listitem"
              >
                <NotificationIcon type={notification.type} />
                <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex items-end flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {!notification.isRead ? (
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          Leída
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {notification.createdAtLabel}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <>
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-700 px-2 py-1 rounded-full cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
                        >
                          <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
                          Marcar leída
                        </button>
                        <button
                          type="button"
                          onClick={() => markAsRead(notification.id)}
                          className="inline-flex md:hidden items-center gap-1 text-[10px] font-medium text-sky-700 dark:text-sky-300 underline cursor-pointer"
                        >
                          <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
                          Marcar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MainDialog>
  );
}

import { Notification } from "../interfaces/notification.interface";
import { NotificationIcon } from "./NotificationIcon";

interface Props {
  notification: Notification;
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: Props) {

  return (
    <div
      className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3 relative group"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <NotificationIcon type={notification.type} />
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-snug">
          {notification.message}
        </p>
        <span className="text-[10px] text-slate-400 mt-2 block">
          {notification.createdAtLabel}
        </span>
      </div>
      {!notification.isRead && (
        <div
          className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full"
          aria-hidden="true"
          role="presentation"
        ></div>
      )}
    </div>
  );
}

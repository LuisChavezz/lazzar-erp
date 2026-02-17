import { ErrorIcon, CheckCircleIcon, InfoIcon } from "../../../components/Icons";
import { NotificationType } from "../interfaces/notification.interface";

interface Props {
  type: NotificationType;
}

export function NotificationIcon({ type }: Props) {
  if (type === "error") {
    return (
      <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-500 dark:bg-red-500/20 flex items-center justify-center">
        <ErrorIcon className="w-4 h-4" aria-hidden="true" />
      </div>
    );
  }

  if (type === "success") {
    return (
      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20 flex items-center justify-center">
        <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-500 dark:bg-sky-500/20 flex items-center justify-center">
      <InfoIcon className="w-4 h-4" aria-hidden="true" />
    </div>
  );
}


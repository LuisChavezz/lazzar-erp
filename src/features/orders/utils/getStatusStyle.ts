import { Order } from "../types/order.types";

export const getStatusStyles = (status: Order["status"]) => {
  switch (status) {
    case "Completado":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "En Proceso":
      return "bg-sky-100 text-sky-800 dark:bg-sky-500/10 dark:text-sky-400";
    case "Pendiente Pago":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400";
    case "Retrasado":
      return "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

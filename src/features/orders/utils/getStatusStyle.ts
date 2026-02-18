import { Order } from "../../dashboard/interfaces/order.interface";

export const getStatusStyles = (status: Order["estatusPedido"]) => {
  switch (status) {
    case "capturado":
      return "bg-sky-100 text-sky-800 dark:bg-sky-500/10 dark:text-sky-400";
    case "autorizado":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "surtido":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400";
    case "facturado":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400";
    case "cancelado":
      return "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

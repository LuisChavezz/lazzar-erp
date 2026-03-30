import { Order } from "../interfaces/order.interface";

type OrderStatusLike = Pick<Order, "estatus"> | Order["estatus"] | null | undefined;

const resolveStatus = (status: OrderStatusLike) => { // Resuelve el estado del pedido
  if (typeof status === "number") {
    return status;
  }
  if (!status || typeof status !== "object") {
    return null;
  }
  return typeof status.estatus === "number" ? status.estatus : null;
};

export const getStatusStyles = (status: OrderStatusLike) => {
  const normalizedStatus = resolveStatus(status); // Resuelve el estado del pedido

  if (!normalizedStatus) { // Si el estado es null o undefined
    return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  }

  if (normalizedStatus === 4) { // Rechazado
    return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300";
  }
  if (normalizedStatus === 3) { // Autorizado
    return "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
  }
  if (normalizedStatus === 2) { // Pendiente  
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  }
  return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300";
};

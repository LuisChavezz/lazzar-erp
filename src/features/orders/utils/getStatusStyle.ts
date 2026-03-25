import { Order } from "../interfaces/order.interface";

type OrderAuthorizationLike = Pick<Order, "autorizada_at"> | Order["autorizada_at"] | null | undefined;

const isAuthorized = (status: OrderAuthorizationLike) => {
  if (typeof status === "string") {
    return status.trim().length > 0;
  }
  if (!status || typeof status !== "object") {
    return false;
  }
  return typeof status.autorizada_at === "string" && status.autorizada_at.trim().length > 0;
};

export const getStatusStyles = (status: OrderAuthorizationLike) => {
  return isAuthorized(status)
    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
};

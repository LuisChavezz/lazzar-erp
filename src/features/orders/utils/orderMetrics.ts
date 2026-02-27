import { Order } from "../interfaces/order.interface";

const HIGH_AMOUNT_THRESHOLD = 100000;

const parseOrderDate = (value: string) => {
  if (!value) return null;
  if (value.includes("/")) {
    const [day, month, year] = value.split("/").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value.includes("-")) {
    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const isActiveOrder = (order: Order) =>
  order.estatusPedido === "Pendiente" || order.estatusPedido === "Parcial";

export const getOrdersDueSoonCount = (
  orders: Order[],
  days = 7,
  now = new Date()
) => {
  const start = startOfDay(now);
  const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days));
  return orders.filter((order) => {
    if (!isActiveOrder(order)) return false;
    const dueDate = parseOrderDate(order.fechaVence);
    if (!dueDate) return false;
    return dueDate >= start && dueDate <= end;
  }).length;
};

export const getTotalReceivableBalance = (orders: Order[]) =>
  orders.reduce((total, order) => {
    if (!isActiveOrder(order)) return total;
    const balance = order.totals?.saldoPendiente ?? 0;
    return total + balance;
  }, 0);

export const getReceivableOrdersCount = (orders: Order[]) =>
  orders.filter((order) => {
    if (!isActiveOrder(order)) return false;
    return (order.totals?.saldoPendiente ?? 0) > 0;
  }).length;

export const getCriticalOrdersCount = (orders: Order[], now = new Date()) => {
  const today = startOfDay(now);
  return orders.filter((order) => {
    if (!isActiveOrder(order)) return false;
    const dueDate = parseOrderDate(order.fechaVence);
    const total = order.totals?.granTotal ?? 0;
    const isOverdue = dueDate ? dueDate < today : false;
    const isHighAmount = total >= HIGH_AMOUNT_THRESHOLD;
    return isOverdue || isHighAmount;
  }).length;
};

import { Order } from "../interfaces/order.interface";

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

const getReferenceDate = (orders: Order[], fallback = new Date()) => {
  const latest = orders.reduce<Date | null>((maxDate, order) => {
    const parsedDate = parseOrderDate(order.fecha);
    if (!parsedDate) return maxDate;
    if (!maxDate || parsedDate > maxDate) return parsedDate;
    return maxDate;
  }, null);
  return latest ?? fallback;
};

const getMonthBounds = (referenceDate: Date, offset = 0) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = endOfDay(new Date(year, month + 1, 0));
  return { start, end };
};

const getOrderAmount = (order: Order) => order.totals?.granTotal ?? 0;

const getOrderPendingBalance = (order: Order) => order.totals?.saldoPendiente ?? 0;

const isNonCancelled = (order: Order) => order.estatusPedido !== "Cancelado";

const getSafeAverage = (total: number, count: number) => (count > 0 ? total / count : 0);

const getVariationPercent = (currentValue: number, previousValue: number) => {
  if (previousValue === 0) {
    if (currentValue === 0) return 0;
    return 100;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
};

export const getOrdersDashboardMetrics = (orders: Order[], now = new Date()) => {
  const referenceDate = getReferenceDate(orders, now);
  const currentMonthBounds = getMonthBounds(referenceDate, 0);
  const previousMonthBounds = getMonthBounds(referenceDate, -1);

  const ordersWithDate = orders
    .map((order) => ({ order, parsedDate: parseOrderDate(order.fecha) }))
    .filter((item): item is { order: Order; parsedDate: Date } => item.parsedDate !== null);

  const currentMonthOrders = ordersWithDate
    .filter(
      (item) =>
        item.parsedDate >= currentMonthBounds.start &&
        item.parsedDate <= currentMonthBounds.end
    )
    .map((item) => item.order)
    .filter(isNonCancelled);

  const previousMonthOrders = ordersWithDate
    .filter(
      (item) =>
        item.parsedDate >= previousMonthBounds.start &&
        item.parsedDate <= previousMonthBounds.end
    )
    .map((item) => item.order)
    .filter(isNonCancelled);

  const currentRevenue = currentMonthOrders.reduce(
    (total, order) => total + getOrderAmount(order),
    0
  );
  const previousRevenue = previousMonthOrders.reduce(
    (total, order) => total + getOrderAmount(order),
    0
  );

  const currentTicket = getSafeAverage(currentRevenue, currentMonthOrders.length);
  const previousTicket = getSafeAverage(previousRevenue, previousMonthOrders.length);

  const pendingOrders = orders.filter(
    (order) => isActiveOrder(order) && getOrderPendingBalance(order) > 0
  );
  const pendingAmount = pendingOrders.reduce(
    (total, order) => total + getOrderPendingBalance(order),
    0
  );

  return {
    monthRevenue: currentRevenue,
    monthRevenueVariation: getVariationPercent(currentRevenue, previousRevenue),
    pendingAmount,
    pendingOrdersCount: pendingOrders.length,
    averageTicket: currentTicket,
    averageTicketVariation: getVariationPercent(currentTicket, previousTicket),
    monthOrdersCount: currentMonthOrders.length,
  };
};

export const getOrdersDueSoonCount = (
  orders: Order[],
  days = 7,
  now = new Date()
) => {
  const start = startOfDay(now);
  const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days));
  return orders.filter((order) => {
    if (!isActiveOrder(order)) return false;
    const dueDate = parseOrderDate(order.fecha);
    if (!dueDate) return false;
    return dueDate >= start && dueDate <= end;
  }).length;
};

export const getTotalReceivableBalance = (orders: Order[]) =>
  orders.reduce((total, order) => {
    if (!isActiveOrder(order)) return total;
    return total + getOrderPendingBalance(order);
  }, 0);

export const getReceivableOrdersCount = (orders: Order[]) =>
  orders.filter((order) => isActiveOrder(order) && getOrderPendingBalance(order) > 0).length;

export const getCriticalOrdersCount = (orders: Order[], now = new Date()) => {
  const today = startOfDay(now);
  return orders.filter((order) => {
    if (!isActiveOrder(order)) return false;
    const dueDate = parseOrderDate(order.fecha);
    const isOverdue = dueDate ? dueDate < today : false;
    const isHighAmount = getOrderAmount(order) >= 100000;
    return isOverdue || isHighAmount;
  }).length;
};

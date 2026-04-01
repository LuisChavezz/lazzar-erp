import { Quote } from "../interfaces/quote.interface";

const parseQuoteDate = (value: string) => {
  if (!value) return null;
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (normalizedValue.includes("/")) {
    const [day, month, year] = normalizedValue.split("/").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(normalizedValue);
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

const isActiveQuote = (quote: Quote) => quote.estatus === 1 || quote.estatus === 2;

const getReferenceDate = (quotes: Quote[], fallback = new Date()) => {
  const latest = quotes.reduce<Date | null>((maxDate, quote) => {
    const parsedDate = parseQuoteDate(quote.created_at ?? "");
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

const getQuoteAmount = (quote: Quote) => Number(quote.gran_total) || 0;

const getQuotePendingBalance = (quote: Quote) => Number(quote.gran_total) || 0;

const isNonCancelled = (quote: Quote) => quote.estatus !== 4;

const getSafeAverage = (total: number, count: number) => (count > 0 ? total / count : 0);

const getVariationPercent = (currentValue: number, previousValue: number) => {
  if (previousValue === 0) {
    if (currentValue === 0) return 0;
    return 100;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
};

export const getQuotesDashboardMetrics = (quotes: Quote[], now = new Date()) => {
  const referenceDate = getReferenceDate(quotes, now);
  const currentMonthBounds = getMonthBounds(referenceDate, 0);
  const previousMonthBounds = getMonthBounds(referenceDate, -1);

  const quotesWithDate = quotes
    .map((quote) => ({ quote, parsedDate: parseQuoteDate(quote.created_at ?? "") }))
    .filter((item): item is { quote: Quote; parsedDate: Date } => item.parsedDate !== null);

  const currentMonthQuotes = quotesWithDate
    .filter(
      (item) =>
        item.parsedDate >= currentMonthBounds.start &&
        item.parsedDate <= currentMonthBounds.end
    )
    .map((item) => item.quote)
    .filter(isNonCancelled);

  const previousMonthQuotes = quotesWithDate
    .filter(
      (item) =>
        item.parsedDate >= previousMonthBounds.start &&
        item.parsedDate <= previousMonthBounds.end
    )
    .map((item) => item.quote)
    .filter(isNonCancelled);

  const currentRevenue = currentMonthQuotes.reduce(
    (total, quote) => total + getQuoteAmount(quote),
    0
  );
  const previousRevenue = previousMonthQuotes.reduce(
    (total, quote) => total + getQuoteAmount(quote),
    0
  );

  const currentTicket = getSafeAverage(currentRevenue, currentMonthQuotes.length);
  const previousTicket = getSafeAverage(previousRevenue, previousMonthQuotes.length);

  const pendingQuotes = quotes.filter(
    (quote) => isActiveQuote(quote) && getQuotePendingBalance(quote) > 0
  );
  const pendingAmount = pendingQuotes.reduce(
    (total, quote) => total + getQuotePendingBalance(quote),
    0
  );

  return {
    monthRevenue: currentRevenue,
    monthRevenueVariation: getVariationPercent(currentRevenue, previousRevenue),
    pendingAmount,
    pendingQuotesCount: pendingQuotes.length,
    averageTicket: currentTicket,
    averageTicketVariation: getVariationPercent(currentTicket, previousTicket),
    monthOrdersCount: currentMonthQuotes.length,
  };
};

export const getQuotesDueSoonCount = (
  quotes: Quote[],
  days = 7,
  now = new Date()
) => {
  const start = startOfDay(now);
  const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + days));
  return quotes.filter((quote) => {
    if (!isActiveQuote(quote)) return false;
    const dueDate = parseQuoteDate(quote.created_at ?? "");
    if (!dueDate) return false;
    return dueDate >= start && dueDate <= end;
  }).length;
};

export const getTotalReceivableBalance = (quotes: Quote[]) =>
  quotes.reduce((total, quote) => {
    if (!isActiveQuote(quote)) return total;
    return total + getQuotePendingBalance(quote);
  }, 0);

export const getReceivableQuotesCount = (quotes: Quote[]) =>
  quotes.filter((quote) => isActiveQuote(quote) && getQuotePendingBalance(quote) > 0).length;

export const getCriticalQuotesCount = (quotes: Quote[], now = new Date()) => {
  const today = startOfDay(now);
  return quotes.filter((quote) => {
    if (!isActiveQuote(quote)) return false;
    const dueDate = parseQuoteDate(quote.created_at ?? "");
    const isOverdue = dueDate ? dueDate < today : false;
    const isHighAmount = getQuoteAmount(quote) >= 100000;
    return isOverdue || isHighAmount;
  }).length;
};

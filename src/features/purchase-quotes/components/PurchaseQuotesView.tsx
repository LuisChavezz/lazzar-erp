import { QuoteMetrics } from "@/src/features/quotes-menu/components/QuoteMetrics";
import { buildQuoteMetrics } from "@/src/features/quotes-menu/utils/quote-metrics.util";
import { PURCHASE_ORDERS_DATA } from "@/src/features/quotes-menu/constants/quoteSampleData";
import PurchaseQuoteList from "./PurchaseQuoteList";

export default function PurchaseQuotesView() {
  const metrics = buildQuoteMetrics(PURCHASE_ORDERS_DATA);

  return (
    <div className="flex flex-col gap-6">
      <QuoteMetrics metrics={metrics} />
      <PurchaseQuoteList />
    </div>
  );
}

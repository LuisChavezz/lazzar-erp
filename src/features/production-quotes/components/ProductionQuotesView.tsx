import { QuoteMetrics } from "@/src/features/quotes-menu/components/QuoteMetrics";
import { buildQuoteMetrics } from "@/src/features/quotes-menu/utils/quote-metrics.util";
import { PRODUCTION_ORDERS_DATA } from "@/src/features/quotes-menu/constants/quoteSampleData";
import ProductionQuoteList from "./ProductionQuoteList";

export default function ProductionQuotesView() {
  const metrics = buildQuoteMetrics(PRODUCTION_ORDERS_DATA);

  return (
    <div className="flex flex-col gap-6">
      <QuoteMetrics metrics={metrics} />
      <ProductionQuoteList />
    </div>
  );
}

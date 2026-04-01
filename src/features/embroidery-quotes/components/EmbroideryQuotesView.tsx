import { QuoteMetrics } from "@/src/features/quotes-menu/components/QuoteMetrics";
import { buildQuoteMetrics } from "@/src/features/quotes-menu/utils/quote-metrics.util";
import { EMBROIDERY_ORDERS_DATA } from "@/src/features/quotes-menu/constants/quoteSampleData";
import EmbroideryQuoteList from "./EmbroideryQuoteList";

export default function EmbroideryQuotesView() {
  const metrics = buildQuoteMetrics(EMBROIDERY_ORDERS_DATA);

  return (
    <div className="flex flex-col gap-6">
      <QuoteMetrics metrics={metrics} />
      <EmbroideryQuoteList />
    </div>
  );
}

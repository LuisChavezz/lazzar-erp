import { OpportunityFunnel } from "@/src/features/opportunities/components/OpportunityFunnel";
import { RecentOpportunities } from "@/src/features/opportunities/components/RecentOpportunities";
import { MonthlyGoal } from "@/src/features/sales/components/MonthlyGoal";
import { QuickActions } from "@/src/features/sales/components/QuickActions";
import { RecentQuotes } from "@/src/features/sales/components/RecentQuotes";
import { SalesKpiGrid } from "@/src/features/sales/components/SalesKpiGrid";
import { GoogleUpcomingEvents } from "@/src/features/google/components/GoogleUpcomingEvents";

export default function SalesPage() {
  return (
    <div className="w-full space-y-8">
      <SalesKpiGrid />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RecentOpportunities />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OpportunityFunnel compact />
            <RecentQuotes />
          </div>
        </div>
        <div className="space-y-6">
          <QuickActions />
          <GoogleUpcomingEvents />
          <MonthlyGoal />
        </div>
      </div>
    </div>
  );
}

import { MonthlyGoal } from "@/src/features/sales/components/MonthlyGoal";
import { QuickActions } from "@/src/features/sales/components/QuickActions";
import { RecentOpportunities } from "@/src/features/sales/components/RecentOpportunities";
import { RecentOrders } from "@/src/features/sales/components/RecentOrders";
import { SalesKpiGrid } from "@/src/features/sales/components/SalesKpiGrid";
import { SalesPipeline } from "@/src/features/sales/components/SalesPipeline";
import { UpcomingTasks } from "@/src/features/tasks/components/UpcomingTasks";

export default function SalesPage() {
  return (
    <div className="w-full space-y-8">
      <SalesKpiGrid />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <RecentOpportunities />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SalesPipeline />
            <RecentOrders />
          </div>
        </div>
        <div className="space-y-6">
          <QuickActions />
          <UpcomingTasks />
          <MonthlyGoal />
        </div>
      </div>
    </div>
  );
}

import ModuleNav from "@/src/components/ModuleNav";
import { HrCalendarOccupancyProvider } from "@/src/features/hr/components/HrCalendarOccupancyProvider";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <ModuleNav moduleKey="hr" />
      <HrCalendarOccupancyProvider>{children}</HrCalendarOccupancyProvider>
    </div>
  );
}

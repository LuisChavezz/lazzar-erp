import { ReportStats } from "@/src/features/reports/components/ReportStats";
import { ReportList } from "@/src/features/reports/components/ReportList";

export default function ReportsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Tablero de reportes operativos, financieros y comerciales.
        </p>
      </div>

      <ReportStats />

      <div className="space-y-6">
        <ReportList />
      </div>
    </div>
  );
}

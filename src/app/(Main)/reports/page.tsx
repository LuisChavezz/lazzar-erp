import { ReportsStats } from "@/src/features/reports/components/ReportsStats";
import { ReportsList } from "@/src/features/reports/components/ReportsList";

export default function ReportsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Tablero de reportes operativos, financieros y comerciales.
        </p>
      </div>

      <ReportsStats />

      <div className="space-y-6">
        <ReportsList />
      </div>
    </div>
  );
}

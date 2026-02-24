import { DataTable } from "@/src/components/DataTable";
import { reportsColumns } from "./ReportsColumns";
import { ReportItem } from "../interfaces/reports.interface";

const REPORTS_DATA: ReportItem[] = [
  {
    id: "REP-001",
    name: "Ventas por Región",
    category: "Comercial",
    owner: "Equipo Ventas",
    schedule: "Semanal",
    lastRun: "24 Feb 2026",
    status: "Generado",
  },
  {
    id: "REP-002",
    name: "Eficiencia de Rutas",
    category: "Logística",
    owner: "Operaciones",
    schedule: "Diario",
    lastRun: "24 Feb 2026",
    status: "En proceso",
  },
  {
    id: "REP-003",
    name: "Inventario Crítico",
    category: "Almacén",
    owner: "Planeación",
    schedule: "Diario",
    lastRun: "24 Feb 2026",
    status: "Programado",
  },
  {
    id: "REP-004",
    name: "Cartera Vencida",
    category: "Finanzas",
    owner: "Tesorería",
    schedule: "Mensual",
    lastRun: "20 Feb 2026",
    status: "Fallido",
  },
  {
    id: "REP-005",
    name: "Satisfacción de Clientes",
    category: "CRM",
    owner: "Experiencia",
    schedule: "Mensual",
    lastRun: "19 Feb 2026",
    status: "Generado",
  },
];

export const ReportsList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={reportsColumns}
        data={REPORTS_DATA}
        title="Reportes"
        searchPlaceholder="Buscar por reporte, categoría o responsable..."
      />
    </div>
  );
};

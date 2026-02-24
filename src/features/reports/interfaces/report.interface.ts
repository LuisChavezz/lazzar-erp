export interface ReportItem {
  id: string;
  name: string;
  category: string;
  owner: string;
  schedule: string;
  lastRun: string;
  status: "Programado" | "En proceso" | "Generado" | "Fallido";
}

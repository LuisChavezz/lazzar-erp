"use client";

import { DataTable } from "@/src/components/DataTable";
import { invoiceColumns } from "./InvoiceColumns";
import { Invoice } from "../interfaces/invoice.interface";

const MOCK_INVOICES: Invoice[] = [
  {
    folio: "F-2024-1001",
    client: "Tecnología Avanzada S.A. de C.V.",
    rfc: "TAV101010ABC",
    date: "13/02/2026",
    dueDate: "28/02/2026",
    amount: 25400.0,
    status: "Pagada",
  },
  {
    folio: "F-2024-1002",
    client: "Consultoría Integral MX",
    rfc: "CIM202020XYZ",
    date: "12/02/2026",
    dueDate: "27/02/2026",
    amount: 12850.5,
    status: "Pendiente",
  },
  {
    folio: "F-2024-1003",
    client: "Distribuidora del Norte",
    rfc: "DNO909090123",
    date: "10/02/2026",
    dueDate: "25/02/2026",
    amount: 8900.0,
    status: "Pagada",
  },
  {
    folio: "F-2024-0998",
    client: "Servicios Profesionales Globales",
    rfc: "SPG151515789",
    date: "01/02/2026",
    dueDate: "16/02/2026",
    amount: 4500.0,
    status: "Vencida",
  },
  {
    folio: "F-2024-1004",
    client: "Grupo Constructor Elite",
    rfc: "GCE181818456",
    date: "13/02/2026",
    dueDate: "28/02/2026",
    amount: 156000.0,
    status: "Pendiente",
  },
];

export const InvoiceList = () => {
  return (
    <DataTable
      columns={invoiceColumns}
      data={MOCK_INVOICES}
      title="Facturación"
      searchPlaceholder="Buscar por folio, cliente..."
    />
  );
};

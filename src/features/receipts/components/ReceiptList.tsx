"use client";

import { DataTable } from "@/src/components/DataTable";
import { receptionsColumns } from "./ReceiptColumns";
import { Receipt } from "../interfaces/receipt.interface";

const MOCK_RECEPTIONS: Receipt[] = [
  {
    id: "REC-2024-001",
    provider: "AceroMex S.A. de C.V.",
    reference: "PO-8832",
    date: "13/02/2026",
    items: 12,
    status: "Recibiendo",
    warehouse: "Almacén Principal",
  },
  {
    id: "REC-2024-002",
    provider: "Textiles del Norte",
    reference: "PO-8829",
    date: "13/02/2026",
    items: 45,
    status: "Pendiente",
    warehouse: "Almacén MP",
  },
  {
    id: "REC-2024-003",
    provider: "Logística Global",
    reference: "TR-1029",
    date: "12/02/2026",
    items: 150,
    status: "Completado",
    warehouse: "Cedis Norte",
  },
  {
    id: "REC-2024-004",
    provider: "Pinturas Industriales",
    reference: "PO-8815",
    date: "12/02/2026",
    items: 8,
    status: "Incidencia",
    warehouse: "Almacén Químicos",
  },
  {
    id: "REC-2024-005",
    provider: "Empaques Monterrey",
    reference: "PO-8840",
    date: "11/02/2026",
    items: 200,
    status: "Completado",
    warehouse: "Almacén PT",
  },
];

export const ReceiptsList = () => {
  return (
    <DataTable
      columns={receptionsColumns}
      data={MOCK_RECEPTIONS}
      title="Recepciones"
      searchPlaceholder="Buscar por folio, proveedor..."
    />
  );
};

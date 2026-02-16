import { Order } from "../../dashboard/interfaces/order.interface";
import { DataTable } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";

const orders: Order[] = [
  {
    id: "1",
    status: "Completado",
    folio: "#ORD-7829",
    client: {
      name: "Acme Corp",
      initials: "AC",
      colorClass: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    },
    pieces: 500,
    seller: "Juan Pérez",
    date: "12 Ene 2026",
    classification: "A",
    amount: "$10,732.76",
    partiality: "1/1",
    deliveryDate: "25 Ene 2026",
    newDate: "-",
    zip: "12345",
  },
  {
    id: "2",
    status: "En Proceso",
    folio: "#ORD-7830",
    client: {
      name: "Global Logistics",
      initials: "GL",
      colorClass: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400",
    },
    pieces: 1200,
    seller: "Ana García",
    date: "14 Ene 2026",
    classification: "B",
    amount: "$38,965.52",
    partiality: "1/2",
    deliveryDate: "01 Feb 2026",
    newDate: "-",
    zip: "54321",
  },
  {
    id: "3",
    status: "Pendiente Pago",
    folio: "#ORD-7831",
    client: {
      name: "Tech Industries",
      initials: "TI",
      colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    },
    pieces: 150,
    seller: "Carlos López",
    date: "15 Ene 2026",
    classification: "C",
    amount: "$7,672.41",
    partiality: "1/1",
    deliveryDate: "15 Ene 2026",
    newDate: "-",
    zip: "67890",
  },
  {
    id: "4",
    status: "Retrasado",
    folio: "#ORD-7832",
    client: {
      name: "Star Traders",
      initials: "ST",
      colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
    pieces: 300,
    seller: "Sofía Ruiz",
    date: "16 Ene 2026",
    classification: "A",
    amount: "$27,715.52",
    partiality: "2/3",
    deliveryDate: "28 Ene 2026",
    newDate: "30 Ene 2026",
    zip: "98765",
  },
];

export const OrderList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={orderColumns}
        data={orders}
        title="Últimos Pedidos"
        searchPlaceholder="Buscar pedido..."
      />
    </div>
  );
};

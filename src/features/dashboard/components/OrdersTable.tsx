import { EditIcon, DeleteIcon, ViewIcon } from "../../../components/Icons";
import { Order } from "../interfaces/order.interface";
import { getStatusStyles } from "../utils/getStatusStyle";

// ! Remove this comment when the data is fetched from the server
const orders: Order[] = [
  {
    id: "1",
    status: "Completado",
    folio: "#ORD-7829",
    client: {
      name: "Acme Corp",
      initials: "AC",
      colorClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
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


export const OrdersTable = () => {
  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
          Últimos Pedidos
        </h3>
        <button className="text-sm font-medium cursor-pointer text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
          Ver todo
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-4xl border border-slate-200 dark:border-white/20 shadow-sm">
        <table className="w-full text-left border-collapse bg-white dark:bg-black">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">Folio</th>
              <th className="px-6 py-4 font-semibold">Razón Social</th>
              <th className="px-6 py-4 font-semibold text-center">Piezas</th>
              <th className="px-6 py-4 font-semibold">Vendedor</th>
              <th className="px-6 py-4 font-semibold">Fecha</th>
              <th className="px-6 py-4 font-semibold">Clasificacion</th>
              <th className="px-6 py-4 font-semibold text-right">Importe sin IVA</th>
              <th className="px-6 py-4 font-semibold text-center">Parcialidad</th>
              <th className="px-6 py-4 font-semibold">F. entrega</th>
              <th className="px-6 py-4 font-semibold">Nueva fecha</th>
              <th className="px-6 py-4 font-semibold">C.P.</th>
              <th className="px-6 py-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                  {order.folio}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${order.client.colorClass}`}
                    >
                      {order.client.initials}
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">
                      {order.client.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  {order.pieces.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {order.seller}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {order.date}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {order.classification}
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-200">
                  {order.amount}
                </td>
                <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                  {order.partiality}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {order.deliveryDate}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {order.newDate}
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                  {order.zip}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <DeleteIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="p-1 cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Ver más"
                    >
                      <ViewIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

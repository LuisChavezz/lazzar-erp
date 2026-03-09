import Link from "next/link";

type Order = {
  folio: string;
  customer: string;
  amount: string;
  status: string;
  statusClassName: string;
  iconClassName: string;
  iconPath: string;
};

const ORDERS: Order[] = [
  {
    folio: "ORD-001",
    customer: "Tech Solutions",
    amount: "$4,200",
    status: "Completado",
    statusClassName: "text-emerald-600 dark:text-emerald-400",
    iconClassName: "text-emerald-500",
    iconPath: "M5 13l4 4L19 7",
  },
  {
    folio: "ORD-002",
    customer: "Grupo Logístico",
    amount: "$1,850",
    status: "Procesando",
    statusClassName: "text-amber-600 dark:text-amber-400",
    iconClassName: "text-amber-500",
    iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

export const RecentOrders = () => {
  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Pedidos Recientes</h3>
        <Link
          href="/sales/orders"
          aria-label="Ver todos los pedidos"
          className="text-xs text-sky-600 hover:text-sky-500 font-bold uppercase tracking-wider transition-colors"
        >
          Ver todos
        </Link>
      </div>
      <div className="flex-1 space-y-4">
        {ORDERS.map((order) => (
          <div
            key={order.folio}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-white/5">
                <svg className={`w-4 h-4 ${order.iconClassName}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={order.iconPath} />
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">{order.folio}</div>
                <div className="text-[10px] text-slate-500">{order.customer}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{order.amount}</div>
              <div className={`text-[10px] font-medium ${order.statusClassName}`}>{order.status}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

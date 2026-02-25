import { Invoice } from "../interfaces/invoice.interface";


export const InvoiceDetails = ({ invoice }: { invoice: Invoice }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Pedido</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.pedido}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Factura</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.factura}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Cliente</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.cliente}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Vendedor</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.vendedor}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Paquetería</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.paqueteria}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Guías</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.guias}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Fecha</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.date}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-xs uppercase text-slate-400 font-semibold">Total</p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {invoice.total.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
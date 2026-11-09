"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ClientesIcon, PedidosIcon, PlusIcon } from "@/src/components/Icons";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { hasPermission } from "@/src/utils/permissions";

// Carga dinámica del formulario de cliente para optimizar la carga inicial y evitar cargarlo si el usuario no interactúa con esa acción
const LazyCustomerForm = dynamic(
  () => import("@/src/features/customers/components/CustomerForm"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-96 animate-pulse rounded-3xl bg-slate-100 dark:bg-white/5" />
    ),
  }
);

export const QuickActions = () => {
  const router = useRouter();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  // Un acceso solo se ofrece si la regla del proxy deja abrir su destino
  // (EC-813): el alta exige `C-CRM-COTIZACIONES` y el listado,
  // `R-CRM-COTIZACIONES`, que un usuario con `R-CRM` puede no tener.
  const { data: session } = useSession();
  const canOpenNewQuote = canAccessRoute("/sales/quotes/new", session?.user);
  const canOpenQuotes = canAccessRoute("/sales/quotes", session?.user);
  // Alta de cliente: el mismo código que el botón de alta de `CustomerList`.
  // Tras crearlo solo se lleva al listado si el proxy deja abrirlo
  // (`R-CRM-CLIENTES`); si no, se queda aquí con el aviso de guardado del
  // propio formulario.
  const canCreateCustomer = hasPermission("C-CRM-CLIENTES", session?.user);
  const canOpenCustomers = canAccessRoute("/sales/customers", session?.user);

  const handleCustomerCreated = () => {
    setIsCustomerDialogOpen(false);
    if (canOpenCustomers) router.push("/sales/customers");
  };

  return (
    <section
      aria-label="Acciones rápidas"
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm p-5"
    >
      <h2 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-4">
        Accesos Rápidos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {canOpenNewQuote && (
          <Link
            href="/sales/quotes/new"
            aria-label="Crear nueva cotización"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-500/20 transition-all group"
          >
            <PlusIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-sky-500 transition-colors" aria-hidden="true" />
            <span className="text-[10px] font-medium">Nueva Cotización</span>
          </Link>
        )}
        {canCreateCustomer && (
          <>
            <button
              type="button"
              aria-label="Agregar cliente"
              onClick={() => setIsCustomerDialogOpen(true)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/20 transition-all group cursor-pointer"
            >
              <ClientesIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
              <span className="text-[10px] font-medium">Agregar cliente</span>
            </button>
            <MainDialog
              title={
                <DialogHeader
                  title="Alta de Cliente"
                  subtitle="Registra un nuevo cliente"
                  statusColor="emerald"
                />
              }
              open={isCustomerDialogOpen}
              onOpenChange={setIsCustomerDialogOpen}
              maxWidth="900px"
            >
              {isCustomerDialogOpen ? <LazyCustomerForm onCreated={handleCustomerCreated} /> : null}
            </MainDialog>
          </>
        )}
        {canOpenQuotes && (
          <Link
            href="/sales/quotes"
            aria-label="Ver cotizaciones"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-100 dark:border-white/5 hover:border-amber-200 dark:hover:border-amber-500/20 transition-all group"
          >
            <PedidosIcon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-amber-500 transition-colors" aria-hidden="true" />
            {/* Lleva al listado de cotizaciones (de ahí salen los pedidos): el
                nombre visible y el accesible dicen lo mismo que el destino. */}
            <span className="text-[10px] font-medium">Cotizaciones</span>
          </Link>
        )}
      </div>
    </section>
  );
};

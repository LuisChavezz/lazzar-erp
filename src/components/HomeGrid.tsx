import TiltCard from "./TiltCard";
import {
  DashboardIcon,
  ClientesIcon,
  InventariosIcon,
  ComprasIcon,
  SettingsIcon,
  ListaPreciosIcon,
  CapitalHumanoIcon,
  ChevronRightIcon,
} from "./Icons";

export const HomedGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto py-12">
      {/* Panel de Control (Core) */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:hover:shadow-sky-500/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <DashboardIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Panel de Control (Core)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Empresas, usuarios, seguridad y catálogos base del sistema.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-sky-600 dark:text-sky-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Configurar estructura</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* CRM y Ventas */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:hover:shadow-rose-500/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ClientesIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              CRM y Ventas
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Prospectos, oportunidades, actividades, cotizaciones y pedidos
              centralizados.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-rose-600 dark:text-rose-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Ver flujo comercial</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* Operaciones de Almacén (WMS) */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-emerald-500/25 transition-all duration-300 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <InventariosIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Operaciones de Almacén (WMS)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Inventario, ubicaciones, movimientos, picking, packing y
              transferencias.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Gestionar almacenes</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* Compras y SCM */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-amber-500/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ComprasIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Compras y SCM
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Requisiciones, cotizaciones proveedor, órdenes de compra y
              recepciones.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-amber-600 dark:text-amber-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Control de abastecimiento</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* Manufactura */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-sky-500/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <SettingsIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Manufactura (Producción)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              BOM, rutas, órdenes de producción, avances y consumos de material.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-sky-600 dark:text-sky-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Ver planta productiva</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* Finanzas y Contabilidad */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-emerald-400/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ListaPreciosIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Finanzas y Contabilidad
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Facturación, CxC, CxP, tesorería, bancos y contabilidad general.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Revisar finanzas</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* Capital Humano (HR) */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-cyan-400/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <CapitalHumanoIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Capital Humano (HR)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Plantilla, asistencia, nómina y desempeño del talento de la
              organización.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-cyan-600 dark:text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Ver equipo</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>

      {/* Otros Módulos */}
      <TiltCard className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-fuchsia-400/25 p-8 h-full group">
        <div className="flex flex-col h-full">
          <div className="mb-6 w-14 h-14 rounded-full bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
            <DashboardIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
              Otros Módulos
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Proyectos, e-commerce, canales digitales, marketing y campañas
              segmentadas.
            </p>
          </div>
          <div className="mt-auto pt-8 flex items-center text-fuchsia-600 dark:text-fuchsia-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <span>Explorar módulos</span>
            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </TiltCard>
    </div>
  );
};

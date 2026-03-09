"use client"

import TiltCard from "./TiltCard";
import {
  DashboardIcon,
  ClientesIcon,
  InventariosIcon,
  ComprasIcon,
  SettingsIcon,
  ListaPreciosIcon,
  CapitalHumanoIcon,
} from "./Icons";

export const HomedGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto py-12">
      {/* Panel de Control (Core) */}
      <TiltCard
        icon={DashboardIcon}
        title="Panel de Control (Core)"
        description="Empresas, usuarios, seguridad y catálogos base del sistema."
        footerText="Configurar estructura"
        href="/system"
        accentClass="text-sky-600 dark:text-sky-400"
        accentBgClass="bg-sky-50 dark:bg-sky-500/10"
        shadowColorClassName="dark:hover:shadow-sky-500/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />

      {/* CRM y Ventas */}
      <TiltCard
        icon={ClientesIcon}
        title="CRM y Ventas"
        description="Prospectos, oportunidades, actividades, cotizaciones y pedidos centralizados."
        footerText="Ver flujo comercial"
        href="/sales"
        accentClass="text-rose-600 dark:text-rose-400"
        accentBgClass="bg-rose-50 dark:bg-rose-500/10"
        shadowColorClassName="dark:hover:shadow-rose-500/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />

      {/* Operaciones de Almacén (WMS) */}
      <TiltCard
        icon={InventariosIcon}
        title="Operaciones de Almacén (WMS)"
        description="Inventario, ubicaciones, movimientos, picking, packing y transferencias."
        footerText="Gestionar almacenes"
        href="/wms"
        accentClass="text-emerald-600 dark:text-emerald-400"
        accentBgClass="bg-emerald-50 dark:bg-emerald-500/10"
        shadowColorClassName="dark:hover:shadow-emerald-500/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 transition-all duration-300 p-8 h-full"
      />

      {/* Compras y SCM */}
      <TiltCard
        icon={ComprasIcon}
        title="Compras y SCM"
        description="Requisiciones, cotizaciones proveedor, órdenes de compra y recepciones."
        footerText="Control de abastecimiento"
        href="/procurement"
        accentClass="text-amber-600 dark:text-amber-400"
        accentBgClass="bg-amber-50 dark:bg-amber-500/10"
        shadowColorClassName="dark:hover:shadow-amber-500/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />

      {/* Manufactura */}
      <TiltCard
        icon={SettingsIcon}
        title="Manufactura (Producción)"
        description="BOM, rutas, órdenes de producción, avances y consumos de material."
        footerText="Ver planta productiva"
        href="/manufacturing"
        accentClass="text-indigo-600 dark:text-indigo-400"
        accentBgClass="bg-indigo-50 dark:bg-indigo-500/10"
        shadowColorClassName="dark:hover:shadow-indigo-500/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />

      {/* Finanzas y Contabilidad */}
      <TiltCard
        icon={ListaPreciosIcon}
        title="Finanzas y Contabilidad"
        description="Facturación, CxC, CxP, tesorería, bancos y contabilidad general."
        footerText="Revisar finanzas"
        href="/finance"
        accentClass="text-emerald-600 dark:text-emerald-400"
        accentBgClass="bg-emerald-50 dark:bg-emerald-500/10"
        shadowColorClassName="dark:hover:shadow-emerald-400/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />

      {/* Capital Humano (HR) */}
      <TiltCard
        icon={CapitalHumanoIcon}
        title="Capital Humano (HR)"
        description="Plantilla, asistencia, nómina y desempeño del talento de la organización."
        footerText="Ver equipo"
        href="/hr"
        accentClass="text-teal-600 dark:text-teal-400"
        accentBgClass="bg-teal-50 dark:bg-teal-500/10"
        shadowColorClassName="dark:hover:shadow-teal-400/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />

      {/* Otros Módulos */}
      <TiltCard
        icon={DashboardIcon}
        title="Otros Módulos"
        description="Proyectos, e-commerce, canales digitales, marketing y campañas segmentadas."
        footerText="Explorar módulos"
        href="/other"
        accentClass="text-fuchsia-600 dark:text-fuchsia-400"
        accentBgClass="bg-fuchsia-50 dark:bg-fuchsia-500/10"
        shadowColorClassName="dark:hover:shadow-fuchsia-400/25"
        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-8 h-full"
      />
    </div>
  );
};

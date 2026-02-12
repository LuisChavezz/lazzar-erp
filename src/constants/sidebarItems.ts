import React from "react";
import {
  BancosIcon,
  ClientesIcon,
  ContabilidadIcon,
  CxcIcon,
  CxpIcon,
  DashboardIcon,
  EmbarquesIcon,
  ExistenciasIcon,
  FacturacionIcon,
  InventariosIcon,
  ListaPreciosIcon,
  OrdenesIcon,
  PedidosIcon,
  ProduccionIcon,
  RastrearGuiasIcon,
  RecepcionesIcon,
  ReportesIcon,
} from "../components/Icons";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export const sidebarItems: SidebarSection[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: DashboardIcon,
      },
    ],
  },
  {
    title: "Operación",
    items: [
      {
        label: "Pedidos",
        href: "#",
        icon: PedidosIcon,
      },
      {
        label: "Producción",
        href: "#",
        icon: ProduccionIcon,
      },
      {
        label: "Inventarios",
        href: "#",
        icon: InventariosIcon,
      },
      {
        label: "Órdenes",
        href: "#",
        icon: OrdenesIcon,
      },
      {
        label: "Recepciones",
        href: "#",
        icon: RecepcionesIcon,
      },
    ],
  },
  {
    title: "Finanzas",
    items: [
      {
        label: "Facturación",
        href: "#",
        icon: FacturacionIcon,
      },
      {
        label: "CxP (Pagar)",
        href: "#",
        icon: CxpIcon,
      },
      {
        label: "CxC (Cobrar)",
        href: "#",
        icon: CxcIcon,
      },
      {
        label: "Bancos",
        href: "#",
        icon: BancosIcon,
      },
      {
        label: "Contabilidad",
        href: "#",
        icon: ContabilidadIcon,
      },
    ],
  },
  {
    title: "Reportes",
    items: [
      {
        label: "Existencias",
        href: "#",
        icon: ExistenciasIcon,
      },
      {
        label: "Lista de Precios",
        href: "#",
        icon: ListaPreciosIcon,
      },
      {
        label: "Rastrear Guías",
        href: "#",
        icon: RastrearGuiasIcon,
      },
      {
        label: "Clientes",
        href: "#",
        icon: ClientesIcon,
      },
      {
        label: "Embarques",
        href: "#",
        icon: EmbarquesIcon,
      },
      {
        label: "Reportes",
        href: "#",
        icon: ReportesIcon,
      },
    ],
  },
];

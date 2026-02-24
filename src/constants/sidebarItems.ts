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
        href: "/orders",
        icon: PedidosIcon,
      },
      {
        label: "Producción",
        href: "/production",
        icon: ProduccionIcon,
      },
      {
        label: "Inventarios",
        href: "/inventories",
        icon: InventariosIcon,
      },
      {
        label: "Órdenes",
        href: "/purchase-orders",
        icon: OrdenesIcon,
      },
      {
        label: "Recepciones",
        href: "/receipts",
        icon: RecepcionesIcon,
      },
    ],
  },
  {
    title: "Finanzas",
    items: [
      {
        label: "Facturación",
        href: "/invoicing",
        icon: FacturacionIcon,
      },
      {
        label: "CxP (Pagar)",
        href: "/accounts-payable",
        icon: CxpIcon,
      },
      {
        label: "CxC (Cobrar)",
        href: "/accounts-receivable",
        icon: CxcIcon,
      },
      {
        label: "Bancos",
        href: "/bank-accounts",
        icon: BancosIcon,
      },
      {
        label: "Contabilidad",
        href: "/accounting",
        icon: ContabilidadIcon,
      },
    ],
  },
  {
    title: "Reportes",
    items: [
      {
        label: "Existencias",
        href: "/stock",
        icon: ExistenciasIcon,
      },
      {
        label: "Lista de Precios",
        href: "/price-lists",
        icon: ListaPreciosIcon,
      },
      {
        label: "Rastrear Guías",
        href: "/shipment-tracking",
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

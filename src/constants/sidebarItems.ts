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
  permission?: string;
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
        permission: "R-PEDID",
      },
      {
        label: "Producción",
        href: "/production",
        icon: ProduccionIcon,
        permission: "R-PROD",
      },
      {
        label: "Inventarios",
        href: "/inventories",
        icon: InventariosIcon,
        permission: "R-INVE",
      },
      {
        label: "Órdenes",
        href: "/orders-menu",
        icon: OrdenesIcon,
        permission: "R-ORDE",
      },
      {
        label: "Recepciones",
        href: "/receipts",
        icon: RecepcionesIcon,
        permission: "R-RECE",
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
        permission: "R-FACT",
      },
      {
        label: "CxP (Pagar)",
        href: "/accounts-payable",
        icon: CxpIcon,
        permission: "R-CUXP",
      },
      {
        label: "CxC (Cobrar)",
        href: "/accounts-receivable",
        icon: CxcIcon,
        permission: "R-CUXC",
      },
      {
        label: "Bancos",
        href: "/bank-accounts",
        icon: BancosIcon,
        permission: "R-BANC",
      },
      {
        label: "Contabilidad",
        href: "/accounting",
        icon: ContabilidadIcon,
        permission: "R-CONT",
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
        permission: "R-EXIS",
      },
      {
        label: "Lista de Precios",
        href: "/price-lists",
        icon: ListaPreciosIcon,
        permission: "R-PREC",
      },
      {
        label: "Rastrear Guías",
        href: "/shipment-tracking",
        icon: RastrearGuiasIcon,
        permission: "R-GUIA",
      },
      {
        label: "Clientes",
        href: "/customers",
        icon: ClientesIcon,
        permission: "R-CLIE",
      },
      {
        label: "Embarques",
        href: "/shipments",
        icon: EmbarquesIcon,
        permission: "R-EMBA",
      },
      {
        label: "Reportes",
        href: "/reports",
        icon: ReportesIcon,
        permission: "R-REPO",
      },
    ],
  },
];



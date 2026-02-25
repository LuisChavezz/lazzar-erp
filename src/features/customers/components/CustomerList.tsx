import { DataTable } from "@/src/components/DataTable";
import { customerColumns } from "./CustomerColumns";
import { CustomerItem } from "../interfaces/customer.interface";

const CUSTOMERS_DATA: CustomerItem[] = [
  {
    razonSocial: "Grupo Comercial Alfa",
    contacto: "María González",
    telefono: "+52 81 4455 1200",
    correo: "maria.gonzalez@alfa.com.mx",
    ultimaCompra: "18 Feb 2026",
    ultimoPedido: "PED-2408",
    vendedor: "Laura Pérez",
  },
  {
    razonSocial: "Industrias del Bajío",
    contacto: "Carlos Rivas",
    telefono: "+52 477 331 7788",
    correo: "crivas@bajio.mx",
    ultimaCompra: "10 Feb 2026",
    ultimoPedido: "PED-2399",
    vendedor: "Diana Ortega",
  },
  {
    razonSocial: "Distribuciones Pacífico",
    contacto: "Ricardo Salas",
    telefono: "+52 664 812 3344",
    correo: "rsalas@pacifico.mx",
    ultimaCompra: "18 Feb 2026",
    ultimoPedido: "PED-2402",
    vendedor: "Mario Silva",
  },
  {
    razonSocial: "Servicios Nova",
    contacto: "Andrea Soto",
    telefono: "+52 55 2788 4411",
    correo: "andrea.soto@nova.com",
    ultimaCompra: "24 Feb 2026",
    ultimoPedido: "PED-2412",
    vendedor: "Andrea Soto",
  },
  {
    razonSocial: "Tecnología Andina",
    contacto: "Luis Herrera",
    telefono: "+52 442 901 2200",
    correo: "luis.herrera@andina.mx",
    ultimaCompra: "29 Ene 2026",
    ultimoPedido: "PED-2378",
    vendedor: "Carlos Rivas",
  },
];

export const CustomerList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={customerColumns}
        data={CUSTOMERS_DATA}
        title="Clientes"
        searchPlaceholder="Buscar por razón social, contacto o vendedor..."
      />
    </div>
  );
};
